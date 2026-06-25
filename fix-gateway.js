const fs = require('fs');
let gw = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// 1. Fix duplicate /live-demo entries in PAGE_MAP — keep only one
// Replace the mess of duplicate live-demo entries with a single clean one
gw = gw.replace(/'\/live-demo':'live-demo\.html',\s*'\/live-demo':'live-demo\.html',\s*'\/live-demo':'live-demo\.html',\s*'\/live-demo':'live-demo\.html'/g, "'/live-demo':'live-demo.html'");

// 2. Add whois-lookup-service to SERVICE_LIST (before the closing ])
gw = gw.replace(
  "'sitemap-generator.js'\n];",
  "'sitemap-generator.js',\n  'whois-lookup-service.js'\n];"
);

// 3. Add /tools/whois to TOOL_MAP
gw = gw.replace(
  "'/tools/content-generator':'content-generator.html'",
  "'/tools/content-generator':'content-generator.html',\n  '/tools/whois':'whois-tool.html'"
);

fs.writeFileSync('/root/automaton/gateway.js', gw);
console.log('Gateway fixed. Duplicates removed, whois service added.');
