#!/usr/bin/env node
// register-all.js — Registers ALL services and static pages into gateway.js
// Run this after adding new services or pages to ensure they're in the gateway

const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.js';
const CONTENT_DIR = '/root/automaton/content';
const SERVICES_DIR = '/root/services';

// Read gateway
let gate = fs.readFileSync(GATEWAY, 'utf8');

// 1. Ensure all /root/services/*.js are require'd and mounted
const services = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));
services.forEach(svc => {
  const name = svc.replace('.js', '');
  const requireStr = `require('${SERVICES_DIR}/${svc}')`;
  const mountLine = `require('${SERVICES_DIR}/${svc}').mount(app);`;
  
  if (!gate.includes(mountLine)) {
    // Add mount before the static content block
    gate = gate.replace(
      '// Static content',
      `${mountLine}\n\n// Static content`
    );
    console.log(`[REGISTER] Added mount for ${svc}`);
  }
});

// 2. Ensure all content/*.html files have static routes
const staticPages = {};
// Find the static route map in gateway.js
const staticMatch = gate.match(/const staticPages\s*=\s*\{([^}]+)\}/s);
if (staticMatch) {
  // Parse existing routes
  const existing = staticMatch[1];
  const existingRoutes = new Set();
  existing.split(',').forEach(pair => {
    const m = pair.match(/'([^']+)'\s*:\s*'([^']+)'/);
    if (m) existingRoutes.add(m[2]);
  });
  
  // Find all HTML files in content
  const htmlFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.html'));
  htmlFiles.forEach(f => {
    if (!existingRoutes.has(f)) {
      const route = '/' + f.replace('.html', '');
      staticPages[route] = f;
    }
  });
  
  if (Object.keys(staticPages).length > 0) {
    const newEntries = Object.entries(staticPages)
      .map(([route, file]) => `  '${route}':'${file}'`)
      .join(',\n');
    gate = gate.replace(
      /(const staticPages\s*=\s*\{)([^}]+)(\})/s,
      `$1$2,\n${newEntries}\n$3`
    );
    console.log(`[REGISTER] Added ${Object.keys(staticPages).length} static routes`);
  }
}

// 3. Ensure service-reloader.js can find our services
if (!gate.includes('service-reloader.js')) {
  gate = gate.replace(
    'require(\'/root/automaton/gateway-helper.js\')',
    `require('/root/automaton/gateway-helper.js')\nconst serviceReloader = require('/root/services/service-reloader.js');\nif (serviceReloader && serviceReloader.mount) { serviceReloader.mount(app); }`
  );
}

fs.writeFileSync(GATEWAY, gate);
console.log('[REGISTER] Gateway updated successfully');
console.log(`[REGISTER] Total services in ${SERVICES_DIR}: ${services.length}`);
console.log(`[REGISTER] Total HTML pages: ${fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.html')).length}`);
