/**
 * Promotion Runner — Runs SEO, checks stats, reports findings
 * Run: node scripts/promotion-runner.mjs
 * Gateway is on host: we can check it via fetch
 */

const GATEWAY = 'http://127.0.0.1:8080';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

async function run() {
  console.log(`\n=== Promotion Runner ===`);
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Wallet: ${WALLET}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Check gateway health
  try {
    const health = await fetch(`${GATEWAY}/api/health`).then(r => r.json());
    console.log(`✅ Gateway: ${health.status} (uptime: ${Math.round(health.uptime/3600)}h)`);
    console.log(`   Stats: ${health.stats.total} total, ${health.stats.premium} premium, ${health.stats.free} free`);
    console.log(`   API keys: ${health.api_keys}`);
  } catch(e) {
    console.log(`❌ Gateway: ${e.message}`);
  }

  // Check catalog
  try {
    const catalog = await fetch(`${GATEWAY}/api/catalog`).then(r => r.json());
    console.log(`✅ Catalog: ${catalog.services.length} services`);
    console.log(`   Free tier: ${catalog.free_tier}`);
  } catch(e) {
    console.log(`❌ Catalog: ${e.message}`);
  }

  // Check sitemap
  const fs = await import('fs');
  const sitemap = fs.readFileSync('/root/automaton/content/sitemap.xml', 'utf8');
  const urlCount = (sitemap.match(/<loc>/g) || []).length;
  console.log(`✅ Sitemap: ${urlCount} URLs`);

  // Generate promotion links
  console.log(`\n=== Submission Links ===`);
  const site = 'https://automation.songheng.vip';
  
  const directories = [
    ['MCP.so', `https://mcp.so/submit?url=${site}/api/catalog`],
    ['Smithery', `https://smithery.ai/submit?url=${site}`],
    ['Glama AI', `https://glama.ai/agents/submit?url=${site}`],
    ['GitHub Topics', `https://github.com/topics/ai-api?q=${site}`],
    ['Hacker News', `https://news.ycombinator.com/submitlink?u=${site}&t=my-automaton%20-%20AI%20Services%20with%20USDC%20Micropayments`],
    ['Product Hunt', `https://www.producthunt.com/posts/new?url=${site}`],
  ];
  
  for (const [name, url] of directories) {
    console.log(`   📍 ${name}: ${url}`);
  }

  // Check if promote.sh ran
  try {
    const log = fs.readFileSync('/root/automaton/content/promote/social-post-2026-06-15.md', 'utf8').slice(0, 100);
    console.log(`\n✅ Social post template exists`);
  } catch(e) {
    console.log(`\n❌ No social post template`);
  }

  console.log(`\n=== Done ===`);
}

run().catch(console.error);
