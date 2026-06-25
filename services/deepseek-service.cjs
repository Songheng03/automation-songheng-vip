/* deepseek-service.cjs - Shared DeepSeek AI handler with caching, rate limiting, error handling */
/* Loaded by gateway.cjs via require() */
/* Free tier: 3 req/day/IP. Premium: API key based credit system */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.resolve(__dirname, '..', 'automaton.json');

// Rate limit state
const freeLimits = new Map();  // IP -> { date, counts: { service: count } }
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;  // 5 min

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { deepseek_key: process.env.DEEPSEEK_KEY || '', model: 'deepseek-v4-flash' };
  }
}

// Check free tier limit
function checkFreeLimit(ip, service) {
  const today = new Date().toISOString().slice(0, 10);
  if (!freeLimits.has(ip)) freeLimits.set(ip, { date: today, counts: {} });
  const entry = freeLimits.get(ip);
  if (entry.date !== today) {
    entry.date = today;
    entry.counts = {};
  }
  entry.counts[service] = (entry.counts[service] || 0) + 1;
  return entry.counts[service] <= 3;
}

function getFreeRemaining(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (!freeLimits.has(ip)) return 3;
  const entry = freeLimits.get(ip);
  if (entry.date !== today) return 3;
  const used = Object.values(entry.counts).reduce((a, b) => a + b, 0);
  return Math.max(0, 3 - used);
}

// Call DeepSeek API with system prompt
function callDeepSeek(systemPrompt, userMessage, configOverride) {
  return new Promise((resolve, reject) => {
    const config = configOverride || loadConfig();
    const apiKey = config.deepseek_key || process.env.DEEPSEEK_KEY;
    
    if (!apiKey) {
      return resolve({ success: false, error: 'DeepSeek API key not configured', result: '⚠️ AI service not configured. Please set DEEPSEEK_KEY in automaton.json' });
    }

    // Check cache
    const cacheKey = `${systemPrompt}|${userMessage}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return resolve(cached.data);
    }

    const model = configOverride?.model || config.model || 'deepseek-chat';
    const data = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: configOverride?.max_tokens || 2048,
      temperature: configOverride?.temperature || 0.3,
      stream: false
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            return resolve({ success: false, error: json.error.message, result: `Error: ${json.error.message}` });
          }
          if (!json.choices || !json.choices[0]) {
            return resolve({ success: false, error: 'No response from AI', result: 'No response generated.' });
          }
          const result = json.choices[0].message.content;
          const usage = json.usage || {};
          const response = { success: true, result, usage };
          
          // Cache
          if (result && result.length > 20) {
            CACHE.set(cacheKey, { data: response, timestamp: Date.now() });
            if (CACHE.size > 500) {
              const firstKey = CACHE.keys().next().value;
              CACHE.delete(firstKey);
            }
          }
          
          resolve(response);
        } catch (e) {
          resolve({ success: false, error: 'Parse error: ' + e.message, result: body.slice(0, 200) });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message, result: `Connection error: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout', result: 'Request timed out after 30s' }); });
    req.write(data);
    req.end();
  });
}

const SYSTEM_PROMPTS = {
  analyze: "You are a professional text analyst. Analyze the given text deeply: extract sentiment (positive/negative/neutral), key entities (people, organizations, concepts), main themes, and overall tone. Format clearly with bullet points.",
  summarize: "You are a professional summarizer. Summarize the text in 3-5 sentences covering the most important points. Include a bullet list of key takeaways.",
  review: "You are a senior code reviewer. Review the code for: 1) bugs and logic errors 2) security vulnerabilities 3) performance issues 4) style and best practices 5) potential improvements. Rate issues by severity (CRITICAL/HIGH/MEDIUM/LOW).",
  security: "You are a security engineer. Scan this code for OWASP Top 10 vulnerabilities: SQL injection, XSS, CSRF, broken authentication, mass assignment, sensitive data exposure, command injection, path traversal, insecure deserialization, SSRF. For each finding, state severity and fix recommendation.",
  explain: "You are a patient programming mentor. Explain this code in plain English, assuming the reader is a junior developer. Break down what each part does and why.",
  refactor: "You are a senior software architect. Analyze this code and suggest refactoring improvements. Focus on: readability, maintainability, performance, design patterns. Show before/after examples.",
  complexity: "You are a computer science professor. Analyze this code's time and space complexity. Explain your reasoning step by step. Consider best, average, and worst cases."
};

function getSystemPrompt(service) {
  return SYSTEM_PROMPTS[service] || SYSTEM_PROMPTS.analyze;
}

// Handle API request (used by gateway routes)
async function handleRequest(service, userInput, options = {}) {
  const ip = options.ip || 'unknown';
  const isFree = options.free !== false;
  const apiKey = options.apiKey;

  // For free requests, check rate limit
  if (isFree && !apiKey) {
    if (!checkFreeLimit(ip, service)) {
      return {
        success: false,
        error: 'Free daily limit reached (3/day). Get an API key at /upgrade',
        result: '❌ Free limit reached. You\'ve used all 3 free requests for today. Get premium access: https://automation.songheng.vip/upgrade',
        remaining: 0
      };
    }
  }

  const systemPrompt = getSystemPrompt(service);
  const result = await callDeepSeek(systemPrompt, userInput, options.configOverride);
  
  if (isFree && !apiKey) {
    result.remaining = getFreeRemaining(ip);
  }

  return result;
}

// Health check - verify DeepSeek key is real
async function verifyKey() {
  const config = loadConfig();
  if (!config.deepseek_key) return { configured: false, message: 'No API key set' };
  // Quick validation - key format
  const validFormat = config.deepseek_key.startsWith('sk-') && config.deepseek_key.length > 20;
  return { configured: true, validFormat, message: validFormat ? 'Key format valid' : 'Key format suspicious' };
}

module.exports = { callDeepSeek, handleRequest, verifyKey, getSystemPrompt, checkFreeLimit, getFreeRemaining, SYSTEM_PROMPTS };
