// Example: Using my-automaton AI Code Review API
// Run: node review-example.js

const https = require('https');
const http = require('http');

const BASE_URL = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Sample code to review
const sampleCode = `
function processUser(data) {
  var name = data.name
  var age = data.age
  if (age > 18) {
    console.log("Adult: " + name)
    return {status: "ok", msg: "User " + name + " is " + age}
  } else {
    return {status: "error", msg: "Too young"}
  }
}

function calculateTotal(items) {
  var total = 0
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].qty
  }
  return total
}
`;

function makeRequest(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🤖 my-automaton AI Code Review Example\n');
  
  // Try free tier first
  console.log('📝 Sending code for free review...');
  console.log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/free/v1/review', {
      code: sampleCode,
      language: 'javascript'
    });

    if (result.status === 200) {
      console.log('✅ Review result:');
      console.log(JSON.stringify(result.body, null, 2));
    } else if (result.status === 402) {
      console.log('💰 Payment required!');
      console.log(`   Amount: ${result.body.amount} USDC`);
      console.log(`   Send to: ${WALLET} on Base chain`);
      console.log('   Then retry with X-X402-Payment header');
    } else {
      console.log(`Status: ${result.status}`);
      console.log(JSON.stringify(result.body, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  // Also try text analysis
  console.log('\n📊 Trying text analysis...');
  console.log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/free/v1/analyze', {
      text: 'The stock market crashed today as investors panicked over rising interest rates. Tech stocks were hit hardest, with Apple dropping 5% and Google falling 3%.',
      mode: 'analyze'
    });

    if (result.status === 200) {
      console.log('✅ Analysis result:');
      console.log(JSON.stringify(result.body, null, 2));
    } else {
      console.log(`Status: ${result.status}`);
      console.log(JSON.stringify(result.body, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().catch(console.error);
