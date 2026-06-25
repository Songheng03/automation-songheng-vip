/**
 * my-automaton JavaScript SDK
 * 
 * Usage:
 *   import Automaton from './sdk.js';
 *   const client = new Automaton({ apiKey: 'am_xxx' });
 *   const result = await client.analyze('Your text here');
 *   const review = await client.codeReview('function hello() { ... }');
 * 
 * Free tier (no API key):
 *   const client = new Automaton(); // 3 free requests/day/IP
 *   const result = await client.analyze('Your text');
 */

const BASE_URL = 'https://automation.songheng.vip';
// const BASE_URL = 'http://localhost:8080'; // For local development

const ENDPOINTS = {
  analyze:     { path: '/v1/analyze',    cost: 1 },
  summarize:   { path: '/v1/summarize',  cost: 2 },
  codeReview:  { path: '/v1/review',     cost: 5 },
  securityScan:{ path: '/v1/security',   cost: 3 },
  explain:     { path: '/v1/explain',    cost: 2 },
  refactor:    { path: '/v1/refactor',   cost: 5 },
  complexity:  { path: '/v1/complexity', cost: 2 },
};

class AutomatonError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'AutomatonError';
    this.status = status;
    this.code = code;
  }
}

export default class Automaton {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.baseUrl = options.baseUrl || BASE_URL;
    this.timeout = options.timeout || 30000;
  }

  async _request(endpoint, data) {
    const url = `${this.baseUrl}${endpoint.path}`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (res.status === 402) {
        throw new AutomatonError(
          'Insufficient credits. Purchase more at https://automation.songheng.vip/pricing.html',
          402,
          'INSUFFICIENT_CREDITS'
        );
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || 30;
        throw new AutomatonError(
          `Rate limited. Retry after ${retryAfter}s`,
          429,
          'RATE_LIMITED'
        );
      }

      if (res.status === 403) {
        throw new AutomatonError(
          'Invalid or expired API key. Get one at https://automation.songheng.vip/pricing.html',
          403,
          'INVALID_KEY'
        );
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AutomatonError(
          `HTTP ${res.status}: ${body}`,
          res.status,
          'API_ERROR'
        );
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AutomatonError('Request timed out', 0, 'TIMEOUT');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- Text Services ---

  analyze(text, mode = 'analyze') {
    return this._request(ENDPOINTS.analyze, { text, mode });
  }

  summarize(text, maxLength = 200) {
    return this._request(ENDPOINTS.summarize, { text, max_length: maxLength });
  }

  // --- Code Services ---

  codeReview(code, language = null) {
    const body = { code };
    if (language) body.language = language;
    return this._request(ENDPOINTS.codeReview, body);
  }

  securityScan(code, language = null) {
    const body = { code };
    if (language) body.language = language;
    return this._request(ENDPOINTS.securityScan, body);
  }

  explain(code, language = null) {
    const body = { code };
    if (language) body.language = language;
    return this._request(ENDPOINTS.explain, body);
  }

  refactor(code, language = null) {
    const body = { code };
    if (language) body.language = language;
    return this._request(ENDPOINTS.refactor, body);
  }

  complexity(code, language = null) {
    const body = { code };
    if (language) body.language = language;
    return this._request(ENDPOINTS.complexity, body);
  }

  // --- Batch ---

  batch(texts, mode = 'analyze') {
    return this._request(ENDPOINTS.analyze, { texts, mode, batch: true });
  }
}

// Node.js support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Automaton;
}

// Browser globals
if (typeof window !== 'undefined') {
  window.Automaton = Automaton;
}
