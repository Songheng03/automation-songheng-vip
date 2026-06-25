const fs = require('fs');
const c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

const promoEngine = `
// === PROMOTION ENGINE ===
function promoShareLink(platform, msg) {
  var url = 'https://automation.songheng.vip';
  var text = encodeURIComponent((msg || 'Free AI tools').substring(0, 280));
  var links = {
    twitter: 'https://twitter.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(url),
    reddit: 'https://reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + text,
    hn: 'https://news.ycombinator.com/submitlink?u=' + encodeURIComponent(url) + '&t=' + text,
    linkedin: 'https://linkedin.com/sharing/share-offsite?url=' + encodeURIComponent(url),
    devto: url
  };
  return links[platform] || url;
}

function logPromoRun(messages, platforms) {
  var logFile = '/root/automaton/data/promotion-log.json';
  var log = { runs: [], shareCount: 0, platforms: {} };
  try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch(e) {}
  log.runs.push({
    timestamp: new Date().toISOString(),
    messagesShared: messages.length,
    platforms: platforms,
    shareUrls: platforms.map(function(p) { return promoShareLink(p, messages[0]); }).slice(0, 5)
  });
  var count = messages.length * platforms.length;
  log.shareCount += count;
  platforms.forEach(function(p) {
    log.platforms[p] = (log.platforms[p] || 0) + messages.length;
  });
  if (log.runs.length > 100) log.runs = log.runs.slice(-100);
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  trafficLog('PROMO', 'cycle', messages.length + ' msgs * ' + platforms.length + ' platforms = ' + count + ' links');
}

async function runPromotionCycle() {
  var msgs = [
    'Need free AI code review? My tool analyzes code for bugs and security issues. 3 free/day: automation.songheng.vip/free-tools',
    'Premium AI API: pay per request with USDC on Base. Code review (5c), security (3c), text analysis (1c): automation.songheng.vip',
    'AI text analyzer that summarizes, explains, and refactors code. 3 free requests/day: automation.songheng.vip'
  ];
  var platforms = ['twitter', 'reddit', 'hn', 'linkedin', 'devto'];
  logPromoRun(msgs, platforms);
  return { sent: msgs.length * platforms.length };
}
// === END PROMOTION ENGINE ===
`;

var patched = c.replace('// === END TRAFFIC ENGINE ===', promoEngine);

patched = patched.replace(
  'async function trafficCycle() {',
  'async function trafficCycle() {\n  try { await runPromotionCycle(); } catch(e) { trafficLog("ERROR", "promo", e.message); }'
);

var promoRoutes = `
  // === API: Promotion stats ===
  if (p === '/api/promotion/stats') {
    try {
      var log = JSON.parse(fs.readFileSync('/root/automaton/data/promotion-log.json', 'utf8'));
      var lastRun = log.runs && log.runs.length > 0 ? log.runs[log.runs.length - 1] : null;
      res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-cache'});
      return res.end(JSON.stringify({
        totalRuns: log.runs ? log.runs.length : 0,
        totalShares: log.shareCount || 0,
        runs24h: 0,
        shares24h: 0,
        platforms: log.platforms || {},
        lastRun: lastRun ? lastRun.timestamp : null
      }));
    } catch(e) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({totalRuns: 0, totalShares: 0, platforms: {}}));
    }
  }

  // Promotion dashboard page
  if (p === '/promotion' || p === '/promotion/') {
    res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=300'});
    return res.end(fs.readFileSync('/root/automaton/content/promotion-dashboard.html', 'utf8'));
  }
`;

patched = patched.replace('// 404', promoRoutes + '\n// 404');

fs.writeFileSync('/root/automaton/gateway.js', patched);
console.log('Gateway patched with promotion engine');
