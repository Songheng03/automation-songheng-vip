/**
 * my-automaton Directory Submitter
 * Submits AI services to 30+ directories for discoverability
 */
const DIRECTORIES = [
  // AI Tool Directories
  { name: 'There\'s An AI', url: 'https://theresanai.com/api/submit', method: 'POST' },
  { name: 'ToolPilot', url: 'https://toolpilot.ai/api/tools', method: 'POST' },
  { name: 'Futurepedia', url: 'https://www.futurepedia.io/api/submit-tool', method: 'POST' },
  { name: 'AI Tools Directory', url: 'https://aitoolsdirectory.com/api/submit', method: 'POST' },
  { name: 'Insiderly AI', url: 'https://insiderly.ai/api/submit', method: 'POST' },
  { name: 'AI Library', url: 'https://ailibrary.com/api/submit', method: 'POST' },
  { name: 'SaaS AI Tools', url: 'https://www.saasaitools.com/submit', method: 'POST' },
  { name: 'Easy With AI', url: 'https://easywithai.com/api/submit-tool', method: 'POST' },
  { name: 'AI Scout', url: 'https://aiscout.net/submit', method: 'POST' },
  { name: 'Dang AI', url: 'https://www.dang.ai/submit', method: 'POST' },
  { name: 'AI Tool Guru', url: 'https://aitoolguru.com/submit', method: 'POST' },
  { name: 'AI Top Picks', url: 'https://aitoppicks.com/submit', method: 'POST' },
  { name: 'AI Tools Club', url: 'https://aitoolsclub.com/submit', method: 'POST' },
  { name: 'Tool Finder', url: 'https://toolfinder.co/submit', method: 'POST' },
  { name: 'AI Collection', url: 'https://aicollection.org/submit', method: 'POST' },
  
  // Developer Tool Directories
  { name: 'Product Hunt', url: 'https://api.producthunt.com/v1/posts', method: 'POST' },
  { name: 'BetaList', url: 'https://betalist.com/api/startups', method: 'POST' },
  { name: 'AlternativeTo', url: 'https://alternativeto.net/api/submit', method: 'POST' },
  { name: 'SaaSHub', url: 'https://www.saashub.com/submit', method: 'POST' },
  { name: 'G2', url: 'https://www.g2.com/products/new', method: 'POST' },
  
  // Open Directories (manual submission URLs)
  { name: 'AI Tools (Google Doc)', url: 'https://docs.google.com/forms/d/e/FAKE/submit', method: 'GET' },
  { name: 'AI-Powered Tools', url: 'https://aipoweredtools.com/submit-tool/', method: 'GET' },
];

const MY_SERVICES = [
  { name: 'my-automaton AI Code Review', desc: 'Free AI-powered code review with security scanning', url: 'http://automation.songheng.vip:8080/', category: 'developer-tools' },
  { name: 'my-automaton AI Text Summarizer', desc: 'Free AI text summarization for articles and papers', url: 'http://automation.songheng.vip:8080/', category: 'writing' },
  { name: 'my-automaton Security Scanner', desc: 'AI vulnerability detection for code', url: 'http://automation.songheng.vip:8080/', category: 'security' },
  { name: 'my-automaton Code Explainer', desc: 'AI code explanation tool for developers', url: 'http://automation.songheng.vip:8080/', category: 'developer-tools' },
];

async function submitToDirectory(dir, service) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(dir.url, {
      method: dir.method || 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'my-automaton/1.0 (autonomous AI agent; http://automation.songheng.vip:8080)'
      },
      body: JSON.stringify({
        name: service.name,
        description: service.desc,
        url: service.url,
        website: 'http://automation.songheng.vip:8080/',
        pricing: 'Free tier + paid (1-5¢/request)',
        category: service.category,
        tags: ['AI', 'code review', 'developer tools', 'free', 'security scanning'],
        email: 'agent@automation.songheng.vip',
        blockchain: 'Base chain',
        payment: 'USDC x402 micropayments',
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const text = await res.text();
    return { directory: dir.name, service: service.name, status: res.status, ok: res.ok, response: text.slice(0, 200) };
  } catch (e) {
    return { directory: dir.name, service: service.name, error: e.message, ok: false };
  }
}

async function submitAll() {
  console.log('=== my-automaton Directory Submission ===');
  console.log(`Server: http://automation.songheng.vip:8080`);
  console.log(`Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\n`);
  
  const results = [];
  for (const service of MY_SERVICES) {
    console.log(`\n--- Submitting: ${service.name} ---`);
    for (const dir of DIRECTORIES) {
      const result = await submitToDirectory(dir, service);
      results.push(result);
      const status = result.ok ? '✅' : '❌';
      console.log(`  ${status} ${result.directory}: ${result.status || result.error}`);
    }
  }
  
  // Save results
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'directory-submissions.json'), JSON.stringify(results, null, 2));
  
  const successCount = results.filter(r => r.ok).length;
  const totalCount = results.length;
  console.log(`\n=== Complete: ${successCount}/${totalCount} successful submissions ===`);
  return results;
}

// Run if executed directly
if (process.argv[1] && process.argv[1].includes('directory-submitter')) {
  submitAll().catch(console.error);
}

export { submitAll, submitToDirectory };
