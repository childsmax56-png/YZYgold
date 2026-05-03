export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    let response: Response;

    if (context.env.YZYGOLD) {
      response = await context.env.YZYGOLD.fetch(
        new Request('https://yzygold.childsmax56.workers.dev/api/a')
      );
    } else {
      response = await fetch('https://yzygold.childsmax56.workers.dev/api/a', {
        headers: { 'Accept': 'application/json' },
      });
    }

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status });
    }

    const data = await response.text();
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response('Failed to fetch data', { status: 502 });
  }
};
