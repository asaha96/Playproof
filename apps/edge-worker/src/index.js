export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'playproof-edge-worker' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Placeholder - implement token issuance, caching, prefilter later
    return new Response('PlayProof Edge Worker', { status: 200 });
  },
};
