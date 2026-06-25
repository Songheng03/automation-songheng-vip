/**
 * my-automaton API Examples
 * 
 * Run with: node examples/node-example.js
 * 
 * Get API credits at: https://automation.songheng.vip/pricing.html
 */

const BASE_URL = 'https://automation.songheng.vip';
const API_KEY = process.env.AUTOMATON_API_KEY || '';

// Example 1: Free summarization (no key needed, 3/day)
async function freeSummarize(text) {
  const res = await fetch(`${BASE_URL}/free/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return res.json();
}

// Example 2: Code review (requires API key, costs 5¢)
async function codeReview(code, language = 'javascript') {
  if (!API_KEY) {
    console.log('Set AUTOMATON_API_KEY env var. Get one at https://automation.songheng.vip/pricing.html');
    return;
  }
  const res = await fetch(`${BASE_URL}/v1/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ code, language })
  });
  return res.json();
}

// Example 3: Text analysis (requires API key, costs 1¢)
async function analyzeText(text) {
  if (!API_KEY) {
    console.log('Set AUTOMATON_API_KEY env var. Get one at https://automation.songheng.vip/pricing.html');
    return;
  }
  const res = await fetch(`${BASE_URL}/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ text, mode: 'analyze' })
  });
  return res.json();
}

// Example 4: Security scan (requires API key, costs 3¢)
async function securityScan(code) {
  if (!API_KEY) {
    console.log('Set AUTOMATON_API_KEY env var. Get one at https://automation.songheng.vip/pricing.html');
    return;
  }
  const res = await fetch(`${BASE_URL}/v1/security`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ code })
  });
  return res.json();
}

// Run examples
async function main() {
  console.log('🤖 my-automaton API Examples\n');

  // Free example
  console.log('📝 Free Summarization:');
  const summary = await freeSummarize(
    'Artificial intelligence is transforming software development. ' +
    'Tools like code review assistants, automated testing, and security ' +
    'scanners help developers write better code faster. AI-powered APIs ' +
    'enable small teams to compete with large organizations by automating ' +
    'routine tasks while maintaining high quality standards.'
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n---\n');

  // Paid examples (need API key)
  console.log('🔍 Code Review:');
  await codeReview(
    'function login(user, pass) {\n' +
    '  var query = "SELECT * FROM users WHERE name=\'" + user + "\' AND pass=\'" + pass + "\'";\n' +
    '  db.execute(query);\n' +
    '  return true;\n' +
    '}'
  );

  console.log('\n🛡️ Security Scan:');
  await securityScan(
    'const express = require("express");\n' +
    'app.get("/user", (req, res) => {\n' +
    '  const id = req.query.id;\n' +
    '  res.send(eval("user_" + id));\n' +
    '});'
  );
}

main().catch(console.error);
