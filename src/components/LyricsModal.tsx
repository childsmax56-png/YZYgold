import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Mic2, AlignLeft, Clock } from 'lucide-react';
import { Song, Era } from '../types';
import { createPortal } from 'react-dom';
import { useLyrics } from '../useLyrics';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song;
  era: Era | null;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

import { useSettings } from '../SettingsContext';

export function LyricsModal({ isOpen, onClose, currentSong, era, currentTime = 0, onSeek }: LyricsModalProps) {
  const { plainLyrics, parsedSyncedLyrics, source, loading, error } = useLyrics(currentSong, era);
  const { settings } = useSettings();
  const [viewMode, setViewMode] = useState<'sync' | 'plain'>('sync');
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSynced = !!parsedSyncedLyrics && parsedSyncedLyrics.length > 0;

  useEffect(() => {
    if (!loading && !hasSynced && plainLyrics && !settings.syncedLyricsOnly) {
      setViewMode('plain');
    } else if (!loading && hasSynced) {
      setViewMode('sync');
    }
  }, [hasSynced, plainLyrics, loading, settings.syncedLyricsOnly]);

  const currentLineIndex = parsedSyncedLyrics 
    ? parsedSyncedLyrics.findIndex((line, i) => {
        const nextLine = parsedSyncedLyrics[i + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
      })
    : -1;

  useEffect(() => {
    if (isOpen && viewMode === 'sync' && parsedSyncedLyrics && currentLineIndex !== -1 && containerRef.current) {
      const container = containerRef.current;
      const activeElement = container.querySelector(`[data-index="${currentLineIndex}"]`) as HTMLElement;
      if (activeElement) {
        const containerHalfHeight = container.clientHeight / 2;
        const elementOffset = activeElement.offsetTop;
        const elementHalfHeight = activeElement.clientHeight / 2;
        container.scrollTo({
          top: elementOffset - containerHalfHeight + elementHalfHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [currentLineIndex, isOpen, viewMode, parsedSyncedLyrics]);

  if (!isOpen) return null;

  const bgImage = currentSong.image || era?.image;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: settings.miniLyricsOpacity / 100, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-28 right-4 md:right-8 w-[350px] md:w-[400px] h-[500px] max-h-[60vh] z-[100] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-[#1a1a1a]"
        >
          {bgImage && settings.showMiniLyricsArt && (
            <div className="absolute inset-0 z-0">
              <img src={bgImage} alt="Background" className="w-full h-full object-cover opacity-30 blur-xl scale-110" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-3 text-white font-bold">
              <Mic2 className="w-4 h-4 text-[var(--theme-color)]" />
              Lyrics
            </div>
            
            <div className="flex items-center gap-3">
              {hasSynced && plainLyrics && !settings.syncedLyricsOnly && (
                <div className="flex items-center bg-white/10 rounded-full p-0.5">
                  <button
                    onClick={() => setViewMode('sync')}
                    className={`p-1.5 rounded-full transition-colors ${viewMode === 'sync' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                    title="Synced Lyrics"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('plain')}
                    className={`p-1.5 rounded-full transition-colors ${viewMode === 'plain' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                    title="Plain Text"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="relative z-10 flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col mask-image-y"
            style={{ maskImage: viewMode === 'sync' ? 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' : 'none' }}
          >
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-color)]" />
                <span className="text-sm font-medium">Searching lyrics...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-white/50 text-center text-sm font-medium">
                {error}
              </div>
            ) : viewMode === 'sync' && parsedSyncedLyrics ? (
              <div className={`flex flex-col gap-4 py-32 ${settings.miniLyricsAlignment === 'left' ? 'text-left' : settings.miniLyricsAlignment === 'right' ? 'text-right' : 'text-center'}`}>
                {parsedSyncedLyrics.map((line, i) => {
                  const isActive = i === currentLineIndex;
                  const isPassed = i < currentLineIndex;
                  return (
                    <motion.div
                      key={i}
                      data-index={i}
                      onClick={() => onSeek && onSeek(line.time)}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                        opacity: isActive ? 1 : isPassed ? 0.5 : 0.3,
                      }}
                      transition={{ duration: 0.3 }}
                      className={`text-lg md:text-xl font-bold leading-tight cursor-pointer hover:opacity-80 transition-opacity ${isActive ? 'text-white' : 'text-white/50'}`}
                    >
                      {line.text || '♪'}
                    </motion.div>
                  );
                })}
                <div className="mt-8 text-xs text-white/40 text-center uppercase tracking-wider">
                  Lyrics may not be accurate
                </div>
                <div className="mt-1 text-[10px] text-white/30 text-center">
                  Sourced from {source === 'genius' ? 'Genius' : 'lrclib'}
                </div>
              </div>
            ) : settings.syncedLyricsOnly && !hasSynced ? (
              <div className="flex-1 flex items-center justify-center text-white/50 text-center text-sm font-medium">
                No synced lyrics available for this track.
              </div>
            ) : plainLyrics ? (
              <div className="flex-1 flex flex-col">
                <div className={`text-white/90 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium ${settings.miniLyricsAlignment === 'left' ? 'text-left' : settings.miniLyricsAlignment === 'right' ? 'text-right' : 'text-center'}`}>
                  {plainLyrics}
                </div>
                <div className="mt-8 text-xs text-white/40 text-center uppercase tracking-wider">
                  Lyrics may not be accurate
                </div>
                <div className="mt-1 text-[10px] text-white/30 text-center">
                  Sourced from {source === 'genius' ? 'Genius' : 'lrclib'}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
