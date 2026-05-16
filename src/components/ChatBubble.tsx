import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { TrackerData, Era, Song } from '../types';
import { useSettings } from '../SettingsContext';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ScreenContext {
  activeCategory: string;
  selectedAlbumName?: string;
  currentSongName?: string;
  currentEraName?: string;
}

interface ChatBubbleProps {
  data: TrackerData | null;
  screenContext: ScreenContext;
  showPlayer: boolean;
}

function cleanSongName(name: string): string {
  return name.replace(/\s*[\[(][^\])[]*[\])]/g, '').trim();
}

function eraSlug(name: string): string {
  return encodeURIComponent(
    name.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-')
  );
}

function buildTrackerSummary(data: TrackerData): string {
  const eras = Object.values(data.eras || {}) as Era[];
  const lines: string[] = [];

  for (const era of eras) {
    const slug = eraSlug(era.name);
    const categories = Object.entries(era.data || {});
    const allSongs: string[] = [];
    for (const [, songs] of categories) {
      for (const song of songs as Song[]) {
        const parts = [cleanSongName(song.name)];
        if (song.quality) parts.push(`quality:${song.quality}`);
        if (song.available_length) parts.push(`length:${song.available_length}`);
        if (song.leak_date) parts.push(`leaked:${song.leak_date}`);
        if (!song.url && !(song.urls?.length)) parts.push('unavailable');
        allSongs.push(parts.join(' | '));
      }
    }
    lines.push(`=== ${era.name} | url:/album/${slug} ===`);
    lines.push(...allSongs);
  }

  return lines.join('\n');
}

function renderMessage(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const tokens = line.split(/(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/);
    return (
      <span key={li}>
        {li > 0 && <br />}
        {tokens.map((token, ti) => {
          if (!token) return null;
          const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            return (
              <a
                key={ti}
                href={linkMatch[2]}
                className="underline text-[var(--theme-color)] hover:opacity-80"
                onClick={e => {
                  if (linkMatch[2].startsWith('/')) {
                    e.preventDefault();
                    window.history.pushState({}, '', linkMatch[2]);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
              >
                {linkMatch[1]}
              </a>
            );
          }
          const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) return <strong key={ti}>{boldMatch[1]}</strong>;
          return token;
        })}
      </span>
    );
  });
}

export function ChatBubble({ data, screenContext, showPlayer }: ChatBubbleProps) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const trackerSummary = data ? buildTrackerSummary(data) : 'Tracker data not yet loaded.';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          screenContext,
          trackerSummary,
        }),
      });

      const json = await res.json() as { reply?: string; error?: string; details?: string };
      const reply = json.reply
        ?? (settings.aiErrorDetails
          ? (json.details ? `Error: ${json.details}` : json.error)
          : (json.error ? 'Something went wrong. Please try again.' : undefined))
        ?? 'Something went wrong. Please try again.';
      setMessages([...nextHistory, { role: 'model', content: reply }]);
    } catch {
      setMessages([...nextHistory, { role: 'model', content: 'Failed to get a response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bottomOffset = showPlayer ? 'bottom-28' : 'bottom-6';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className={`fixed right-6 z-[9000] w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#111]`}
            style={{
              bottom: showPlayer ? 'calc(5.5rem + 1.5rem)' : '5rem',
              maxHeight: '480px',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#181818]">
              <div>
                <p className="text-white text-sm font-semibold leading-tight">YZYGOLD Assistant</p>
                <p className="text-white/40 text-[10px]">Ask anything about Ye's music</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-white/30 text-xs text-center py-6 leading-relaxed">
                  Ask about any Ye song, era, leak, or quality rating.
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--theme-color)] text-white rounded-br-sm'
                        : 'bg-white/8 text-white/85 rounded-bl-sm border border-white/8'
                    }`}
                  >
                    {msg.role === 'user' ? msg.content : renderMessage(msg.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/8 border border-white/8 px-3 py-2 rounded-xl rounded-bl-sm">
                    <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 py-2 border-t border-white/10 bg-[#181818] flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something..."
                rows={1}
                className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 resize-none focus:outline-none focus:border-[var(--theme-color)]/50 transition-colors"
                style={{ maxHeight: '80px', overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-[var(--theme-color)] text-white disabled:opacity-30 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(v => !v)}
        className={`fixed right-6 ${bottomOffset} z-[9000] w-12 h-12 rounded-full bg-[var(--theme-color)] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
        title="Ask AI about music"
        whileTap={{ scale: 0.92 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
