export const onRequestGet: PagesFunction<Env> = async (context) => {
  return new Response(JSON.stringify({ token: context.env.GENIUS_TOKEN ?? '' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
