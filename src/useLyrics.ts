import { useState, useEffect } from 'react';
import axios from 'axios';
import { Song, Era } from './types';
import { parseArtistFromSong } from './lastfm';

export interface Annotation {
  fragment: string;
  body: string;
}

export interface SongInfo {
  description: string | null;
  producers: string[];
  writers: string[];
  samples: { title: string; artist: string }[];
  annotationCount: number;
}

export interface LyricsData {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  parsedSyncedLyrics: { time: number; text: string }[] | null;
  source: 'genius' | 'lrclib' | null;
  annotations: Annotation[] | null;
  geniusUrl: string | null;
  songInfo: SongInfo | null;
}

const lyricsCache = new Map<string, LyricsData & { error: string | null }>();

let geniusTokenPromise: Promise<string> | null = null;
function getGeniusToken(): Promise<string> {
  if (!geniusTokenPromise) {
    geniusTokenPromise = axios.get('/api/genius-token')
      .then(r => r.data?.token ?? '')
      .catch(() => '');
  }
  return geniusTokenPromise;
}

function extractAnnotationsClient(data: any): Annotation[] | null {
  try {
    const referents: any[] = data?.response?.referents ?? [];
    const result = referents
      .filter((r: any) => r.annotations?.length > 0 && r.fragment?.trim())
      .map((r: any) => {
        const sorted = [...r.annotations].sort((a: any, b: any) => (b.votes_total ?? 0) - (a.votes_total ?? 0));
        const body: string = sorted[0]?.body?.plain?.trim() ?? '';
        return body ? { fragment: r.fragment.trim(), body } : null;
      })
      .filter(Boolean) as Annotation[];
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

function extractSongInfoClient(data: any): SongInfo | null {
  try {
    const song = data?.response?.song;
    if (!song) return null;
    const description = song.description?.plain?.trim() ?? '';
    const customPerfs: any[] = song.custom_performances ?? [];
    const producerPerf = customPerfs.find((p: any) => p.label?.toLowerCase().includes('produc'));
    const writerPerf = customPerfs.find((p: any) => p.label?.toLowerCase().includes('writ'));
    const producers: string[] = (producerPerf?.artists ?? song.producer_artists ?? []).map((a: any) => a.name).filter(Boolean);
    const writers: string[] = (writerPerf?.artists ?? song.writer_artists ?? []).map((a: any) => a.name).filter(Boolean);
    const samplesRel = (song.song_relationships ?? []).find((r: any) => r.type === 'samples');
    const samples: { title: string; artist: string }[] = (samplesRel?.songs ?? []).map((s: any) => ({
      title: s.title ?? '',
      artist: s.primary_artist?.name ?? '',
    }));
    return {
      description: description && description !== '?' ? description : null,
      producers,
      writers,
      samples,
      annotationCount: song.annotation_count ?? 0,
    };
  } catch {
    return null;
  }
}

function cleanTrackName(name: string): string {
  let track = name;
  if (track.includes(' - ')) {
    track = track.split(' - ').slice(1).join(' - ').trim();
  }

  track = track.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, '');

  track = track.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');

  return track.trim();
}

function getAlternativeNames(song: Song): string[] {
  const names: string[] = [];

  const baseTrackName = cleanTrackName(song.name);
  if (baseTrackName) names.push(baseTrackName);

  const processText = (text: string | undefined) => {
    if (!text) return;

    const parenMatches = [...text.matchAll(/\(([^)]+)\)/g)];
    for (const match of parenMatches) {
      const inner = match[1];
      const lowerInner = inner.toLowerCase().trim();
      if (lowerInner.startsWith('prod') || lowerInner.startsWith('feat') || lowerInner.startsWith('ft') || lowerInner.startsWith('ref') || lowerInner === 'snippet') {
        continue;
      }

      const parts = inner.split(/[,/]/);
      for (let part of parts) {
        part = part.trim();
        part = part.replace(/\s*'\s*/g, "'");
        part = cleanTrackName(part);
        if (part) names.push(part);
      }
    }

    let textWithoutParens = text.replace(/\([^)]+\)/g, '').trim();
    if (textWithoutParens) {
      const parts = textWithoutParens.split(/[,/]/);
      for (let part of parts) {
        part = part.trim();
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith('prod') || lowerPart.startsWith('feat') || lowerPart.startsWith('ft') || lowerPart.startsWith('ref')) {
          continue;
        }
        part = part.replace(/\s*'\s*/g, "'");
        part = cleanTrackName(part);
        if (part) names.push(part);
      }
    }
  };

  processText(song.name);
  processText(song.extra);

  const lower = baseTrackName.toLowerCase();
  if (lower.includes('see me') || lower.includes('see you again') || lower.includes('never see me again')) {
    names.push('Never See Me Again', 'See You Again', 'See Me Again', 'See Me');
  }
  if (lower.includes("mama's boy") || lower.includes("mamas boy")) {
    names.push("Mama's Boyfriend", "My Momma's Boyfriend");
  }

  return [...new Set(names)];
}


export function useLyrics(currentSong: Song | null, era: Era | null) {
  const [lyricsData, setLyricsData] = useState<LyricsData>({ plainLyrics: null, syncedLyrics: null, parsedSyncedLyrics: null, source: null, annotations: null, geniusUrl: null, songInfo: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSong) return;

    const cacheKey = `${currentSong.name}-${era?.name || ''}`;
    if (lyricsCache.has(cacheKey)) {
      const cached = lyricsCache.get(cacheKey)!;
      setLyricsData({
        plainLyrics: cached.plainLyrics,
        syncedLyrics: cached.syncedLyrics,
        parsedSyncedLyrics: cached.parsedSyncedLyrics,
        source: cached.source,
        annotations: cached.annotations,
        geniusUrl: cached.geniusUrl,
        songInfo: cached.songInfo,
      });
      setError(cached.error);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyricsData({ plainLyrics: null, syncedLyrics: null, parsedSyncedLyrics: null, source: null, annotations: null, geniusUrl: null, songInfo: null });

      const initialArtist = parseArtistFromSong(currentSong.name, currentSong.extra, era?.name);

      let trackNamesToTry = getAlternativeNames(currentSong);
      let artistsToTry = [initialArtist];

      if (currentSong.name === "Alright but the beat is Father Stretch My Hands Pt. 1") {
        artistsToTry = ["Kendrick Lamar"];
        trackNamesToTry = ["Alright"];
      } else {
        const lowerArtist = initialArtist.toLowerCase();
        if (!lowerArtist.includes('kanye west') && !lowerArtist.includes('ye')) {
          artistsToTry.push('Kanye West', 'Ye');
        }
      }

      let foundLyrics = false;
      let finalData: LyricsData = { plainLyrics: null, syncedLyrics: null, parsedSyncedLyrics: null, source: null, annotations: null, geniusUrl: null, songInfo: null };

      // Genius metadata saved here if lyrics scraping is blocked, so we can attach to lrclib results
      let geniusMeta: { annotations: LyricsData['annotations']; geniusUrl: string | null; songInfo: LyricsData['songInfo'] } | null = null;

      // Try Genius — API calls made from browser (user IP, not CF datacenter)
      // Token fetched at runtime from server so it stays out of the build
      if (isMounted) {
        try {
          const token = await getGeniusToken();
          if (token) {
            const geniusHeaders = { Authorization: `Bearer ${token}` };
            const searchRes = await axios.get('https://api.genius.com/search', {
              params: { q: `${initialArtist} ${cleanTrackName(currentSong.name)}` },
              headers: geniusHeaders,
            });

            const hits: any[] = searchRes.data?.response?.hits ?? [];
            const hit = hits.find((h: any) => h.type === 'song') ?? hits[0];

            if (hit && isMounted) {
              const songId: number = hit.result.id;
              const songUrl: string = hit.result.url;

              const [lyricsRes, referentsRes, songDetailsRes] = await Promise.all([
                axios.get('/api/lyrics', { params: { url: songUrl } }).catch(() => null),
                axios.get('https://api.genius.com/referents', {
                  params: { song_id: songId, text_format: 'plain', per_page: 50 },
                  headers: geniusHeaders,
                }).catch(() => null),
                axios.get(`https://api.genius.com/songs/${songId}`, {
                  params: { text_format: 'plain' },
                  headers: geniusHeaders,
                }).catch(() => null),
              ]);

              const lyrics: string | null = lyricsRes?.data?.lyrics ?? null;
              const annotations = extractAnnotationsClient(referentsRes?.data);
              const songInfo = extractSongInfoClient(songDetailsRes?.data);

              if (lyrics) {
                finalData = {
                  plainLyrics: lyrics,
                  syncedLyrics: null,
                  parsedSyncedLyrics: null,
                  source: 'genius',
                  annotations,
                  geniusUrl: songUrl,
                  songInfo,
                };
                foundLyrics = true;
                if (isMounted) setLyricsData(finalData);
              } else {
                // Lyrics page blocked but API metadata came through — save for lrclib merge
                geniusMeta = { annotations, geniusUrl: songUrl, songInfo };
              }
            }
          }
        } catch {
          // Genius unreachable — fall through to lrclib only
        }
      }

      // Fall back to lrclib (supports synced lyrics)
      if (!foundLyrics) {
        for (const artist of artistsToTry) {
          if (foundLyrics) break;

          for (const trackName of trackNamesToTry) {
            if (!isMounted) return;

            try {
              const params: any = {
                artist_name: artist,
                track_name: trackName
              };

              const res = await axios.get(`https://lrclib.net/api/get`, { params });

              if (res.data && (res.data.plainLyrics || res.data.syncedLyrics)) {
                let parsedSyncedLyrics = null;
                if (res.data.syncedLyrics) {
                  const lines = res.data.syncedLyrics.split('\n');
                  parsedSyncedLyrics = lines.map((line: string) => {
                    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
                    if (match) {
                      const minutes = parseInt(match[1], 10);
                      const seconds = parseInt(match[2], 10);
                      const msStr = match[3];
                      const milliseconds = msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr, 10);
                      const time = minutes * 60 + seconds + milliseconds / 1000;
                      return { time, text: match[4].trim() };
                    }
                    return null;
                  }).filter(Boolean) as { time: number; text: string }[];
                }

                finalData = {
                  plainLyrics: res.data.plainLyrics || null,
                  syncedLyrics: res.data.syncedLyrics ? res.data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, '') : null,
                  parsedSyncedLyrics,
                  // Attach Genius metadata if we got it, so annotations/song info still show
                  source: geniusMeta ? 'genius' : 'lrclib',
                  annotations: geniusMeta?.annotations ?? null,
                  geniusUrl: geniusMeta?.geniusUrl ?? null,
                  songInfo: geniusMeta?.songInfo ?? null,
                };

                if (isMounted) {
                  setLyricsData(finalData);
                  foundLyrics = true;
                }
                break;
              }
            } catch {
            }
          }
        }
      }

      if (isMounted) {
        if (!foundLyrics) {
          setError("No lyrics found for this track.");
          lyricsCache.set(cacheKey, { ...finalData, error: "No lyrics found for this track." });
        } else {
          lyricsCache.set(cacheKey, { ...finalData, error: null });
        }
        setLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isMounted = false;
    };
  }, [currentSong, era]);

  return { ...lyricsData, loading, error };
}
