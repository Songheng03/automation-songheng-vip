const fs = require('fs');
let c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// The ROUTES object has a broken state - comment inside object + missing commas
// Replace entire ROUTES block with clean version
const routeBlockStart = c.indexOf('const ROUTES = {');
const routeBlockEnd = c.indexOf('};', routeBlockStart) + 2;

const cleanRoutes = `const ROUTES = {
  "/": "/index.html",
  "/blog": "/blog.html",
  "/tools": "/tools.html",
  "/dashboard": "/dashboard.html",
  "/api-docs": "/api-docs.html",
  "/api-playground": "/api-playground.html",
  "/live-demo": "/live-demo.html",
  "/upgrade": "/upgrade.html",
  "/quickstart": "/quickstart.html",
  "/monitor": "/monitor.html",
  "/ai-code-reviewer": "/ai-code-reviewer.html",
  "/code-quality-checker": "/code-quality-checker.html",
  "/content-generator": "/content-generator.html",
  "/tools/regex-tester": "/tools/regex-tester.html",
  "/tools/json-formatter": "/tools/json-formatter.html",
  "/tools/http-status-codes": "/tools/http-status-codes.html",
  "/tools/sitemap-generator": "/tools/sitemap-generator.html",
  "/seo-optimizer": "/seo-optimizer.html",
  "/sitemap.xml": "/sitemap.xml",
  "/robots.txt": "/robots.txt",
  "/referral": "/referral.html",
  "/github-webhook-setup": "/github-webhook-setup.html",
  "/server-health": "/server-health.html",
  "/pay-as-you-go": "/pay-as-you-go.html",
  "/free-services": "/tools.html",
  "/tools/badge-generator": "/tools/badge-generator.html",
  "/badge/*": "/api/badge-svg",
  "/pricing": "/pay-as-you-go.html",
  "/tools/website-grader": "/tools/website-grader.html",
  "/grade": "/tools/website-grader.html",
  "/tools/seo-audit": "/tools/seo-audit.html",
  "/seo-audit": "/tools/seo-audit.html",
  "/google-search-console.html": "/google-search-console.html",
  "/google.html": "/google.html",
  "/traffic-stats": "/traffic-stats.html",
  "/blog/code-quality-badges-guide": "/blog/code-quality-badges-guide.html",
  "/tools/seo-content-brief": "/tools/seo-content-brief.html"
};`;

c = c.slice(0, routeBlockStart) + cleanRoutes + c.slice(routeBlockEnd);
fs.writeFileSync('/root/automaton/gateway.js', c);

const { execSync } = require('child_process');
try {
  execSync('node --check /root/automaton/gateway.js', { stdio: 'pipe' });
  console.log('✅ Syntax OK! Gateway is valid.');
  
  // Start it
  const { spawn } = require('child_process');
  const child = spawn('node', ['/root/automaton/gateway.js'], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  child.stdout.on('data', d => process.stdout.write(d.toString()));
  child.stderr.on('data', d => process.stderr.write(d.toString()));
  
  setTimeout(() => {
    const http = require('http');
    http.get('http://localhost:8080/', (res) => {
      console.log('✅ Gateway running! Status:', res.statusCode);
      process.exit(0);
    }).on('error', (e) => {
      console.log('❌ Gateway not responding:', e.message);
      process.exit(1);
    });
  }, 2000);
} catch(e) {
  console.log('❌ Syntax error:', e.stderr?.toString()?.split('\n').slice(0,3).join('\n'));
  process.exit(1);
}
