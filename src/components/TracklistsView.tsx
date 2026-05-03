import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

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

function AlbumCard({ album, defaultOpen }: { album: TracklistAlbum; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

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
            {album.era}
            {album.date ? ` · ${album.date}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[11px] font-medium hidden sm:inline ${qualityColor(album.quality)}`}>
            {album.quality || '—'}
          </span>
          <span className="text-white/30 text-xs hidden md:inline">{album.tracks.length} tracks</span>
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
          {open ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
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
              {album.tracks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-white/30 italic">No parsed tracks</p>
              ) : (
                album.tracks.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.025] transition-colors group"
                  >
                    <span className="text-white/25 text-xs w-6 text-right shrink-0 font-mono">
                      {t.num === '#?' ? '?' : t.num}
                    </span>
                    <span className="text-white/80 text-sm leading-snug">{t.name}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TracklistsView({ data, searchQuery }: TracklistsViewProps) {
  const q = searchQuery.toLowerCase().trim();

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
          {filtered.length} album{filtered.length !== 1 ? 's' : ''} · {filtered.reduce((s, a) => s + a.tracks.length, 0).toLocaleString()} tracks
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
