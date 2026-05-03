import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, ExternalLink, Play, Pause } from 'lucide-react';
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
}

const QUALITY_COLORS: Record<string, string> = {
  Clear: 'text-emerald-400',
  'Not Clear': 'text-red-400',
  Secondary: 'text-yellow-400',
  Unknown: 'text-white/40',
};

function qualityColor(q: string) {
  if (!q) return 'text-white/40';
  for (const [k, v] of Object.entries(QUALITY_COLORS)) {
    if (q.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'text-white/40';
}

// Strip emoji / unicode symbols, lowercase, collapse whitespace
const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}‍️]/gu;
function normalizeName(s: string): string {
  return s
    .replace(EMOJI_RE, '')
    .replace(/\[.*?\]/g, '')   // [OG], [V1], etc.
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(trackName: string, songName: string): boolean {
  const a = normalizeName(trackName);
  const b = normalizeName(songName);
  if (!a || !b) return false;
  if (a === b) return true;
  // One contains the other (handles "All Falls Down" matching "All Falls Down (Feat…)")
  if (b.startsWith(a) || a.startsWith(b)) return true;
  // Allow if one is a substring of the other and the shorter is >= 5 chars
  const shorter = a.length < b.length ? a : b;
  if (shorter.length >= 5 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

// Build flat song index from all eras for quick lookup
function buildSongIndex(eras: Era[]): Map<string, { song: Song; era: Era }[]> {
  const index = new Map<string, { song: Song; era: Era }[]>();
  for (const era of eras) {
    const norm = normalizeName(era.name);
    if (!index.has(norm)) index.set(norm, []);
    for (const songs of Object.values(era.data || {})) {
      for (const song of songs as Song[]) {
        index.get(norm)!.push({ song, era });
      }
    }
  }
  return index;
}

function findSongMatch(
  trackName: string,
  albumEra: string,
  index: Map<string, { song: Song; era: Era }[]>
): { song: Song; era: Era } | null {
  const eraKey = normalizeName(albumEra);
  const candidates = index.get(eraKey) || [];

  // Prefer exact era match first
  for (const c of candidates) {
    const rawUrl = c.song.url || (c.song.urls && c.song.urls[0]) || '';
    if (isSongNotAvailable(c.song, rawUrl)) continue;
    if (!rawUrl) continue;
    if (namesMatch(trackName, c.song.name)) return c;
  }

  // Fall back: search all eras
  for (const entries of index.values()) {
    for (const c of entries) {
      const rawUrl = c.song.url || (c.song.urls && c.song.urls[0]) || '';
      if (isSongNotAvailable(c.song, rawUrl)) continue;
      if (!rawUrl) continue;
      if (namesMatch(trackName, c.song.name)) return c;
    }
  }

  return null;
}

interface AlbumCardProps {
  album: TracklistAlbum;
  defaultOpen: boolean;
  songIndex: Map<string, { song: Song; era: Era }[]>;
  onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

function AlbumCard({ album, defaultOpen, songIndex, onPlaySong, currentSong, isPlaying }: AlbumCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Pre-resolve matches for all tracks
  const resolved = useMemo(() =>
    album.tracks.map(t => ({
      ...t,
      match: findSongMatch(t.name, album.era, songIndex),
    })),
    [album, songIndex]
  );

  const playableTracks = resolved.filter(t => t.match).map(t => t.match!.song);

  const handlePlay = (match: { song: Song; era: Era }) => {
    onPlaySong(match.song, match.era, playableTracks);
  };

  return (
    <motion.div
      layout
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
    >
      {/* Header */}
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
            {playableTracks.length}/{album.tracks.length} playable
          </span>
          {album.links.length > 0 && (
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
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      {/* Track list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tracks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
              {resolved.length === 0 ? (
                <p className="px-4 py-3 text-xs text-white/30 italic">No parsed tracks</p>
              ) : (
                resolved.map((t, i) => {
                  const isCurrentlyPlaying =
                    isPlaying &&
                    currentSong &&
                    t.match &&
                    currentSong.name === t.match.song.name &&
                    (currentSong.url || (currentSong.urls && currentSong.urls[0]) || '') ===
                      (t.match.song.url || (t.match.song.urls && t.match.song.urls[0]) || '');

                  return (
                    <div
                      key={i}
                      onClick={() => t.match && handlePlay(t.match)}
                      className={`flex items-center gap-3 px-4 py-2 transition-colors group ${
                        t.match
                          ? 'hover:bg-white/[0.05] cursor-pointer'
                          : 'opacity-50 cursor-default'
                      } ${isCurrentlyPlaying ? 'bg-white/[0.06]' : ''}`}
                    >
                      {/* Track number / play indicator */}
                      <span className="text-white/25 text-xs w-6 text-right shrink-0 font-mono relative">
                        {t.match ? (
                          <>
                            <span className={`group-hover:opacity-0 transition-opacity ${isCurrentlyPlaying ? 'opacity-0' : ''}`}>
                              {t.num === '#?' ? '?' : t.num}
                            </span>
                            <span className={`absolute inset-0 flex items-center justify-end transition-opacity ${isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              {isCurrentlyPlaying
                                ? <Pause className="w-3 h-3 text-[var(--theme-color)]" />
                                : <Play className="w-3 h-3 text-[var(--theme-color)]" />
                              }
                            </span>
                          </>
                        ) : (
                          <span>{t.num === '#?' ? '?' : t.num}</span>
                        )}
                      </span>

                      {/* Track name */}
                      <span className={`text-sm leading-snug flex-1 min-w-0 truncate transition-colors ${
                        isCurrentlyPlaying
                          ? 'text-[var(--theme-color)] font-medium'
                          : t.match
                          ? 'text-white/80 group-hover:text-white'
                          : 'text-white/40'
                      }`}>
                        {t.name}
                      </span>

                      {/* Era chip if match is from a different era */}
                      {t.match && t.match.era.name !== album.era && (
                        <span className="text-[10px] text-white/20 hidden md:inline truncate max-w-[120px]">
                          {t.match.era.name}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TracklistsView({ data, searchQuery, eras, onPlaySong, currentSong, isPlaying }: TracklistsViewProps) {
  const q = searchQuery.toLowerCase().trim();

  const songIndex = useMemo(() => buildSongIndex(eras), [eras]);

  const filtered = useMemo(() => {
    if (!q) return data;
    return data.filter(album => {
      if (album.name.toLowerCase().includes(q)) return true;
      if (album.era.toLowerCase().includes(q)) return true;
      if (album.date.toLowerCase().includes(q)) return true;
      if (album.tracks.some(t => t.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [data, q]);

  // Group by era
  const grouped = useMemo(() => {
    const map = new Map<string, TracklistAlbum[]>();
    for (const album of filtered) {
      const era = album.era || 'Unknown';
      if (!map.has(era)) map.set(era, []);
      map.get(era)!.push(album);
    }
    return map;
  }, [filtered]);

  const isSearching = q.length > 0;

  const totalPlayable = useMemo(() =>
    filtered.reduce((sum, album) =>
      sum + album.tracks.filter(t => findSongMatch(t.name, album.era, songIndex) !== null).length, 0
    ), [filtered, songIndex]);

  return (
    <motion.div
      key="tracklists"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full"
    >
      <div className="mb-6">
        <h2 className="text-white font-display font-bold text-xl tracking-tight">Album Copies</h2>
        <p className="text-white/40 text-xs mt-1">
          {filtered.length} album{filtered.length !== 1 ? 's' : ''} ·{' '}
          {filtered.reduce((s, a) => s + a.tracks.length, 0).toLocaleString()} tracks ·{' '}
          <span className="text-[var(--theme-color)]/70">{totalPlayable.toLocaleString()} playable</span>
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30 text-sm">No results for "{searchQuery}"</div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([era, albums]) => (
            <div key={era}>
              <h3 className="text-[var(--theme-color)] text-xs font-bold uppercase tracking-widest mb-3 px-1">
                {era}
              </h3>
              <div className="space-y-2">
                {albums.map((album, i) => (
                  <AlbumCard
                    key={`${album.name}-${i}`}
                    album={album}
                    defaultOpen={isSearching}
                    songIndex={songIndex}
                    onPlaySong={onPlaySong}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
