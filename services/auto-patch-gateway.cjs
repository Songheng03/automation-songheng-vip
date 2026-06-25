#!/usr/bin/env node
/**
 * auto-patch-gateway.cjs — INJECTS all services into running gateway.cjs
 * 
 * Run from /root/automaton:
 *   node services/auto-patch-gateway.cjs
 * 
 * This reads gateway.cjs, finds the handle() function, and injects
 * ALL service routes before the catch-all. Then rewrites gateway.cjs.
 * 
 * After patching: sudo systemctl restart automaton-gateway (on HOST)
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_PATH = '/root/automaton/gateway.cjs';
const BACKUP_PATH = '/root/automaton/gateway.cjs.patch-bak';
const SERVICES_DIR = '/root/automaton/services';

function log(m) { console.log(`[patch] ${m}`); }

function main() {
  log('=== Auto-Patch Gateway v1 ===');
  
  if (!fs.existsSync(GATEWAY_PATH)) {
    log(`ERROR: ${GATEWAY_PATH} not found`);
    process.exit(1);
  }
  
  // Backup
  const original = fs.readFileSync(GATEWAY_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, original);
  log(`Backup: ${BACKUP_PATH}`);
  
  // Find all require-able service modules
  const services = [
    { path: '/root/automaton/services/micro-saas-engine.cjs', name: 'microSaas', prefix: 'const microSaas =' },
    { path: '/root/automaton/services/revenue-multiplier.cjs', name: 'revenueMult', prefix: 'const revenueMult =' },
    { path: '/root/automaton/services/referral-service.cjs', name: 'referral', prefix: 'const referral =' },
    { path: '/root/automaton/services/viral-tracker.cjs', name: 'viralTracker', prefix: 'const viralTracker =' },
    { path: '/root/automaton/services/gateway-routes.cjs', name: 'extraRoutes', prefix: 'const extraRoutes =' },
  ].filter(s => fs.existsSync(s.path));
  
  log(`Found ${services.length} service modules to inject`);
  
  // Build injection code
  let injection = '\n// ===== AUTO-INJECTED SERVICES =====\n';
  for (const svc of services) {
    injection += `${svc.prefix} require('${svc.path}');\n`;
  }
  
  injection += '\n';
  injection += '// Injected route handlers — tried in order, first match wins\n';
  injection += 'const INJECTED_ROUTES = [\n';
  for (const svc of services) {
    injection += `  ${svc.name}.handleRoute,\n`;
  }
  injection += '];\n\n';
  injection += '// Try injected routes before falling through to static/default handler\n';
  injection += 'async function tryInjectedRoutes(req, res) {\n';
  injection += '  for (const route of INJECTED_ROUTES) {\n';
  injection += '    try { if (await route(req, res)) return true; } catch(e) {}\n';
  injection += '  }\n';
  injection += '  return false;\n';
  injection += '}\n';
  injection += '// ===== END AUTO-INJECTED SERVICES =====\n';
  
  // Find insertion point: after all requires, before handle function
  // Look for the main handler function
  let patched = original;
  
  // Option 1: Add requires after the last existing require
  const requireEnd = patched.lastIndexOf('const ');
  if (requireEnd > 0) {
    // Find the end of the last require
    const afterRequires = patched.indexOf('\n', requireEnd) + 1;
    const beforePart = patched.substring(0, afterRequires);
    const afterPart = patched.substring(afterRequires);
    patched = beforePart + injection + afterPart;
    log('Injected after last require()');
  } else {
    // Option 2: Add at top of file
    patched = injection + '\n' + patched;
    log('Injected at top of file');
  }
  
  // Now inject route calls into the handler
  // Find the server creation and inject route checking
  const handlerMatch = patched.match(/const server = http\.createServer\(async\s*\(req,\s*res\)\s*=>\s*\{/);
  if (handlerMatch) {
    const handlerStart = handlerMatch.index + handlerMatch[0].length;
    const beforeHandler = patched.substring(0, handlerStart);
    const afterHandler = patched.substring(handlerStart);
    
    const routeHook = `
  // === INJECTED ROUTES ===
  if (await tryInjectedRoutes(req, res)) return;
  // === END INJECTED ROUTES ===
`;
    
    patched = beforeHandler + routeHook + afterHandler;
    log('Injected route hook into server handler');
  }
  
  // Write patched gateway
  fs.writeFileSync(GATEWAY_PATH, patched);
  log(`Written: ${GATEWAY_PATH} (${(patched.length / 1024).toFixed(0)} KB)`);
  
  // Verify
  try {
    require('child_process').execSync('node -c ' + GATEWAY_PATH, { timeout: 5000 });
    log('✅ Syntax check PASSED');
  } catch (e) {
    log('❌ Syntax check FAILED — restoring backup');
    fs.writeFileSync(GATEWAY_PATH, original);
    log('Restored original');
    process.exit(1);
  }
  
  log('');
  log('=== NEXT STEPS ===');
  log('1. On HOST, run: sudo systemctl restart automaton-gateway');
  log('2. Verify: curl http://localhost:8080/api/public-stats');
  log('3. Verify: curl http://localhost:8080/api/status');
  log('4. Restore if broken: cp /root/automaton/gateway.cjs.patch-bak /root/automaton/gateway.cjs');
  log('');
}

main();
