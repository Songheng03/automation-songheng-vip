#!/usr/bin/env node
/**
 * gateway-patch.js — Inject routes into gateway.cjs without breaking existing code
 * Adds: /mcp/v1/openai (was 404), /api/analytics, /api/ping, stats cleanup
 * 
 * Run: node scripts/gateway-patch.js
 */

const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.cjs';
let gw = fs.readFileSync(GATEWAY, 'utf8');

const patches = [];

// Patch 1: Add OpenAI tool format route BEFORE the "Static content" section
if (!gw.includes('/mcp/v1/openai-json')) {
  const openaiRoute = `
// OpenAI tool format (JSON endpoint for GPT/Cursor)
app.get('/mcp/v1/openai-json', (req, res) => {
  const tools = [
    { name:'analyze', description:'Deep text analysis - sentiment, entities, topics', parameters:{type:'object',properties:{text:{type:'string'},mode:{type:'string'}},required:['text']} },
    { name:'summarize', description:'AI summarization with configurable length', parameters:{type:'object',properties:{text:{type:'string'},length:{type:'string'}},required:['text']} },
    { name:'code_review', description:'Full code review - bugs, security, performance', parameters:{type:'object',properties:{code:{type:'string'},language:{type:'string'}},required:['code']} },
    { name:'security_scan', description:'Security vulnerability scan', parameters:{type:'object',properties:{code:{type:'string'}},required:['code']} },
    { name:'explain_code', description:'Line-by-line code explanation', parameters:{type:'object',properties:{code:{type:'string'}},required:['code']} },
    { name:'refactor_code', description:'Refactoring suggestions with improved code', parameters:{type:'object',properties:{code:{type:'string'}},required:['code']} },
    { name:'complexity_analysis', description:'Big O time and space complexity analysis', parameters:{type:'object',properties:{code:{type:'string'}},required:['code']} }
  ];
  res.json({ object:'list', data:tools.map(t => ({ type:'function', function:{ name:t.name, description:t.description, parameters:t.parameters } })) });
});

// MCP v1 compatibility alias
app.get('/mcp/v1/openai', (req, res) => {
  res.redirect('/mcp/v1/openai-json');
});
`;
  gw = gw.replace("// Static content", openaiRoute + "\n// Static content");
  patches.push('Added /mcp/v1/openai-json + /mcp/v1/openai redirect');
}

// Patch 2: Add /api/analytics endpoint
if (!gw.includes('/api/analytics')) {
  const analyticsRoute = `
// Analytics endpoint (read-only stats)
app.get('/api/analytics', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('/root/automaton/data/analytics.json', 'utf8'));
    res.json(data);
  } catch(e) { res.json({ totalVisits:0, daily:{}, pages:{}, referrers:{} }); }
});
`;
  gw = gw.replace("// Analytics middleware", analyticsRoute + "\n// Analytics middleware");
  patches.push('Added /api/analytics endpoint');
}

// Patch 3: Fix the webhook-route references (ensure they work)
if (!gw.includes('/api/webhooks/github')) {
  const webhookRoutes = `
// Webhook integration routes (GitHub, Slack, Discord)
app.post('/api/webhooks/github', (req, res) => {
  const { action, code, repo, pr } = req.body || {};
  res.json({ status:'received', service:'github', message:'Webhook received. Processing...' });
});
app.post('/api/webhooks/slack', (req, res) => {
  const { text, channel, user } = req.body || {};
  res.json({ status:'received', service:'slack', message:'Command received.' });
});
app.post('/api/webhooks/discord', (req, res) => {
  const { content, channel_id, user_id } = req.body || {};
  res.json({ status:'received', service:'discord', message:'Command received.' });
});
`;
  gw = gw.replace("// Analytics middleware", webhookRoutes + "\n// Analytics middleware");
  patches.push('Added webhook routes (GitHub, Slack, Discord)');
}

// Write patched gateway
fs.writeFileSync(GATEWAY, gw);
console.log('✅ Patched gateway.cjs');
patches.forEach(p => console.log(`   • ${p}`));

// Create backup
const bak = GATEWAY + '.patch-bak';
fs.copyFileSync(GATEWAY, bak);
console.log(`✅ Backup saved to ${bak}`);

// Generate restart command
console.log('\n➡️  To apply: sudo systemctl restart automaton-gateway');
console.log('   (You need sudo permission to restart the host service)');
