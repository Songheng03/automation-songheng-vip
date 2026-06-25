
// ── Server & Router ───────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-X402-Payment',
    });
    res.end();
    return;
  }

  // Health
  if (pathname === '/api/health') return handleHealth(req, res);

  // MCP Protocol (for AI agent directory discovery)
  if (pathname.startsWith('/mcp')) return handleMcpRequest(req, res, readJSON(API_KEYS), FREE_LIMIT);

  // Free trial key claim
  if (pathname === '/api/free-trial-key' || pathname === '/api/dev-key') return handleFreeTrialKey(req, res);

  // Checkout route for pricing page buttons
  if (pathname === '/api/checkout') {
    const priceId = parsed.query.price_id;
    const tier = PRICES[priceId];
    if (!tier) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid price_id', valid_ids: Object.keys(PRICES) }));
      return;
    }
    log(`Checkout: price_id=${priceId}, tier=${tier.name}, ip=${ipFromReq(req)}`);
    res.writeHead(302, {
      'Location': `/wallet-payment?price_id=${priceId}&amount=${tier.price}&credits=${tier.credits}&tier=${encodeURIComponent(tier.name)}`
    });
    res.end();
    return;
  }

  // Stats
  if (pathname === '/api/stats') return handleStats(req, res);

  // Analytics stats
  if (pathname === '/api/stats/analytics') return handleAnalyticsStats(req, res);

  // GitHub webhook
  if (pathname === '/api/github-webhook') return githubWebhook.handle(req, res);

  // Wallet payment verification (Base chain USDC)
  if (pathname === '/api/wallet-payment' || pathname === '/api/wallet/verify-payment' || pathname === '/api/pay/wallet' || pathname === '/api/wallet/payment') {
    return handleWalletPayment(req, res);
  }

  // Free API endpoints
  const freeMatch = pathname.match(/^\/free\/(\w+)$/);
  if (freeMatch) return handleFreeAPI(req, res, freeMatch[1]);

  // Premium API endpoints
  const premiumMatch = pathname.match(/^\/v1\/(\w+)$/);
  if (premiumMatch) return handlePremiumAPI(req, res, premiumMatch[1]);

  // Static content
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  log(`Gateway v2.0 started on port ${PORT}`);
});
