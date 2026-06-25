#!/usr/bin/env node
/**
 * submit-engine.mjs — Submit to search engines + directories
 * Run: node scripts/submit-engine.mjs
 * Pings Google, Bing, Yandex. Generates submission links for directories.
 */

const URL = 'https://automation.songheng.vip';
const SITEMAP = `${URL}/sitemap.xml`;

const searchEngines = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${SITEMAP}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${SITEMAP}` },
  { name: 'Yandex', url: `https://webmaster.yandex.com/ping?sitemap=${SITEMAP}` }
];

const directories = [
  { name: 'ClawHunt', url: 'https://clawhunt.com/tools/submit', desc: 'AI Agent directory — 134 tools' },
  { name: 'MCP.so', url: 'https://mcp.so/submit', desc: 'MCP server registry' },
  { name: 'Smithery.ai', url: 'https://smithery.ai/submit', desc: 'AI tool directory' },
  { name: 'Glama.ai', url: 'https://glama.ai/submit', desc: 'AI agent marketplace' },
  { name: 'Underhanded', url: 'https://underhanded.ai/submit', desc: 'AI tools directory' },
  { name: 'Hugging Face', url: 'https://huggingface.co/spaces/submit', desc: 'AI community' }
];

async function ping(url) {
  try {
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('🌐 Submitting to search engines...\n');
  
  for (const se of searchEngines) {
    const r = await ping(se.url);
    const status = r.ok ? '✅' : '❌';
    console.log(`  ${status} ${se.name}: ${r.ok ? `HTTP ${r.status}` : r.error}`);
  }
  
  console.log('\n📋 Manual directory submissions needed:\n');
  for (const d of directories) {
    console.log(`  📌 ${d.name} — ${d.desc}`);
    console.log(`     ${d.url}\n`);
  }
  
  // Write status
  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/data/submit-status.json', JSON.stringify({
    last_run: new Date().toISOString(),
    search_engines_pinged: searchEngines.length,
    directories_pending: directories.length
  }, null, 2));
  
  console.log('✅ Done. Open the directory links above to submit manually.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
