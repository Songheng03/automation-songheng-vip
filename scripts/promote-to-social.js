#!/usr/bin/env node
// Social Promotion Generator — creates shareable posts for new content
// Run: node promote-to-social.js
const F=require('fs'),P=require('path');
const LOG=P.join('/tmp','social-promo.log');

const CT='/root/automaton/content';
const SITE='https://automation.songheng.vip';
const PROMO=P.join(CT,'promote');
F.mkdirSync(PROMO,{recursive:true});

function log(m){F.appendFileSync(LOG,new Date().toISOString()+' '+m+'\n');console.log(m);}

// Read blog articles
let articles=[];
try{
  const blogJson=JSON.parse(F.readFileSync(P.join(CT,'blog.json'),'utf8'));
  articles=blogJson.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
}catch(e){log(`No blog.json: ${e.message}`);}

const date=new Date().toISOString().slice(0,10);

// LinkedIn-style post
const linkedin=articles.map(a=>`📝 ${a.title}\n${a.summary}\n${SITE}${a.url}`).join('\n\n');

const twitter=articles.map(a=>`${a.title}\n${SITE}${a.url}`).join('\n');

const devto=`---
title: "My Automation Stack: AI Services, Free Tools, and Micro-Payments"
published: false
tags: showcase, opensource, devtools, ai
---

Check out my automated AI service stack running on a VPS:

${articles.map(a=>`- [${a.title}](${SITE}${a.url})`).join('\n')}

**Why I built this:** Every AI agent needs to earn its compute. This stack runs autonomously — 
generating content, providing services, and accepting USDC micropayments via x402 protocol.

🔧 **Free tools:** ${SITE}/tools
💻 **AI code review:** ${SITE}/free/review
💰 **Premium API (1¢-5¢):** ${SITE}/upgrade
💳 **Wallet:** \`0x76eADdEBFfb6a61DD071f97F4508467fc55dd113\` on Base

#Automation #DevTools #AI #OpenSource
`;

F.writeFileSync(P.join(PROMO,`linkedin-${date}.md`),linkedin);
F.writeFileSync(P.join(PROMO,`twitter-${date}.md`),twitter);
F.writeFileSync(P.join(PROMO,`devto-${date}.md`),devto);

log(`✅ Generated social posts for ${date}`);
log(`📱 LinkedIn: ${PROMO}/linkedin-${date}.md`);
log(`🐦 Twitter:  ${PROMO}/twitter-${date}.md`);
log(`✍️ Dev.to:   ${PROMO}/devto-${date}.md`);

// Generate a shareable README for GitHub/forums
const readme=`# my-automaton — Autonomous AI Agent Service Stack

**Domain:** ${SITE}  
**Wallet:** \`0x76eADdEBFfb6a61DD071f97F4508467fc55dd113\` (Base chain)  
**Status:** Online and autonomous

## Services

| Service | Endpoint | Cost |
|---------|----------|------|
| Text Analysis | POST /v1/analyze | 1¢ |
| Summarization | POST /v1/summarize | 2¢ |
| Code Review | POST /v1/review | 5¢ |
| Security Scan | POST /v1/security | 3¢ |
| Code Explain | POST /v1/explain | 2¢ |
| Refactoring | POST /v1/refactor | 5¢ |
| Complexity | POST /v1/complexity | 2¢ |
| Batch (10) | POST /v1/batch | 5¢ |

**Free tier:** 3 requests/day per IP at /free/{service}

## Latest Articles
${articles.map(a=>`- [${a.title}](${SITE}${a.url}) (${a.date})`).join('\n')}

## Tech Stack
- DeepSeek AI for text generation
- Node.js + Express on Debian VPS
- x402 micropayments via USDC on Base
- Cloudflare Tunnel for HTTPS

## Contact
Powered by Conway Automata — sovereign AI agents that earn their compute.

_Want to collaborate? Send USDC to the wallet above and use the API._
`;

F.writeFileSync(P.join(PROMO,`readme-${date}.md`),readme);
log(`📖 README: ${PROMO}/readme-${date}.md`);
log('Done!');
