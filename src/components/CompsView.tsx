import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface CompEntry {
  era: string;
  art: string;
  name: string;
  description: string;
  creator: string;
  review: string;
  downloads: string;
  streaming: string;
}

const SECTION_LABELS = new Set([
  'Overhauls', 'Renovations', 'Vanilla-style', 'Extensions',
  'Honorable Mentions', 'Remixes', 'Alternates', 'Alts', 'Vanilla-styles', 'HMs',
]);

function parseCSV(text: string): CompEntry[] {
  const lines = text.split('\n');
  const results: CompEntry[] = [];
  let i = 0;
  const fields: string[] = [];

  function parseRow(line: string, startIdx: number): { fields: string[]; nextIdx: number } {
    const rowFields: string[] = [];
    let j = startIdx;
    while (j < lines.length) {
      const current = j === startIdx ? line : lines[j];
      let field = '';
      let col = j === startIdx ? 0 : 0;
      // Simple CSV parser per row
      let pos = 0;
      while (pos <= current.length) {
        if (pos === current.length || current[pos] === ',') {
          rowFields.push(field);
          field = '';
          pos++;
        } else if (current[pos] === '"') {
          pos++;
          while (pos < current.length && current[pos] !== '"') {
            field += current[pos++];
          }
          pos++; // closing quote
        } else {
          field += current[pos++];
        }
      }
      return { fields: rowFields, nextIdx: j + 1 };
    }
    return { fields: rowFields, nextIdx: startIdx + 1 };
  }

  // Use a proper multiline-aware CSV parse
  const rows: string[][] = [];
  let raw = text;
  let pos = 0;

  while (pos < raw.length) {
    const row: string[] = [];
    while (pos <= raw.length) {
      if (pos >= raw.length || raw[pos] === '\n' || raw[pos] === '\r') {
        row.push('');
        if (raw[pos] === '\r' && raw[pos + 1] === '\n') pos++;
        pos++;
        break;
      }
      if (raw[pos] === '"') {
        pos++;
        let field = '';
        while (pos < raw.length) {
          if (raw[pos] === '"' && raw[pos + 1] === '"') {
            field += '"';
            pos += 2;
          } else if (raw[pos] === '"') {
            pos++;
            break;
          } else {
            field += raw[pos++];
          }
        }
        row.push(field);
        if (raw[pos] === ',') pos++;
        else if (raw[pos] === '\r' || raw[pos] === '\n' || pos >= raw.length) {
          if (raw[pos] === '\r' && raw[pos + 1] === '\n') pos++;
          pos++;
          break;
        }
      } else {
        let field = '';
        while (pos < raw.length && raw[pos] !== ',' && raw[pos] !== '\n' && raw[pos] !== '\r') {
          field += raw[pos++];
        }
        row.push(field);
        if (raw[pos] === ',') pos++;
        else {
          if (raw[pos] === '\r' && raw[pos + 1] === '\n') pos++;
          pos++;
          break;
        }
      }
    }
    if (row.length > 0) rows.push(row);
  }

  // Skip header + metadata rows, parse actual comp entries
  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx];
    const era = (row[0] || '').trim();
    const art = (row[1] || '').trim();
    const name = (row[2] || '').trim();
    const desc = (row[3] || '').trim();
    const creator = (row[4] || '').trim();
    const review = (row[5] || '').trim();
    const downloads = (row[6] || '').trim();
    const streaming = (row[7] || '').trim();

    if (!name) continue;
    const namePlain = name.replace(/[⭐🌟✨↳]/g, '').trim();
    if (SECTION_LABELS.has(namePlain)) continue;
    // Skip count summary rows (era has digit + category text, no name)
    if (!name && era && /^\d/.test(era)) continue;
    // Skip metadata banner rows
    if (!desc && !creator && !downloads && !streaming) continue;

    results.push({ era, art, name, description: desc, creator, review, downloads, streaming });
  }

  return results;
}

function linkify(text: string) {
  if (!text) return null;
  const parts = text.split('\n').filter(Boolean);
  return parts.map((part, i) => {
    if (part === '[untitled]') return <span key={i} className="text-white/30 text-xs">[untitled]</span>;
    const isLink = part.startsWith('http');
    return (
      <span key={i} className="block">
        {isLink ? (
          <a href={part} target="_blank" rel="noopener noreferrer" className="text-[var(--theme-color)] hover:underline text-xs flex items-center gap-1">
            <ExternalLink className="w-3 h-3 inline shrink-0" />{part}
          </a>
        ) : (
          <span className="text-white/60 text-xs">{part}</span>
        )}
      </span>
    );
  });
}

function isHighlight(name: string) {
  return name.includes('⭐') || name.includes('🌟') || name.includes('✨');
}

interface EraGroup {
  era: string;
  comps: CompEntry[];
}

interface CompsViewProps {
  searchQuery: string;
}

export function CompsView({ searchQuery }: CompsViewProps) {
  const [comps, setComps] = useState<CompEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/data/comps.csv')
      .then(r => r.text())
      .then(text => {
        setComps(parseCSV(text));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return comps;
    const q = searchQuery.toLowerCase();
    return comps.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.era.toLowerCase().includes(q) ||
      c.creator.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }, [comps, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, CompEntry[]>();
    for (const c of filtered) {
      if (!map.has(c.era)) map.set(c.era, []);
      map.get(c.era)!.push(c);
    }
    return Array.from(map.entries()).map(([era, comps]) => ({ era, comps })) as EraGroup[];
  }, [filtered]);

  const toggleEra = (era: string) => {
    setCollapsedEras(prev => {
      const next = new Set(prev);
      if (next.has(era)) next.delete(era);
      else next.add(era);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        Loading comps...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">Sophie's Comp Tracker</h2>
          <p className="text-white/40 text-xs mt-0.5">{filtered.length} comps · {groups.length} eras</p>
        </div>
        <a
          href="https://sophiecuratedtracker.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--theme-color)] hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> sophiecuratedtracker.com
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {groups.map(({ era, comps }) => {
          const collapsed = collapsedEras.has(era);
          return (
            <div key={era} className="rounded-lg border border-white/8 overflow-hidden">
              <button
                onClick={() => toggleEra(era)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/8 transition-colors text-left"
              >
                <span className="font-semibold text-white text-sm">{era}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">{comps.length} comp{comps.length !== 1 ? 's' : ''}</span>
                  {collapsed ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronUp className="w-4 h-4 text-white/40" />}
                </div>
              </button>

              {!collapsed && (
                <div className="divide-y divide-white/5">
                  {comps.map((comp, i) => {
                    const highlight = isHighlight(comp.name);
                    return (
                      <div
                        key={i}
                        className={`px-4 py-3 flex gap-4 ${highlight ? 'bg-[var(--theme-color)]/5' : 'hover:bg-white/3'} transition-colors`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5 flex-wrap">
                            {highlight && <Star className="w-3.5 h-3.5 text-[var(--theme-color)] shrink-0 mt-0.5" />}
                            <span className={`text-sm font-semibold leading-snug ${highlight ? 'text-[var(--theme-color)]' : 'text-white'}`}>
                              {comp.name.replace(/[⭐🌟✨]/g, '').trim()}
                            </span>
                          </div>
                          {comp.creator && (
                            <p className="text-white/50 text-xs mt-0.5">{comp.creator}</p>
                          )}
                          {comp.description && (
                            <p className="text-white/60 text-xs mt-1 leading-relaxed">{comp.description}</p>
                          )}
                          {comp.review && (
                            <p className="text-white/40 text-xs mt-1 italic">{comp.review}</p>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col gap-1 items-end min-w-[100px]">
                          {comp.downloads && (
                            <div className="text-right">
                              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Download</p>
                              {linkify(comp.downloads)}
                            </div>
                          )}
                          {comp.streaming && (
                            <div className="text-right mt-1">
                              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Stream</p>
                              {linkify(comp.streaming)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="flex items-center justify-center h-48 text-white/30 text-sm">
            No comps found
          </div>
        )}
      </div>
    </div>
  );
}
