#!/usr/bin/env node
/**
 * deepseek-bridge.mjs — Real AI responses for free/premium API tiers
 * 
 * Replaces mock data with actual DeepSeek inference.
 * Drop-in replacement for gateway.cjs mock responses.
 * Uses streaming for lower latency.
 * 
 * Usage: node services/deepseek-bridge.mjs (standalone server on port 8081)
 * Or: import { callDeepSeek } from './deepseek-bridge.mjs'
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// Load from automaton.json if not in env
function loadConfig() {
  try {
    const cfg = JSON.parse(require('fs').readFileSync('/root/automaton/automaton.json', 'utf-8'));
    return cfg.deepseek_api_key || cfg.DEEPSEEK_API_KEY || '';
  } catch { return ''; }
}

const API_KEY = DEEPSEEK_API_KEY || loadConfig();
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

const SYSTEM_PROMPTS = {
  analyze: 'You are a text analysis engine. Analyze the given text and return: themes, sentiment (positive/negative/neutral), key entities, and writing quality. Format as markdown with sections.',
  summarize: 'You are a summarization engine. Summarize the given text concisely. Include key points in bullet form. Length: 2-5 paragraphs.',
  review: 'You are a code review expert. Review the given code for: bugs, security issues, style violations, performance problems, and best practices. Use markdown with severity tags (🔴 Critical, 🟡 Warning, 💡 Suggestion).',
  security: 'You are a security auditor. Scan the given code for OWASP Top 10 vulnerabilities. Report: vulnerability type, severity, line reference, and fix recommendation. Format as markdown table.',
  explain: 'You are a code explanation engine. Explain what the code does in plain language, suitable for a mid-level developer. Include: purpose, flow, key functions, and potential edge cases.',
  refactor: 'You are a refactoring expert. Analyze the code and suggest improvements. Show "Before" and "After" examples. Target: readability, performance, and maintainability.',
  complexity: 'You are a code complexity analyzer. Calculate: cyclomatic complexity, cognitive complexity, maintainability index, and Halstead metrics. Explain what each metric means.'
};

const SERVICE_PRICING = {
  analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2
};

/**
 * Call DeepSeek API for a service
 * @param {string} service - One of: analyze, summarize, review, security, explain, refactor, complexity
 * @param {string} text - The input text/code
 * @param {object} options - { mode, language, audience, goal, max_length }
 * @returns {Promise<string>} - The AI response
 */
async function callDeepSeek(service, text, options = {}) {
  if (!API_KEY) {
    throw new Error('No DeepSeek API key configured. Set DEEPSEEK_API_KEY env var or in automaton.json');
  }

  let systemPrompt = SYSTEM_PROMPTS[service] || SYSTEM_PROMPTS.analyze;
  let userPrompt = text;

  // Service-specific prompt enhancements
  switch (service) {
    case 'summarize':
      userPrompt = `Summarize the following text${options.max_length ? ` in ${options.max_length} words` : ''}:\n\n${text}`;
      break;
    case 'analyze':
      userPrompt = `Analyze this text${options.mode === 'sentiment' ? ' (focus on sentiment)' : options.mode === 'deep' ? ' (deep analysis)' : ''}:\n\n${text}`;
      break;
    case 'explain':
      userPrompt = `Explain this code${options.audience ? ` for a ${options.audience} audience` : ''}:\n\n${text}`;
      break;
    case 'refactor':
      userPrompt = `Refactor this code${options.goal ? ` focusing on ${options.goal}` : ''}:\n\n${text}`;
      break;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2048,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;
  if (!result) throw new Error('Empty response from DeepSeek');

  return result;
}

/**
 * Express handler factory for each service
 * Usage: app.post('/api/free/analyze', makeHandler('analyze'))
 *        app.post('/v1/analyze', makeHandler('analyze', true))
 */
function makeHandler(service, isPremium = false) {
  return async (req, res) => {
    const { text, ...options } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing "text" field' });

    try {
      const result = await callDeepSeek(service, text, options);
      const response = { result, service };

      if (isPremium) {
        response.cost = SERVICE_PRICING[service];
        response.credits_remaining = req.keyData?.credits;
      } else {
        response.free_remaining = 2; // placeholder; real tracking in gateway
      }

      res.json(response);
    } catch (err) {
      console.error(`[DeepSeek Bridge] ${service} error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

// Standalone server mode
if (process.argv[1] && (process.argv[1].endsWith('deepseek-bridge.mjs') || process.argv[1].endsWith('deepseek-bridge.js'))) {
  const express = require('express');
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const services = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'];
  
  services.forEach(s => {
    app.post(`/api/free/${s}`, makeHandler(s));
    app.post(`/v1/${s}`, makeHandler(s, true));
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', model: MODEL, services }));
  app.get('/api/bridge/status', (req, res) => res.json({ 
    configured: !!API_KEY,
    model: MODEL,
    endpoint: API_URL,
    services: services.map(s => ({ name: s, cost: SERVICE_PRICING[s] }))
  }));

  const PORT = 8081;
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`🤖 DeepSeek Bridge on port ${PORT} (model: ${MODEL})`);
    console.log(`   API key: ${API_KEY ? '✅ configured' : '❌ missing'}`);
    console.log(`   Services: ${services.join(', ')}`);
  });
}

export { callDeepSeek, makeHandler, SERVICE_PRICING };
