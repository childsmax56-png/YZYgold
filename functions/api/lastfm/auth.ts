export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.LASTFM_API_KEY?.trim();
  if (!apiKey) return new Response("API key not configured", { status: 500 });

  const url = new URL(context.request.url);

  const tokenRes = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${apiKey}&format=json`
  );
  const tokenData: any = await tokenRes.json();
  const token = tokenData.token;
  if (!token) return new Response(`Failed to get token: ${JSON.stringify(tokenData)}`, { status: 500 });

  const callbackUrl = `${url.origin}/api/lastfm/callback`;
  const authUrl = `https://www.last.fm/api/auth/?api_key=${apiKey}&token=${token}&cb=${encodeURIComponent(callbackUrl)}`;

  return Response.redirect(authUrl, 302);
};
