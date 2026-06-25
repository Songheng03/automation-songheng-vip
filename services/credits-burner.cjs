/**
 * credits-burner.cjs — Batch credit utilization service
 * Helps users burn their unused credits by processing multiple items
 * 
 * USAGE: node services/credits-burner.cjs <api-keys.json> <items-count>
 *   items-count: how many items to generate & process (default: 10)
 * 
 * Also exposes handleBatch() for gateway integration
 */

const https = require('https');
const fs = require('fs');

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-bd6a4b0d4d2d40ea8322c224c552b290';
const MODELS = { fast: 'deepseek-chat', cheap: 'deepseek-chat' };

const SERVICE_PROMPTS = {
  analyze: 'Analyze this text: identify themes, sentiment, key entities, and tone. Be concise.',
  summarize: 'Summarize this text in 3-5 bullet points plus one paragraph.',
  review: 'Code review: check correctness, performance, security, style, bugs.',
  security: 'Security scan: find vulnerabilities, OWASP risks, injection flaws. Rate CRITICAL/HIGH/MEDIUM/LOW.',
  explain: 'Explain this code or concept in simple terms with examples.',
  refactor: 'Suggest refactoring improvements with before/after examples.',
  complexity: 'Analyze time/space complexity. Identify bottlenecks. Give Big-O.'
};

const CREDIT_COSTS = { analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2 };

function callDeepSeek(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: (userMessage || '').substring(0, 8000) }
      ],
      max_tokens: 1024,
      temperature: 0.3
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve(j.choices?.[0]?.message?.content || '');
        } catch(e) { reject(new Error(`Parse error: ${e.message} | ${body.substring(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function handleBatch(apiKeys, body) {
  const { apiKey, items } = body || {};
  if (!apiKey || !items || !Array.isArray(items) || items.length === 0)
    return { status: 400, body: { error: 'apiKey and items[] required' } };
  if (items.length > 50)
    return { status: 400, body: { error: 'Max 50 items per batch' } };

  const keyData = apiKeys[apiKey];
  if (!keyData) return { status: 402, body: { error: 'Invalid API key' } };

  let totalCost = 0;
  for (const item of items) totalCost += CREDIT_COSTS[item.type] || 1;

  if (keyData.credits < totalCost)
    return { status: 402, body: { error: `Need ${totalCost} credits, have ${keyData.credits}`, have: keyData.credits, need: totalCost } };

  const results = [];
  let used = 0;
  const batchId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cost = CREDIT_COSTS[item.type] || 1;
    const prompt = SERVICE_PROMPTS[item.type] || SERVICE_PROMPTS.analyze;
    try {
      const output = await callDeepSeek(prompt, item.content || item.text || '');
      used += cost;
      results.push({ index: i, type: item.type, status: 'ok', creditsUsed: cost, output: output.substring(0, 5000) });
    } catch (err) {
      results.push({ index: i, type: item.type, status: 'error', error: err.message, creditsUsed: 0 });
    }
  }

  apiKeys[apiKey].credits -= used;
  apiKeys[apiKey].used = (apiKeys[apiKey].used || 0) + used;
  apiKeys[apiKey].lastUsed = new Date().toISOString();

  return {
    status: 200,
    body: {
      batchId, totalItems: items.length,
      successful: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status === 'error').length,
      totalCreditsUsed: used, results
    }
  };
}

module.exports = { handleBatch, getCreditCosts: () => CREDIT_COSTS, getServicePrompts: () => SERVICE_PROMPTS };
