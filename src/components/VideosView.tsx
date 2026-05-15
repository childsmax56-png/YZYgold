import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Film } from 'lucide-react';
import { Era } from '../types';
import { createSlug, CUSTOM_IMAGES } from '../utils';

export interface VideoRawEntry {
  Era: string;
  Name: string;
  Notes: string;
  Length: string;
  'Date Made': string;
  Type: string;
  'Available Length': string;
  Quality: string;
  'Link(s)': string;
}

interface VideoEntry {
  era: string;
  name: string;
  notes: string;
  length: string;
  dateMade: string;
  type: string;
  availableLength: string;
  quality: string;
  links: string[];
  section: 'Unreleased' | 'Released';
}

interface VideoEraGroup {
  name: string;
  image?: string;
  unreleased: VideoEntry[];
  released: VideoEntry[];
  total: number;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractDriveId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function extractPillowId(url: string): string | null {
  const m = url.match(/pillows\.su\/f\/([a-f0-9]+)/);
  return m ? m[1] : null;
}

type EmbedInfo =
  | { type: 'youtube'; src: string }
  | { type: 'drive'; src: string }
  | { type: 'pillowcase'; src: string }
  | null;

function getEmbedInfo(links: string[]): EmbedInfo {
  for (const link of links) {
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      const id = extractYouTubeId(link);
      if (id) return { type: 'youtube', src: `https://www.youtube.com/embed/${id}` };
    }
  }
  for (const link of links) {
    if (link.includes('pillows.su/f/')) {
      const id = extractPillowId(link);
      if (id) return { type: 'pillowcase', src: `https://api.pillows.su/api/get/${id}` };
    }
  }
  for (const link of links) {
    if (link.includes('drive.google.com')) {
      const id = extractDriveId(link);
      if (id) return { type: 'drive', src: `https://drive.google.com/file/d/${id}/preview` };
    }
  }
  return null;
}

function getLinkLabel(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('drive.google.com')) return 'Drive';
  if (url.includes('pillows.su')) return 'Pillowcase';
  if (url.includes('archive.org')) return 'Archive.org';
  if (url.includes('pixeldrain.com')) return 'Pixeldrain';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('streamable.com')) return 'Streamable';
  if (url.includes('mega.nz')) return 'MEGA';
  if (url.includes('sharemania.us')) return 'Sharemania';
  if (url.includes('imgur')) return 'Imgur';
  return 'Link';
}

function parseVideosData(rows: VideoRawEntry[], allEras: Era[]): VideoEraGroup[] {
  let currentSection: 'Unreleased' | 'Released' = 'Unreleased';
  const eraGroups: Record<string, { unreleased: VideoEntry[]; released: VideoEntry[] }> = {};
  const eraOrder: string[] = [];

  for (const row of rows) {
    const era = row.Era?.trim() || '';
    const name = row.Name?.trim() || '';

    if (!era) {
      if (name === 'Unreleased') currentSection = 'Unreleased';
      else if (name === 'Released') currentSection = 'Released';
      continue;
    }
    if (!name) continue;

    if (!eraGroups[era]) {
      eraGroups[era] = { unreleased: [], released: [] };
      eraOrder.push(era);
    }

    const rawLinks = row['Link(s)'] || '';
    const links = rawLinks
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.toLowerCase().includes('link needed') && !l.toLowerCase().includes('source needed'));

    const entry: VideoEntry = {
      era,
      name,
      notes: row.Notes?.trim() || '',
      length: row.Length?.trim() || '',
      dateMade: row['Date Made']?.trim() || '',
      type: row.Type?.trim() || '',
      availableLength: row['Available Length']?.trim() || '',
      quality: row.Quality?.trim() || '',
      links,
      section: currentSection,
    };

    if (currentSection === 'Unreleased') {
      eraGroups[era].unreleased.push(entry);
    } else {
      eraGroups[era].released.push(entry);
    }
  }

  return eraOrder
    .map(name => {
      const group = eraGroups[name];
      const matchingEra = allEras.find(e => e.name === name);
      return {
        name,
        image: CUSTOM_IMAGES[name] || matchingEra?.image,
        unreleased: group.unreleased,
        released: group.released,
        total: group.unreleased.length + group.released.length,
      };
    })
    .filter(g => g.total > 0);
}

const AVAILABLE_LENGTH_COLORS: Record<string, string> = {
  'Full': 'text-green-400 border-green-500/20 bg-green-500/5',
  'OG File': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
  'Snippet': 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  'Partial': 'text-orange-400 border-orange-500/20 bg-orange-500/5',
  'Confirmed': 'text-white/40 border-white/10 bg-white/5',
  'Rumored': 'text-white/30 border-white/10 bg-white/5',
  'Never Recorded': 'text-red-400/50 border-red-500/10 bg-red-500/5',
};

function VideoRow({ entry }: { entry: VideoEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [activeLink, setActiveLink] = useState(0);

  const embed = useMemo(() => getEmbedInfo(entry.links), [entry.links]);
  const isUnavailable = !entry.links.length || ['Confirmed', 'Rumored', 'Never Recorded', 'Not Available'].includes(entry.availableLength);
  const availColor = AVAILABLE_LENGTH_COLORS[entry.availableLength] || 'text-white/40 border-white/10 bg-white/5';
  const isStarred = entry.name.startsWith('⭐');

  const handleClick = () => {
    if (!isUnavailable || entry.links.length > 0) setExpanded(e => !e);
  };

  const allLinks = entry.links;
  const activeEmbedLink = allLinks[activeLink] || allLinks[0];
  const activeEmbed = activeEmbedLink ? getEmbedInfo([activeEmbedLink]) : null;

  return (
    <div className={`rounded-md overflow-hidden border transition-colors ${expanded ? 'border-white/15 bg-white/[0.03]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'}`}>
      <div
        onClick={handleClick}
        className={`flex items-start gap-3 px-3 py-2.5 ${isUnavailable && !entry.links.length ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/20" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isStarred ? 'text-yellow-300' : 'text-white'} truncate`}>
              {entry.name}
            </span>
            {entry.length && (
              <span className="text-[10px] text-white/30 shrink-0">{entry.length}</span>
            )}
          </div>
          {entry.notes && (
            <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{entry.notes}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
          {entry.availableLength && (
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${availColor}`}>
              {entry.availableLength}
            </span>
          )}
          {entry.quality && (
            <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/50 bg-white/5">
              {entry.quality}
            </span>
          )}
          {allLinks.length > 0 && !expanded && (
            <ExternalLink className="w-3.5 h-3.5 text-white/30" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-3">
              {allLinks.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {allLinks.map((link, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveLink(i)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                        i === activeLink
                          ? 'border-[var(--theme-color)] text-[var(--theme-color)] bg-[var(--theme-color)]/10'
                          : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {getLinkLabel(link)} {allLinks.filter(l => getLinkLabel(l) === getLinkLabel(link)).length > 1 ? `#${allLinks.slice(0, i + 1).filter(l => getLinkLabel(l) === getLinkLabel(link)).length}` : ''}
                    </button>
                  ))}
                </div>
              )}

              {activeEmbed?.type === 'youtube' && (
                <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                  <iframe
                    src={activeEmbed.src}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {activeEmbed?.type === 'drive' && (
                <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                  <iframe
                    src={activeEmbed.src}
                    className="w-full h-full"
                    allow="autoplay"
                    allowFullScreen
                  />
                </div>
              )}

              {activeEmbed?.type === 'pillowcase' && (
                <div className="w-full rounded-md overflow-hidden bg-black">
                  <video
                    src={activeEmbed.src}
                    controls
                    className="w-full max-h-[60vh]"
                    preload="metadata"
                  />
                </div>
              )}

              {!activeEmbed && allLinks.length > 0 && (
                <div className="text-xs text-white/40 italic">
                  No embeddable player available for this source.
                </div>
              )}

              {allLinks.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {allLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--theme-color)]/70 hover:text-[var(--theme-color)] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {getLinkLabel(link)}
                    </a>
                  ))}
                </div>
              )}

              {entry.dateMade && (
                <p className="text-[10px] text-white/30">Filmed: {entry.dateMade}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EraDetailViewProps {
  eraGroup: VideoEraGroup;
  onBack: () => void;
  searchQuery: string;
}

function EraDetailView({ eraGroup, onBack, searchQuery }: EraDetailViewProps) {
  const filterEntries = (entries: VideoEntry[]) => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      e => e.name.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q)
    );
  };

  const filteredUnreleased = filterEntries(eraGroup.unreleased);
  const filteredReleased = filterEntries(eraGroup.released);

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="absolute inset-0 z-10 bg-yzy-black overflow-y-auto custom-scrollbar pb-64"
    >
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 md:gap-8 border-b border-white/5 bg-white/5">
        <button
          onClick={onBack}
          className="cursor-pointer mt-1 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden bg-white/5 shrink-0 shadow-xl">
          {eraGroup.image ? (
            <img
              src={eraGroup.image}
              alt={eraGroup.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-12 h-12 text-white/20" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end h-full py-2">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              {eraGroup.name}
            </h1>
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Music Videos
            </span>
          </div>
          <p className="text-white/50 text-sm">
            {eraGroup.unreleased.length} unreleased · {eraGroup.released.length} released
          </p>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-6 max-w-4xl mx-auto space-y-8">
        {filteredUnreleased.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-400/70" />
              Unreleased
            </h2>
            <div className="space-y-1">
              {filteredUnreleased.map((entry, i) => (
                <VideoRow key={i} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {filteredReleased.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400/70" />
              Released
            </h2>
            <div className="space-y-1">
              {filteredReleased.map((entry, i) => (
                <VideoRow key={i} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {filteredUnreleased.length === 0 && filteredReleased.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">No results found.</p>
        )}
      </div>
    </motion.div>
  );
}

interface VideosViewProps {
  eras: Era[];
  videosData: VideoRawEntry[];
  searchQuery: string;
}

export function VideosView({ eras, videosData, searchQuery }: VideosViewProps) {
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  const eraGroups = useMemo(() => parseVideosData(videosData, eras), [videosData, eras]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/videos/')) {
      const slug = path.split('/videos/')[1];
      if (slug) {
        const match = eraGroups.find(g => createSlug(g.name) === slug);
        if (match) setSelectedEra(match.name);
      }
    }
  }, [eraGroups]);

  useEffect(() => {
    if (selectedEra) {
      const newPath = `/videos/${createSlug(selectedEra)}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ videosEra: selectedEra }, '', newPath);
      }
    } else {
      if (window.location.pathname.startsWith('/videos/')) {
        window.history.pushState({ videosEra: null }, '', '/videos');
      }
    }
  }, [selectedEra]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/videos/')) {
        const slug = path.split('/videos/')[1];
        const match = eraGroups.find(g => createSlug(g.name) === slug);
        setSelectedEra(match ? match.name : null);
      } else if (path === '/videos') {
        setSelectedEra(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [eraGroups]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return eraGroups;
    const q = searchQuery.toLowerCase();
    return eraGroups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      [...g.unreleased, ...g.released].some(
        e => e.name.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q)
      )
    );
  }, [eraGroups, searchQuery]);

  const selectedGroup = useMemo(
    () => eraGroups.find(g => g.name === selectedEra) || null,
    [eraGroups, selectedEra]
  );

  if (selectedGroup) {
    return (
      <EraDetailView
        eraGroup={selectedGroup}
        onBack={() => setSelectedEra(null)}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <motion.div
      key="videos-grid"
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-32"
    >
      {filteredGroups.map((group, i) => (
        <motion.div
          key={group.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.3 }}
          onClick={() => setSelectedEra(group.name)}
          className="group flex flex-col gap-3 cursor-pointer"
        >
          <div className="relative aspect-square rounded-md overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/20 transition-colors">
            {group.image ? (
              <img
                src={group.image}
                alt={group.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <Film className="w-10 h-10 text-white/20" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
              {group.unreleased.length > 0 && (
                <span className="bg-black/70 backdrop-blur-sm text-orange-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {group.unreleased.length} Unrel.
                </span>
              )}
              {group.released.length > 0 && (
                <span className="bg-black/70 backdrop-blur-sm text-green-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {group.released.length} Rel.
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white group-hover:underline truncate">
              {group.name}
            </h3>
            <p className="text-xs text-white/40">{group.total} video{group.total !== 1 ? 's' : ''}</p>
          </div>
        </motion.div>
      ))}

      {filteredGroups.length === 0 && (
        <div className="col-span-full text-center py-16 text-white/30 text-sm">
          No eras found.
        </div>
      )}
    </motion.div>
  );
}
