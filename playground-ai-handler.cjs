#!/usr/bin/env node
// playground-ai-handler.cjs — Free trial + payment AI handler for the playground
// Integrates with gateway-server.cjs via require()
// Handles POST /playground/:service with free trial gating and payment conversion

const fs = require('fs');
const path = require('path');

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const DEEPSEEK_KEY = process.env.OPENAI_API_KEY || '';

// Trial tracking: IP -> { date, count }
const TRIALS_DIR = path.join(__dirname, 'data');
const TRIALS_FILE = path.join(TRIALS_DIR, 'trial_tracking.json');
const TRIAL_LIMIT = 3;

let trialData = {};
try {
  if (fs.existsSync(TRIALS_FILE)) {
    trialData = JSON.parse(fs.readFileSync(TRIALS_FILE, 'utf8'));
  }
} catch(e) { trialData = {}; }

function saveTrials() {
  try {
    if (!fs.existsSync(TRIALS_DIR)) fs.mkdirSync(TRIALS_DIR, { recursive: true });
    fs.writeFileSync(TRIALS_FILE, JSON.stringify(trialData));
  } catch(e) {}
}

// Clean old entries daily
function cleanTrials() {
  const today = new Date().toDateString();
  for (const ip of Object.keys(trialData)) {
    if (trialData[ip].date !== today) {
      delete trialData[ip];
    }
  }
}
cleanTrials();

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket?.remoteAddress || 
         'unknown';
}

function checkFreeTrial(req) {
  const ip = getClientIP(req);
  const today = new Date().toDateString();
  
  if (!trialData[ip] || trialData[ip].date !== today) {
    trialData[ip] = { date: today, count: 0 };
  }
  
  const remaining = Math.max(0, TRIAL_LIMIT - trialData[ip].count);
  return { ip, remaining, count: trialData[ip].count, isFree: remaining > 0 };
}

function useFreeTrial(req) {
  const { ip } = checkFreeTrial(req);
  const today = new Date().toDateString();
  
  if (!trialData[ip] || trialData[ip].date !== today) {
    trialData[ip] = { date: today, count: 0 };
  }
  
  trialData[ip].count = (trialData[ip].count || 0) + 1;
  saveTrials();
  
  return {
    free_trials_used: trialData[ip].count,
    free_trials_remaining: Math.max(0, TRIAL_LIMIT - trialData[ip].count),
    free_trial: true
  };
}

// Service-specific prompts
const SERVICE_PROMPTS = {
  analyze: { system: 'You are a precise text analysis engine. Analyze the given text deeply: identify key themes, sentiment, structure, tone, and notable patterns. Provide structured analysis with clear sections.', temp: 0.3 },
  summarize: { system: 'You are a summarization engine. Summarize the input text concisely while preserving key information, main arguments, and conclusions. Use bullet points for clarity.', temp: 0.3 },
  review: { system: 'You are an expert code reviewer. Analyze the code for: code quality, bugs, security issues, performance problems, style violations, and architectural concerns. Provide specific, actionable feedback with line references.', temp: 0.2 },
  security: { system: 'You are a security scanning engine. Analyze for: injection vulnerabilities, authentication issues, data exposure, misconfigurations, dependency risks, and OWASP Top 10 concerns. Rate severity (CRITICAL/HIGH/MEDIUM/LOW) for each finding.', temp: 0.2 },
  explain: { system: 'You are a code explanation engine. Explain the code clearly: what it does, how it works, key concepts used, and any non-obvious patterns. Use simple language.', temp: 0.3 },
  refactor: { system: 'You are a refactoring expert. Suggest concrete improvements: better patterns, cleaner architecture, performance optimizations, readability improvements. Show before/after code examples.', temp: 0.3 },
  complexity: { system: 'You are a complexity analysis engine. Analyze: cyclomatic complexity, cognitive complexity, maintainability index, coupling, and potential bottlenecks. Provide a complexity score (1-10) and specific recommendations.', temp: 0.2 },
  chat: { system: 'You are my-automaton, a helpful AI assistant. Be concise, accurate, and helpful.', temp: 0.7 }
};

async function doInference(service, text, mode = 'auto') {
  if (!DEEPSEEK_KEY) return { error: 'inference_not_configured', message: 'Server not configured for AI inference' };
  
  const config = SERVICE_PROMPTS[service] || SERVICE_PROMPTS.chat;
  let prompt = text;
  
  if (service !== 'chat') {
    prompt = `Process the following ${service === 'analyze' ? 'text' : service} request:\n\n${text}\n\nProvide thorough, structured output.`;
  }
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: config.system },
        { role: 'user', content: String(prompt).substring(0, 8000) }
      ],
      max_tokens: 2500,
      temperature: config.temp
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    return { error: `inference_failed_${response.status}`, detail: errText };
  }
  
  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || '';
  
  if (mode === 'raw') {
    return { result, usage: data.usage, model: 'deepseek-chat' };
  }
  
  return { result, usage: data.usage, model: 'deepseek-chat' };
}

// Request handler factory — returns a function that the gateway can call
function createPlaygroundHandler() {
  return async function handlePlaygroundRequest(req, res, parsedUrl) {
    // Only handle POST /playground/:service
    const pathname = parsedUrl.pathname;
    const match = pathname.match(/^\/playground\/(analyze|summarize|review|security|explain|refactor|complexity|chat)$/);
    
    if (!match) {
      return { handled: false };
    }
    
    const service = match[1];
    
    // Parse body
    let body = '';
    await new Promise(resolve => {
      req.on('data', c => body += c);
      req.on('end', resolve);
    });
    
    let input;
    try { input = JSON.parse(body || '{}'); } catch(e) { input = {}; }
    
    const text = input.text || input.message || '';
    const mode = input.mode || 'auto';
    
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'no_input', message: 'Please provide text or code to process.' }));
      return { handled: true };
    }
    
    // Check if payment header present
    const paymentTx = req.headers['x-x402-payment'];
    
    if (paymentTx) {
      // Paid request — verify payment and process
      try {
        const result = await doInference(service, text, mode);
        if (result.error) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(200, { 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin': '*',
            'X-Payment-Status': 'verified'
          });
          res.end(JSON.stringify({ 
            ...result, 
            paid: true, 
            service,
            wallet: WALLET
          }));
        }
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'inference_error', message: e.message }));
      }
      return { handled: true };
    }
    
    // Check free trial
    const trial = checkFreeTrial(req);
    
    if (!trial.isFree) {
      // Return 402 — payment required
      const costMap = { analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2, chat: 2 };
      const costCents = costMap[service] || 2;
      
      res.writeHead(402, { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'X-Payment-Required': String(costCents),
        'X-Wallet': WALLET,
        'X-Chain': 'base'
      });
      res.end(JSON.stringify({
        error: 'payment_required',
        message: `Free trials exhausted. Send $${(costCents/100).toFixed(2)} USDC to ${WALLET} on Base chain.`,
        cost_cents: costCents,
        wallet: WALLET,
        chain: 'base',
        service,
        free_trials_used: trial.count,
        free_trial_limit: TRIAL_LIMIT
      }));
      return { handled: true };
    }
    
    // Free trial request — process and deduct
    try {
      const result = await doInference(service, text, mode);
      const trialInfo = useFreeTrial(req);
      
      if (result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(200, { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*',
          'X-Free-Trial': 'true'
        });
        res.end(JSON.stringify({ 
          ...result, 
          ...trialInfo,
          service,
          wallet: WALLET
        }));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'inference_error', message: e.message }));
    }
    
    return { handled: true };
  };
}

// Stats endpoint
function getTrialStats() {
  const today = new Date().toDateString();
  let todayUsers = 0;
  let todayTotalRequests = 0;
  
  for (const ip of Object.keys(trialData)) {
    if (trialData[ip].date === today) {
      todayUsers++;
      todayTotalRequests += trialData[ip].count;
    }
  }
  
  return {
    today_users: todayUsers,
    today_total_requests: todayTotalRequests,
    trial_limit_per_ip: TRIAL_LIMIT,
    active_ips: Object.keys(trialData).length
  };
}

module.exports = { createPlaygroundHandler, checkFreeTrial, getTrialStats, WALLET };
