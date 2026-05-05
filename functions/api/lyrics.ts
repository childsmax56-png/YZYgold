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
      return new Response(JSON.stringify({ lyrics: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchData: any = await searchRes.json();
    const hits: any[] = searchData?.response?.hits ?? [];

    const hit = hits.find((h: any) => h.type === 'song') ?? hits[0];
    if (!hit) {
      return new Response(JSON.stringify({ lyrics: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const songUrl: string = hit.result.url;
    const pageRes = await fetch(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YZYgold/1.0)',
      },
    });

    if (!pageRes.ok) {
      return new Response(JSON.stringify({ lyrics: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await pageRes.text();
    const lyrics = extractLyrics(html);

    return new Response(JSON.stringify({ lyrics }), {
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

function extractLyrics(html: string): string | null {
  // Genius stores lyrics in data-lyrics-container divs
  const containers: string[] = [];
  const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = containerRegex.exec(html)) !== null) {
    containers.push(match[1]);
  }

  if (containers.length === 0) return null;

  const raw = containers.join('\n');

  // Convert <br> tags to newlines, strip all other HTML tags
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, '’')
    .replace(/&#8217;/g, '’')
    .trim();

  return text || null;
}
