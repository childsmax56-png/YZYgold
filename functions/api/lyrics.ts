export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const songUrl = url.searchParams.get('url')?.trim();

  if (!songUrl || !songUrl.startsWith('https://genius.com/')) {
    return new Response(JSON.stringify({ error: 'Invalid or missing url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const pageRes = await fetch(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    let lyrics: string | null = null;
    if (pageRes.ok) {
      lyrics = await extractLyrics(pageRes);
    }

    return new Response(JSON.stringify({ lyrics }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
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

  return raw
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
