export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const artist = url.searchParams.get('artist')?.trim();
  const track = url.searchParams.get('track')?.trim();

  if (!artist || !track) {
    return new Response(JSON.stringify({ error: 'Missing artist or track' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = context.env.GENIUS_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Genius token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const searchRes = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(`${artist} ${track}`)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!searchRes.ok) {
      return new Response(JSON.stringify({ lyrics: null, _debug: `search_${searchRes.status}` }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchData: any = await searchRes.json();
    const hits: any[] = searchData?.response?.hits ?? [];
    const hit = hits.find((h: any) => h.type === 'song') ?? hits[0];

    if (!hit) {
      return new Response(JSON.stringify({ lyrics: null, _debug: 'no_hit' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const songId: number = hit.result.id;
    const songUrl: string = hit.result.url;
    const ampUrl: string = songUrl.replace('https://genius.com/', 'https://genius.com/amp/');
    const authHeaders = { Authorization: `Bearer ${token}` };
    const pageHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    };

    const [pageRes, referentsRes, songDetailsRes] = await Promise.all([
      fetch(songUrl, { headers: pageHeaders }),
      fetch(`https://api.genius.com/referents?song_id=${songId}&text_format=plain&per_page=50`, { headers: authHeaders }),
      fetch(`https://api.genius.com/songs/${songId}?text_format=plain`, { headers: authHeaders }),
    ]);

    const [annotations, songInfo] = await Promise.all([
      extractAnnotations(referentsRes),
      extractSongInfo(songDetailsRes),
    ]);

    let lyrics: string | null = null;
    if (pageRes.ok) {
      lyrics = await extractLyrics(pageRes);
    }

    // Always return whatever we have — lyrics may be null if the page is blocked,
    // but annotations/songInfo from the API still work and are useful to the client.
    return new Response(JSON.stringify({ lyrics, annotations, geniusUrl: songUrl, songInfo }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ lyrics: null, _debug: `caught:${e?.message ?? 'unknown'}` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function extractLyrics(pageRes: Response): Promise<string | null> {
  const parts: string[] = [];
  let containerCount = 0;
  let skipDepth = 0;

  const transformed = new HTMLRewriter()
    .on('[data-lyrics-container="true"]', {
      element() {
        if (containerCount > 0) parts.push('\n\n');
        containerCount++;
      },
    })
    .on('[data-lyrics-container="true"] [data-exclude-from-selection="true"]', {
      element(el) {
        skipDepth++;
        el.onEndTag(() => { skipDepth--; });
      },
    })
    .on('[data-lyrics-container="true"] *', {
      text(chunk) {
        if (skipDepth === 0) parts.push(chunk.text);
      },
    })
    .on('[data-lyrics-container="true"] br', {
      element() {
        if (skipDepth === 0) parts.push('\n');
      },
    })
    .transform(pageRes);

  await transformed.arrayBuffer();

  const raw = parts.join('').trim();
  if (!raw) return null;

  const decoded = raw
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return decoded;
}

async function extractAnnotations(res: Response): Promise<{ fragment: string; body: string }[]> {
  try {
    if (!res.ok) return [];
    const data: any = await res.json();
    const referents: any[] = data?.response?.referents ?? [];

    return referents
      .filter((r: any) => r.annotations?.length > 0 && r.fragment?.trim())
      .map((r: any) => {
        const sorted = [...r.annotations].sort((a: any, b: any) => (b.votes_total ?? 0) - (a.votes_total ?? 0));
        const body: string = sorted[0]?.body?.plain?.trim() ?? '';
        return body ? { fragment: r.fragment.trim(), body } : null;
      })
      .filter(Boolean) as { fragment: string; body: string }[];
  } catch {
    return [];
  }
}

interface SongInfo {
  description: string | null;
  producers: string[];
  writers: string[];
  samples: { title: string; artist: string }[];
  annotationCount: number;
}

async function extractSongInfo(res: Response): Promise<SongInfo | null> {
  try {
    if (!res.ok) return null;
    const data: any = await res.json();
    const song = data?.response?.song;
    if (!song) return null;

    const description = song.description?.plain?.trim() ?? '';

    const customPerfs: any[] = song.custom_performances ?? [];
    const producerPerf = customPerfs.find((p: any) => p.label?.toLowerCase().includes('produc'));
    const writerPerf = customPerfs.find((p: any) => p.label?.toLowerCase().includes('writ'));

    const producers: string[] = (producerPerf?.artists ?? song.producer_artists ?? [])
      .map((a: any) => a.name).filter(Boolean);
    const writers: string[] = (writerPerf?.artists ?? song.writer_artists ?? [])
      .map((a: any) => a.name).filter(Boolean);

    const samplesRel = (song.song_relationships ?? []).find((r: any) => r.type === 'samples');
    const samples: { title: string; artist: string }[] = (samplesRel?.songs ?? []).map((s: any) => ({
      title: s.title ?? '',
      artist: s.primary_artist?.name ?? '',
    }));

    const annotationCount: number = song.annotation_count ?? 0;

    return {
      description: description && description !== '?' ? description : null,
      producers,
      writers,
      samples,
      annotationCount,
    };
  } catch {
    return null;
  }
}
