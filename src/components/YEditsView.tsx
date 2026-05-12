import { motion } from 'motion/react';
import { Play, Pause, Volume2, Download, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Song, Era } from '../types';

interface YEditsViewProps {
  searchQuery: string;
  onPlaySong: (song: Song, era: Era, contextTracks: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

function keyToDisplayName(key: string): string {
  const filename = key.split('/').pop() ?? key;
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
}

function keyToGroup(key: string): string {
  const parts = key.split('/');
  return parts.length > 1 ? parts[0] : 'Yedits';
}

function keyToUrl(key: string): string {
  return `/api/yedits-file?key=${encodeURIComponent(key)}`;
}

const YEDITS_ERA: Era = {
  name: 'YZYgold Yedit Affiliates',
  data: { Yedits: [] },
};

export function YEditsView({ searchQuery, onPlaySong, currentSong, isPlaying }: YEditsViewProps) {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/yedits')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<string[]>;
      })
      .then(data => {
        setKeys(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message ?? 'Failed to load');
        setLoading(false);
      });
  }, []);

  const allSongs: Song[] = useMemo(() =>
    keys.map(key => ({
      name: keyToDisplayName(key),
      url: keyToUrl(key),
      extra2: keyToGroup(key),
    })),
    [keys]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allSongs;
    const q = searchQuery.toLowerCase();
    return allSongs.filter(s => s.name.toLowerCase().includes(q) || (s.extra2 ?? '').toLowerCase().includes(q));
  }, [allSongs, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const song of filtered) {
      const group = song.extra2 ?? 'Yedits';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(song);
    }
    return map;
  }, [filtered]);

  const era: Era = useMemo(() => ({
    ...YEDITS_ERA,
    data: { Yedits: allSongs },
  }), [allSongs]);

  const handlePlay = (song: Song) => {
    onPlaySong(song, era, filtered);
  };

  if (loading) {
    return (
      <motion.div
        key="yedits-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center h-64 text-white/40"
      >
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-sm">Loading yedits…</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        key="yedits-error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center h-64 text-white/40 text-sm"
      >
        Failed to load: {error}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="yedits"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">YZYgold Yedit Affiliates</h1>
          <p className="text-sm text-white/40 mt-1">{filtered.length} edit{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-20">
          {keys.length === 0 ? 'No files in bucket yet.' : 'No results for that search.'}
        </div>
      ) : (
        Array.from(groups.entries()).map(([group, songs]) => (
          <div key={group} className="space-y-1">
            {groups.size > 1 && (
              <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3 px-1">{group}</h2>
            )}
            {songs.map((song, i) => {
              const isCurrentSong = currentSong?.url === song.url;
              const isCurrentPlaying = isCurrentSong && isPlaying;
              return (
                <motion.div
                  key={song.url}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors cursor-pointer ${
                    isCurrentSong ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => handlePlay(song)}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors ${
                    isCurrentSong ? 'bg-[var(--theme-color)]/20' : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    {isCurrentPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 text-[var(--theme-color)]" />
                    ) : (
                      <Play className={`w-3.5 h-3.5 ${isCurrentSong ? 'text-[var(--theme-color)]' : 'text-white/40 group-hover:text-white/80'}`} />
                    )}
                  </div>
                  <span className={`flex-1 text-sm truncate ${isCurrentSong ? 'text-[var(--theme-color)]' : 'text-white/80 group-hover:text-white'}`}>
                    {song.name}
                  </span>
                  <a
                    href={song.url}
                    download
                    onClick={e => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/80"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        ))
      )}
    </motion.div>
  );
}
