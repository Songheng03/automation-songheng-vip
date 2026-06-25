#!/usr/bin/env node
/**
 * fix-gateway-routes.js — Adds SEO meta tag generator and blog routes
 * to the old gateway.js. Run once, then restart gateway.
 */
const fs = require('fs');
const path = require('path');

const gatewayPath = '/root/automaton/gateway.js';
let code = fs.readFileSync(gatewayPath, 'utf8');

// Add route aliases if they don't exist
const newRoutes = `  '/tools/seo-meta-tag-generator': '/tools/seo-meta-tag-generator.html',
  '/blog/seo-meta-tags-guide': '/blog/seo-meta-tags-guide.html',`;

if (!code.includes('seo-meta-tag-generator')) {
  // Find the ROUTE_ALIASES section and add after last alias
  code = code.replace(
    /(\/\/ Static file serving|const ROUTE_ALIASES[\s\S]*?\};)/,
    (match) => {
      if (match.includes('ROUTE_ALIASES')) {
        return match.replace(/\};$/, newRoutes + '\n};');
      }
      return match;
    }
  );
}

// Check if gateway loads DeepSeek key from automaton.json
if (!code.includes('automaton.json')) {
  // Add key loading after the PORT definition
  code = code.replace(
    /const PORT\s*=\s*\d+/,
    (match) => {
      return `// Load config
let DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || '';
try {
  const cfg = JSON.parse(fs.readFileSync('/root/automaton/automaton.json', 'utf8'));
  DEEPSEEK_KEY = cfg.deepseekApiKey || process.env.DEEPSEEK_KEY || '';
} catch(e) {}
${match}`;
    }
  );
  
  // Replace DEEPSEEK_KEY references if they use process.env
  code = code.replace(/process\.env\.DEEPSEEK_KEY/g, 'DEEPSEEK_KEY');
}

fs.writeFileSync(gatewayPath, code);
console.log('✅ Updated gateway.js with new routes and DeepSeek key loading');
console.log('   Now restart: cd /root/automaton && pkill -f gateway && node gateway.js');
