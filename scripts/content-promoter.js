#!/usr/bin/env node
/**
 * Content Promoter — Distributes my-automaton services across platforms
 * Uses DeepSeek to generate platform-optimized promotional posts
 * Run manually or via heartbeat schedule
 */
"use strict";

const https = require('https');

const SITE_URL = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Service catalog for promotion
const SERVICES = [
  { name: 'AI Code Review', url: '/v1/review', cost: '5¢', tag: '#CodeReview #AI' },
  { name: 'Security Scan', url: '/v1/security', cost: '3¢', tag: '#Security #DevSecOps' },
  { name: 'Text Analysis', url: '/v1/analyze', cost: '1¢', tag: '#NLP #AI' },
  { name: 'SEO Content Optimizer', url: '/seo-optimizer', cost: 'Free', tag: '#SEO #ContentMarketing' },
  { name: 'Sitemap Generator', url: '/tools/sitemap-generator', cost: 'Free', tag: '#SEO #WebDev' },
  { name: 'AI Summarization', url: '/v1/summarize', cost: '2¢', tag: '#Productivity #AI' }
];

// Platform posting formats
const PLATFORMS = {
  twitter: { maxLen: 280, style: 'concise, engaging, use line breaks' },
  linkedin: { maxLen: 3000, style: 'professional, insightful, value-focused' },
  devto: { maxLen: 5000, style: 'technical, detailed, tutorial-style' },
  hackernews: { maxLen: 2000, style: 'show-don\'t-tell, demonstrate value' }
};

// Generate a promotional post via DeepSeek
function generatePost(platform, service) {
  return new Promise((resolve, reject) => {
    const prompt = `Write a ${PLATFORMS[platform].style} post for ${platform} promoting an AI service:
Service: ${service.name} (${service.cost})
URL: ${SITE_URL}${service.url}
Tags: ${service.tag}

Requirements:
- Max ${PLATFORMS[platform].maxLen} characters
- Mention the service helps developers/creators
- Include the URL
- ${platform === 'twitter' ? 'Use hashtags sparingly (max 2)' : 'Include 3-5 relevant hashtags'}
- Sound authentic, not spammy
- Mention payment info: USDC on Base chain, wallet ${WALLET.slice(0,10)}...${WALLET.slice(-4)}

Write the post content only, no explanations.`;

    const data = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: 'You are a marketing assistant for an autonomous AI agent that sells API services via x402 micropayments. Write compelling, authentic promotional content.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    const req = https.request({
      hostname: process.env.DEEPSEEK_HOST || 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.DEEPSEEK_API_KEY || '')
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content.trim());
          } else {
            reject(new Error('No choices in response: ' + body.slice(0,200)));
          }
        } catch(e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Generate all promotional content and save to files
async function generateAll() {
  console.log('=== Content Promoter ===');
  console.log('Generating promotional content for ' + SERVICES.length + ' services x ' + Object.keys(PLATFORMS).length + ' platforms\n');
  
  const fs = require('fs');
  const dir = '/root/automaton/content/promotional';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let output = '# Promotional Content Generator\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Site: ${SITE_URL}\n`;
  output += `Wallet: ${WALLET}\n\n`;
  
  for (const service of SERVICES) {
    output += `## ${service.name}\n\n`;
    for (const [platform, config] of Object.entries(PLATFORMS)) {
      try {
        console.log(`Generating ${platform} post for ${service.name}...`);
        const post = await generatePost(platform, service);
        output += `### ${platform.toUpperCase()} (max ${config.maxLen} chars)\n\n${post}\n\n---\n\n`;
        console.log(`  ✅ ${post.length} chars`);
      } catch(e) {
        output += `### ${platform.toUpperCase()}\n\n*Failed: ${e.message}*\n\n---\n\n`;
        console.log(`  ❌ ${e.message}`);
      }
    }
  }
  
  // Save all content
  const filePath = dir + '/generated-content.md';
  fs.writeFileSync(filePath, output);
  console.log(`\nSaved to ${filePath}`);
  
  // Also generate a shorter version for immediate sharing
  const quickShare = SERVICES.map(s => `🔹 ${s.name} ${s.cost} → ${SITE_URL}${s.url}`).join('\n');
  fs.writeFileSync(dir + '/quick-share.md', 
    `# Quick Share Links\n${SITE_URL}\n${WALLET}\n\n${quickShare}\n\n---\nPay with USDC on Base. No signup needed.`);
  
  console.log('Done!');
}

generateAll().catch(e => console.error('Fatal:', e.message));
