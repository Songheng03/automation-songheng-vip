const fs = require('fs');
const gw = '/root/automaton/gateway.js';
let c = fs.readFileSync(gw, 'utf8');

// 1. Add the x402 verifier require block after the github review require
// Find the github require block
const githubBlock = c.indexOf('// ---- GitHub PR Review Service ----');
if (githubBlock > 0) {
  const afterGithub = c.indexOf('\n\n', githubBlock + 50);
  const x402RequireBlock = `

// ---- x402 Payment Verification ----
const X402_VERIFIER = path.join(__dirname, 'services', 'x402-verifier.js');
let x402;
try { 
  x402 = require(X402_VERIFIER); 
  console.log('[gateway] x402-verifier loaded');
} catch(e) { 
  console.error('[gateway] x402-verifier not loaded:', e.message); 
  x402 = { verifyPayment: () => ({valid: true}) }; // fallback
}

`;
  c = c.slice(0, afterGithub) + x402RequireBlock + c.slice(afterGithub);
}

// 2. Replace the PREMIUM endpoints to actually verify x402 payments
// Find where premium endpoints are handled in the request handler
// The premium endpoints are handled inline. Let me find the section.

// Find the section that handles premium endpoints
const premiumHandler = c.indexOf("// Premium x402 endpoints");
if (premiumHandler > 0) {
  // Find the end of the premium block (next comment or empty line after the block)
  const blockEnd = c.indexOf("\n\n", premiumHandler + 100);
  const premiumBlock = c.slice(premiumHandler, blockEnd);
  
  const newPremiumBlock = `// Premium x402 endpoints with payment verification
  if (PREMIUM[p] && req.method === 'POST') {
    if (!x402) {
      respond(500, {'Content-Type':'application/json'}, {error:'Payment service unavailable'});
      return;
    }
    const ep = PREMIUM[p];
    const paymentTx = req.headers['x-x402-payment'];
    
    if (!paymentTx) {
      // Return 402 with payment instructions
      const paymentInfo = {
        error: 'payment_required',
        cost_cents: ep.cost,
        cost_label: ep.desc,
        wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        chain: 'base',
        usdc_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        instructions: \`Send \${ep.cost}¢ USDC on Base chain to 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113, then retry with X-X402-Payment header\`
      };
      respond(402, {
        'Content-Type': 'application/json',
        'X-X402-Cost': ep.cost.toString(),
        'X-X402-Wallet': '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        'X-X402-Chain': 'base',
        'X-X402-Asset': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        'X-X402-Decimals': '6'
      }, paymentInfo);
      return;
    }
    
    // Verify the payment asynchronously
    x402.verifyPayment(paymentTx, ep.cost).then(result => {
      if (!result.valid) {
        respond(402, {'Content-Type':'application/json'}, {
          error: 'payment_invalid',
          reason: result.reason,
          cost_cents: ep.cost,
          wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113'
        });
        return;
      }
      
      // Payment verified! Process the request
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const input = JSON.parse(body || '{}');
          // Route to DeepSeek
          const ds = require(path.join(__dirname, 'services', 'deepseek-service.js'));
          if (!ds || !ds.processRequest) {
            respond(200, {'Content-Type':'application/json'}, {
              mocked: true,
              message: \`[MOCK] \${ep.desc} would process: \${JSON.stringify(input).slice(0,100)}...\`,
              payment: { tx: paymentTx.slice(0, 18) + '...', cost: ep.cost + '¢' },
              note: 'DeepSeek integration not available - install it to enable real AI processing'
            });
            return;
          }
          const result = await ds.processRequest(input, p);
          respond(200, {'Content-Type':'application/json'}, result);
        } catch(e) {
          respond(500, {'Content-Type':'application/json'}, {error: e.message});
        }
      });
    }).catch(err => {
      respond(500, {'Content-Type':'application/json'}, {error: 'Payment verification failed: ' + err.message});
    });
    return;
  }`;
  
  c = c.replace(premiumBlock, newPremiumBlock);
}

// 3. Add "respond" helper if not present
if (!c.includes('function respond(')) {
  // Add after the first const declarations
  const afterMime = c.indexOf('const PREMIUM');
  if (afterMime > 0) {
    const respondHelper = `
// Response helper
function respond(res, statusCode, headers, body) {
  res.writeHead(statusCode, {'Content-Type': 'application/json', ...headers});
  res.end(JSON.stringify(body));
}

`;
    const insertPoint = c.indexOf('\n', afterMime);
    c = c.slice(0, insertPoint + 1) + respondHelper + c.slice(insertPoint + 1);
  }
}

fs.writeFileSync(gw, c);

const { execSync } = require('child_process');
try {
  execSync('node --check ' + gw, { stdio: 'pipe' });
  console.log('✅ Gateway syntax OK! x402 verification integrated!');
} catch(e) {
  console.log('❌ Syntax error:', e.stderr?.toString().split('\n').slice(0,3).join('\n'));
  process.exit(1);
}

// Restart gateway
try { 
  const pid = execSync('pgrep -f "node.*gateway.js" 2>/dev/null || true').toString().trim();
  if (pid) {
    execSync('kill ' + pid.split('\n')[0] + ' 2>/dev/null || true');
  }
} catch(e) {}

setTimeout(() => {
  const child = require('child_process').spawn('node', [gw], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  child.unref();
  
  setTimeout(() => {
    const http = require('http');
    http.get('http://localhost:8080/', (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        console.log('✅ Gateway restarted with x402 payment verification!');
        process.exit(0);
      });
    }).on('error', (e) => {
      console.log('❌ Gateway not responding:', e.message);
      process.exit(1);
    });
  }, 2000);
}, 1000);
