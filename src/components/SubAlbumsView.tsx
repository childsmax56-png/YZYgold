import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface SubAlbumTrack {
  num?: string;
  name: string;
  length?: string;
  status?: 'released' | 'unreleased';
}

export interface SubAlbumEntry {
  name: string;
  parentEras: string[];
  description: string;
  tracks: SubAlbumTrack[];
}

interface SubAlbumsViewProps {
  data: SubAlbumEntry[];
  searchQuery: string;
}

function SubAlbumCard({ entry }: { entry: SubAlbumEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{entry.name}</p>
          {entry.parentEras.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {entry.parentEras.map(era => (
                <span
                  key={era}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--theme-color)]/15 text-[var(--theme-color)]/80 border border-[var(--theme-color)]/20"
                >
                  {era}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {entry.tracks.length > 0 && (
            <span className="text-white/30 text-xs">{entry.tracks.length} tracks</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
              {entry.description && (
                <p className="text-white/55 text-xs leading-relaxed">{entry.description}</p>
              )}
              {entry.tracks.length > 0 && (
                <div className="divide-y divide-white/[0.04]">
                  {entry.tracks.map((track, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      {(track.num !== undefined) && (
                        <span className="text-white/25 text-xs w-6 text-right shrink-0 font-mono">{track.num}</span>
                      )}
                      <span className={`text-sm flex-1 min-w-0 truncate ${track.status === 'released' ? 'text-emerald-400/80' : track.status === 'unreleased' ? 'text-white/40' : 'text-white/70'}`}>
                        {track.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {track.status && (
                          <span className={`text-[10px] font-medium ${track.status === 'released' ? 'text-emerald-400/60' : 'text-white/25'}`}>
                            {track.status}
                          </span>
                        )}
                        {track.length && (
                          <span className="text-white/25 text-xs font-mono">{track.length}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {entry.tracks.length === 0 && !entry.description && (
                <p className="text-white/30 text-xs italic">No additional details available.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubAlbumsView({ data, searchQuery }: SubAlbumsViewProps) {
  const q = searchQuery.toLowerCase().trim();

  const filtered = useMemo(() => {
    if (!q) return data;
    return data.filter(entry =>
      entry.name.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.parentEras.some(e => e.toLowerCase().includes(q)) ||
      entry.tracks.some(t => t.name.toLowerCase().includes(q))
    );
  }, [data, q]);

  return (
    <motion.div
      key="subalbums"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full"
    >
      <div className="mb-6">
        <h2 className="text-white font-display font-bold text-xl tracking-tight">Sub Albums</h2>
        <p className="text-white/40 text-xs mt-1">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'} · Descriptions and tracklists sourced from the Kanye West Wiki
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30 text-sm">No results for "{searchQuery}"</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <SubAlbumCard key={`${entry.name}-${i}`} entry={entry} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
