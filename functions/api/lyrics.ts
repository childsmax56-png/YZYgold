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
      return new Response(JSON.stringify({ lyrics: null, _debug: `search_fail:${searchRes.status}` }), {
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

    const songUrl: string = hit.result.url;
    const pageRes = await fetch(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageRes.ok) {
      return new Response(JSON.stringify({ lyrics: null, _debug: `page_fail:${pageRes.status}:${songUrl}` }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lyrics = await extractLyrics(pageRes);

    return new Response(JSON.stringify({ lyrics, _debug: `ok:${songUrl}:len=${lyrics?.length ?? 0}` }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response(JSON.stringify({ lyrics: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function extractLyrics(pageRes: Response): Promise<string | null> {
  const parts: string[] = [];
  let containerCount = 0;

  const transformed = new HTMLRewriter()
    .on('[data-lyrics-container="true"]', {
      element() {
        if (containerCount > 0) parts.push('\n\n');
        containerCount++;
      },
      text(chunk) {
        parts.push(chunk.text);
      },
    })
    .on('[data-lyrics-container="true"] br', {
      element() {
        parts.push('\n');
      },
    })
    .transform(pageRes);

  await transformed.arrayBuffer();

  const result = parts.join('').trim();
  return result || null;
}
