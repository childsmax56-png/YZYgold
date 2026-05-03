import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronDown, ChevronUp, Download, ExternalLink, Play, Pause } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Era, Song } from '../types';
import { isSongNotAvailable } from '../utils';

export interface TracklistAlbum {
  era: string;
  name: string;
  date: string;
  quality: string;
  source: string;
  links: string[];
  tracks: { num: string; name: string }[];
}

interface TracklistsViewProps {
  data: TracklistAlbum[];
  searchQuery: string;
  eras: Era[];
  onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
  era?: Era;
  onBack?: () => void;
}

const QUALITY_COLORS: Record<string, string> = {
  Clear: 'text-emerald-400',
  'Not Clear': 'text-red-400',
  Secondary: 'text-yellow-400',
};

function qualityColor(q: string) {
  if (!q) return 'text-white/40';
  for (const [k, v] of Object.entries(QUALITY_COLORS)) {
    if (q.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'text-white/40';
}

const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function normalizeName(s: string): string {
  return s
    .replace(EMOJI_RE, '')
    .replace(/️/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.startsWith(a)) return true;
  if (b.length >= 5 && a.startsWith(b)) return true;
  return false;
}

interface SongMatch { song: Song; era: Era }

interface SongIndexes {
  // era key → songs in that era (playable only)
  byEra: Map<string, SongMatch[]>;
  // exact normalized name → first playable match
  byName: Map<string, SongMatch>;
}

function buildIndexes(eras: Era[]): SongIndexes {
  const byEra = new Map<string, SongMatch[]>();
  const byName = new Map<string, SongMatch>();

  for (const era of eras) {
    const eraKey = normalizeName(era.name);
    const eraMatches: SongMatch[] = [];

    for (const songs of Object.values(era.data || {})) {
      for (const song of songs as Song[]) {
        const rawUrl = song.url || (song.urls?.[0]) || '';
        if (isSongNotAvailable(song, rawUrl) || !rawUrl) continue;

        const match: SongMatch = { song, era };
        eraMatches.push(match);

        const normSong = normalizeName(song.name);
        if (normSong && !byName.has(normSong)) {
          byName.set(normSong, match);
        }
      }
    }

    if (eraMatches.length) byEra.set(eraKey, eraMatches);
  }

  return { byEra, byName };
}

function findMatch(trackName: string, albumEra: string, idx: SongIndexes): SongMatch | null {
  const normTrack = normalizeName(trackName);
  if (!normTrack) return null;

  // 1. Era-specific search
  const eraCandidates = idx.byEra.get(normalizeName(albumEra)) || [];
  for (const c of eraCandidates) {
    if (namesMatch(normTrack, normalizeName(c.song.name))) return c;
  }

  // 2. Exact global name lookup — O(1)
  const exact = idx.byName.get(normTrack);
  if (exact) return exact;

  // 3. Prefix scan over byName keys — only if we haven't matched yet
  //    Limit to first 5 chars prefix to keep it fast
  if (normTrack.length >= 5) {
    for (const [key, match] of idx.byName) {
      if (namesMatch(normTrack, key)) return match;
    }
  }

  return null;
}

// Pre-compute matches for every track in every album — runs once when eras load
function precomputeMatches(
  data: TracklistAlbum[],
  idx: SongIndexes
): Map<number, (SongMatch | null)[]> {
  const result = new Map<number, (SongMatch | null)[]>();
  for (let ai = 0; ai < data.length; ai++) {
    const album = data[ai];
    result.set(ai, album.tracks.map(t => findMatch(t.name, album.era, idx)));
  }
  return result;
}

// ── AlbumCard ────────────────────────────────────────────────────────────────

interface AlbumCardProps {
  album: TracklistAlbum;
  matches: (SongMatch | null)[];
  defaultOpen: boolean;
  onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

function downloadTracklist(album: TracklistAlbum) {
  const lines: string[] = [];
  lines.push(album.name);
  lines.push(`Era: ${album.era}`);
  if (album.date) lines.push(`Date: ${album.date}`);
  if (album.quality) lines.push(`Quality: ${album.quality}`);
  if (album.source) lines.push(`Source: ${album.source}`);
  lines.push('');
  album.tracks.forEach(t => {
    lines.push(`${t.num !== '#?' ? t.num + '. ' : ''}${t.name}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${album.name}.txt`);
}

function AlbumCard({ album, matches, defaultOpen, onPlaySong, currentSong, isPlaying }: AlbumCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const playableSongs = useMemo(
    () => matches.filter((m): m is SongMatch => m !== null).map(m => m.song),
    [matches]
  );

  const handlePlay = useCallback((match: SongMatch) => {
    onPlaySong(match.song, match.era, playableSongs);
  }, [onPlaySong, playableSongs]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{album.name}</p>
          <p className="text-white/40 text-xs mt-0.5 truncate">
            {album.era}{album.date ? ` · ${album.date}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[11px] font-medium hidden sm:inline ${qualityColor(album.quality)}`}>
            {album.quality || '—'}
          </span>
          <span className="text-white/30 text-xs hidden md:inline">
            {playableSongs.length}/{album.tracks.length}
          </span>
          {album.links[0] && (
            <a
              href={album.links[0]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-white/30 hover:text-[var(--theme-color)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={e => { e.stopPropagation(); downloadTracklist(album); }}
            title="Download tracklist"
            className="text-white/30 hover:text-[var(--theme-color)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tracks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
              {album.tracks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-white/30 italic">No parsed tracks</p>
              ) : album.tracks.map((t, i) => {
                const match = matches[i] ?? null;
                const rawUrl = match ? (match.song.url || match.song.urls?.[0] || '') : '';
                const isCurrentlyPlaying =
                  isPlaying && currentSong && match &&
                  currentSong.name === match.song.name &&
                  (currentSong.url || currentSong.urls?.[0] || '') === rawUrl;

                return (
                  <div
                    key={i}
                    onClick={() => match && handlePlay(match)}
                    className={`flex items-center gap-3 px-4 py-2 transition-colors group
                      ${match ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-default'}
                      ${isCurrentlyPlaying ? 'bg-white/[0.06]' : ''}`}
                  >
                    <span className="text-white/25 text-xs w-6 text-right shrink-0 font-mono relative">
                      {match ? (
                        <>
                          <span className={`transition-opacity ${isCurrentlyPlaying ? 'opacity-0' : 'group-hover:opacity-0'}`}>
                            {t.num === '#?' ? '?' : t.num}
                          </span>
                          <span className={`absolute inset-0 flex items-center justify-end transition-opacity
                            ${isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isCurrentlyPlaying
                              ? <Pause className="w-3 h-3 text-[var(--theme-color)]" />
                              : <Play className="w-3 h-3 text-[var(--theme-color)]" />}
                          </span>
                        </>
                      ) : (
                        <span className="opacity-40">{t.num === '#?' ? '?' : t.num}</span>
                      )}
                    </span>

                    <span className={`text-sm leading-snug flex-1 min-w-0 truncate transition-colors
                      ${isCurrentlyPlaying
                        ? 'text-[var(--theme-color)] font-medium'
                        : match
                        ? 'text-white/80 group-hover:text-white'
                        : 'text-white/30'}`}>
                      {t.name}
                    </span>

                    {match && match.era.name !== album.era && (
                      <span className="text-[10px] text-white/20 hidden md:inline truncate max-w-[120px]">
                        {match.era.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

export function TracklistsView({ data, searchQuery, eras, onPlaySong, currentSong, isPlaying, era, onBack }: TracklistsViewProps) {
  const q = searchQuery.toLowerCase().trim();

  // Build indexes once when eras are ready
  const idx = useMemo(() => buildIndexes(eras), [eras]);

  // Pre-compute ALL matches once — O(albums × tracks) but only runs when eras/data change
  const allMatches = useMemo(() => precomputeMatches(data, idx), [data, idx]);

  // Filter albums
  const filtered = useMemo(() => {
    if (!q) return data.map((album, i) => ({ album, origIdx: i }));
    return data
      .map((album, i) => ({ album, origIdx: i }))
      .filter(({ album, origIdx }) => {
        if (album.name.toLowerCase().includes(q)) return true;
        if (album.era.toLowerCase().includes(q)) return true;
        if (album.date.toLowerCase().includes(q)) return true;
        if (album.tracks.some(t => t.name.toLowerCase().includes(q))) return true;
        // also match if a song's actual name in db matches
        const matches = allMatches.get(origIdx) || [];
        if (matches.some(m => m && m.song.name.toLowerCase().includes(q))) return true;
        return false;
      });
  }, [data, allMatches, q]);

  // Group by era
  const grouped = useMemo(() => {
    const map = new Map<string, { album: TracklistAlbum; origIdx: number }[]>();
    for (const item of filtered) {
      const key = item.album.era || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  // Flatten grouped for pagination
  const flatItems = useMemo(() => {
    const items: ({ type: 'era'; era: string } | { type: 'album'; album: TracklistAlbum; origIdx: number })[] = [];
    for (const [era, albums] of grouped.entries()) {
      items.push({ type: 'era', era });
      for (const a of albums) items.push({ type: 'album', ...a });
    }
    return items;
  }, [grouped]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset pagination when search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [q]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(n => n + PAGE_SIZE);
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [flatItems]);

  const totalPlayable = useMemo(() =>
    Array.from(allMatches.values()).reduce((sum, ms) => sum + ms.filter(Boolean).length, 0),
    [allMatches]
  );

  const visibleFlat = flatItems.slice(0, visibleCount);

  return (
    <motion.div
      key="tracklists"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full"
    >
      {onBack && era && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      <div className="mb-6">
        <h2 className="text-white font-display font-bold text-xl tracking-tight">
          {era ? era.name : 'Album Copies'}
        </h2>
        <p className="text-white/40 text-xs mt-1">
          {filtered.length} album{filtered.length !== 1 ? 's' : ''} ·{' '}
          {filtered.reduce((s, { album }) => s + album.tracks.length, 0).toLocaleString()} tracks ·{' '}
          <span className="text-[var(--theme-color)]/70">{totalPlayable.toLocaleString()} playable</span>
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30 text-sm">No results for "{searchQuery}"</div>
      ) : (
        <div className="space-y-2">
          {visibleFlat.map((item, i) =>
            item.type === 'era' ? (
              <h3
                key={`era-${item.era}-${i}`}
                className="text-[var(--theme-color)] text-xs font-bold uppercase tracking-widest pt-4 pb-1 px-1 first:pt-0"
              >
                {item.era}
              </h3>
            ) : (
              <AlbumCard
                key={`${item.album.name}-${item.origIdx}`}
                album={item.album}
                matches={allMatches.get(item.origIdx) ?? []}
                defaultOpen={q.length > 0}
                onPlaySong={onPlaySong}
                currentSong={currentSong}
                isPlaying={isPlaying}
              />
            )
          )}
          <div ref={loaderRef} className="h-4" />
        </div>
      )}
    </motion.div>
  );
}
