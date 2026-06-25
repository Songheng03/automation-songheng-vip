/**
 * my-automaton-api — Client library for my-automaton's AI services
 * 
 * Services: code review, security scanning, text analysis, summarization
 * Payment: Pay-per-use via Stripe (no subscriptions)
 * 
 * Quick start:
 *   const Automaton = require('my-automaton-api');
 *   const client = new Automaton({ apiKey: 'am_xxx' });
 *   const result = await client.analyze('Your text here');
 * 
 * Free tier (3 req/day/IP, no key needed):
 *   const result = await Automaton.free('/api/free/analyze', { text: '...' });
 */

const BASE_URL = 'https://automation.songheng.vip';

class AutomatonError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'AutomatonError';
    this.status = status;
    this.code = code;
  }
}

class Automaton {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.AUTOMATON_API_KEY;
    this.baseUrl = options.baseUrl || BASE_URL;
    this.fetch = options.fetch || (typeof window !== 'undefined' ? window.fetch : null);

    if (!this.fetch) {
      try {
        this.fetch = require('node-fetch');
      } catch (e) {
        throw new Error('No fetch implementation available. Install node-fetch for Node.js or use in browser.');
      }
    }

    if (!this.apiKey) {
      console.warn('No API key provided. Set AUTOMATON_API_KEY env var or pass apiKey option.');
    }
  }

  async _request(endpoint, data, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    try {
      const res = await this.fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (res.status === 402) {
        const payment = await res.json();
        throw new AutomatonError(
          `Insufficient credits. Purchase at ${this.baseUrl}`,
          402,
          'INSUFFICIENT_CREDITS'
        );
      }

      if (res.status === 429) {
        throw new AutomatonError('Rate limited. Free tier: 3 req/day/IP.', 429, 'RATE_LIMITED');
      }

      if (!res.ok) {
        const err = await res.text();
        throw new AutomatonError(`API error: ${err}`, res.status, 'API_ERROR');
      }

      return await res.json();
    } catch (err) {
      if (err instanceof AutomatonError) throw err;
      throw new AutomatonError(`Network error: ${err.message}`, 0, 'NETWORK_ERROR');
    }
  }

  /** Deep text analysis — sentiment, topics, key phrases */
  async analyze(text, mode = 'analyze') {
    return this._request('/v1/analyze', { text, mode });
  }

  /** AI summarization — concise or detailed */
  async summarize(text, style = 'concise') {
    return this._request('/v1/summarize', { text, style });
  }

  /** Full code review — bugs, style, performance issues */
  async review(code, language = 'auto') {
    return this._request('/v1/review', { code, language });
  }

  /** Security vulnerability scan */
  async security(code, language = 'auto') {
    return this._request('/v1/security', { code, language });
  }

  /** Code explanation — what does this code do? */
  async explain(code, language = 'auto') {
    return this._request('/v1/explain', { code, language });
  }

  /** Refactoring suggestions */
  async refactor(code, language = 'auto') {
    return this._request('/v1/refactor', { code, language });
  }

  /** Complexity analysis */
  async complexity(code, language = 'auto') {
    return this._request('/v1/complexity', { code, language });
  }

  /** Free tier — no API key needed, 3 req/day/IP */
  static async free(endpoint, data) {
    const fetch = typeof window !== 'undefined' ? window.fetch : require('node-fetch');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Free tier error: ${res.status}`);
    return res.json();
  }

  /** Pricing info */
  static get pricing() {
    return {
      analyze: { credits: 1, usd: '$0.005' },
      summarize: { credits: 2, usd: '$0.01' },
      review: { credits: 5, usd: '$0.025' },
      security: { credits: 3, usd: '$0.015' },
      explain: { credits: 2, usd: '$0.01' },
      refactor: { credits: 5, usd: '$0.025' },
      complexity: { credits: 2, usd: '$0.01' }
    };
  }
}

module.exports = Automaton;
module.exports.AutomatonError = AutomatonError;
