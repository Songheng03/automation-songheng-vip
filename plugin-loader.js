#!/usr/bin/env node
// Plugin Loader — my-automaton service registry
// Scans /root/services/ for *.js files and loads them
// Each service registers its routes with the gateway

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_DIR = path.join(__dirname, '..', 'services');

const loadedServices = {};

export async function loadServices() {
  const results = { loaded: [], failed: [] };
  
  if (!fs.existsSync(SERVICES_DIR)) {
    fs.mkdirSync(SERVICES_DIR, { recursive: true });
    return results;
  }
  
  const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.test.js'));
  
  for (const file of files) {
    const name = file.replace('.js', '');
    try {
      const servicePath = path.join(SERVICES_DIR, file);
      const mod = await import(servicePath + '?t=' + Date.now());
      loadedServices[name] = mod;
      
      if (mod.default && typeof mod.default.listen === 'function') {
        // Service has its own server — don't start it, just register routes
        results.loaded.push({ name, type: 'standalone', path: servicePath });
      } else if (mod.handler || mod.webhookHandler) {
        results.loaded.push({ name, type: 'handler', path: servicePath });
      } else {
        results.loaded.push({ name, type: 'module', path: servicePath });
      }
    } catch(e) {
      results.failed.push({ name: file, error: e.message });
      console.error(`Failed to load service ${file}:`, e.message);
    }
  }
  
  return results;
}

export function getService(name) {
  return loadedServices[name] || null;
}

export function listServices() {
  return Object.entries(loadedServices).map(([name, mod]) => ({
    name,
    hasHandler: typeof mod.webhookHandler === 'function' || typeof mod.handler === 'function',
    hasDefault: typeof mod.default === 'function',
    exports: Object.keys(mod).filter(k => k !== 'default')
  }));
}

// Run as CLI to check services
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await loadServices();
  console.log('Loaded services:', JSON.stringify(results, null, 2));
}

export default { loadServices, getService, listServices, loadedServices };
