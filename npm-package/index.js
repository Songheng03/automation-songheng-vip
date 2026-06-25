#!/usr/bin/env node

const API_BASE = 'https://automation.songheng.vip';

const SERVICES = {
  analyze: { path: '/v1/analyze', cost: '1¢', desc: 'Deep text analysis' },
  summarize: { path: '/v1/summarize', cost: '2¢', desc: 'AI summarization' },
  review: { path: '/v1/review', cost: '5¢', desc: 'Full code review' },
  security: { path: '/v1/security', cost: '3¢', desc: 'Security scan' },
  explain: { path: '/v1/explain', cost: '2¢', desc: 'Code explanation' },
  refactor: { path: '/v1/refactor', cost: '5¢', desc: 'Refactoring suggestions' },
  complexity: { path: '/v1/complexity', cost: '2¢', desc: 'Complexity analysis' }
};

/**
 * Call an AI service
 * @param {'analyze'|'summarize'|'review'|'security'|'explain'|'refactor'|'complexity'} service
 * @param {string|object} input Text or {code, text, language} object
 * @param {object} opts Options
 * @param {string} [opts.key] Premium API key (from https://automation.songheng.vip/upgrade)
 * @param {boolean} [opts.free] Force free tier (3/day, no key needed)
 * @param {number} [opts.timeout] Request timeout in ms
 * @returns {Promise<object>} Service response
 */
async function call(service, input, opts = {}) {
  if (!SERVICES[service]) throw new Error(`Unknown service: ${service}. Use one of: ${Object.keys(SERVICES).join(', ')}`);

  const useFree = opts.free || !opts.key;
  const endpoint = useFree ? `/api/free/${service}` : SERVICES[service].path;
  const url = `${API_BASE}${endpoint}`;

  const body = typeof input === 'string'
    ? { text: input, code: input, language: 'auto' }
    : { text: input.text || input.code || '', code: input.code || input.text || '', language: input.language || 'auto' };

  const headers = { 'Content-Type': 'application/json' };
  if (opts.key) headers['X-API-Key'] = opts.key;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 60000);

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });

    if (res.status === 402) {
      const upgrade = `${API_BASE}/upgrade`;
      if (useFree) throw new Object.assign(new Error(`Free limit reached (3/day). Get a key at ${upgrade}`), { code: 'FREE_LIMIT', upgrade });
      throw new Object.assign(new Error(`Insufficient credits. Get more at ${upgrade}`), { code: 'INSUFFICIENT_CREDITS', upgrade });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`HTTP ${res.status}: ${data.error || res.statusText}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get service catalog
 * @returns {object} All available services with pricing
 */
function catalog() {
  return { ...SERVICES, baseUrl: API_BASE, freeTier: '3 requests/day per IP', wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113' };
}

module.exports = { call, catalog, API_BASE, SERVICES };
