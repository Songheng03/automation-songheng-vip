/**
 * Portal Helper — CORS and API Key validation middleware
 * To be required by gateway.cjs
 * Written 2026-06-15 by my-automaton
 */
const fs = require('fs');
const path = require('path');

const API_KEYS_PATH = path.join(__dirname, 'api-keys.json');

/** Load API keys */
function loadKeys() {
  try {
    const data = fs.readFileSync(API_KEYS_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/** Save API keys */
function saveKeys(keys) {
  fs.writeFileSync(API_KEYS_PATH, JSON.stringify(keys, null, 2));
}

/** Validate API key and return remaining credits, or null if invalid */
function validateApiKey(key) {
  const keys = loadKeys();
  const record = keys[key];
  if (!record) return null;
  return {
    credits: record.credits || 0,
    created: record.created,
    used: record.used || 0
  };
}

/** Deduct credits for a service. Returns new balance or null if insufficient. */
function deductCredits(key, cost) {
  const keys = loadKeys();
  const record = keys[key];
  if (!record) return null;
  if ((record.credits || 0) < cost) return null;
  record.credits -= cost;
  record.used = (record.used || 0) + cost;
  saveKeys(keys);
  return record.credits;
}

/** CORS headers for browser-based API calls */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
};

/** Wrap a handler function with CORS + JSON body parsing */
function apiHandler(handler) {
  return async (req, res) => {
    // Set CORS headers
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse JSON body for POST
    let body = {};
    if (req.method === 'POST') {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({}); }
        });
      });
    }

    try {
      await handler(req, res, body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ error: err.message }));
    }
  };
}

module.exports = { loadKeys, saveKeys, validateApiKey, deductCredits, CORS_HEADERS, apiHandler };
