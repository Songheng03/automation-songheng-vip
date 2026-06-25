#!/usr/bin/env node
/**
 * free-demo.js — Interactive demo script for my-automaton services
 * Run: node /root/automaton/content/free-demo.js
 * Demonstrates all 7 services with sample inputs using the free tier
 */

const API = 'http://localhost:8080';

const demos = {
  analyze: {
    endpoint: '/free/analyze',
    payload: { text: 'The rapid advancement of artificial intelligence has transformed industries from healthcare to finance. Machine learning algorithms now diagnose diseases, predict market trends, and power autonomous vehicles. However, concerns about job displacement, algorithmic bias, and ethical deployment remain significant challenges that society must address collaboratively.', mode: 'analyze' },
    label: '📊 Text Analysis'
  },
  summarize: {
    endpoint: '/free/summarize',
    payload: { text: 'Artificial intelligence (AI) has become a transformative force across multiple sectors. In healthcare, AI systems can detect cancers from medical imaging with accuracy comparable to human radiologists. In finance, algorithms execute trades in milliseconds and detect fraudulent transactions. Transportation has seen autonomous vehicles logging millions of miles. Manufacturing benefits from predictive maintenance that reduces downtime. Education platforms use AI to personalize learning paths. Despite these advances, challenges persist: data privacy concerns, algorithmic bias against minority groups, job displacement in traditional industries, and the environmental cost of training large models. Regulatory frameworks are evolving globally to address these issues while fostering innovation.', mode: 'summarize', max_length: 100 },
    label: '📝 Summarization'
  },
  review: {
    endpoint: '/free/review',
    payload: { code: `function fetchData(url) {
  return fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed');
    return res.json();
  }).catch(err => console.log(err));
}

function processItems(items) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].active) {
      let temp = items[i].value * 2;
      result.push(temp);
    }
  }
  return result;
}`, mode: 'review', language: 'javascript' },
    label: '🔍 Code Review'
  },
  security: {
    endpoint: '/free/security',
    payload: { code: `app.get('/user/:id', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  db.execute(query, (err, user) => {
    if (err) return res.status(500).send('Error');
    res.json(user);
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const token = jwt.sign({ user: username }, 'hardcoded-secret-123');
  res.cookie('session', token);
  res.send('Logged in');
});`, mode: 'security' },
    label: '🔒 Security Scan'
  },
  explain: {
    endpoint: '/free/explain',
    payload: { code: `async function debounce(fn, delay) {
  let timer;
  return function(...args) {
    return new Promise((resolve) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const result = await fn.apply(this, args);
        resolve(result);
      }, delay);
    });
  };
}`, mode: 'explain' },
    label: '💡 Code Explanation'
  },
  refactor: {
    endpoint: '/free/refactor',
    payload: { code: `function processOrders(orders) {
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (o.status == 'pending') {
      var total = 0;
      for (var j = 0; j < o.items.length; j++) {
        total += o.items[j].price * o.items[j].qty;
      }
      var d = new Date();
      var dateStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      result.push({ id: o.id, total: total, date: dateStr, customer: o.customer.name });
    }
  }
  return result;
}`, mode: 'refactor' },
    label: '🔄 Refactoring'
  },
  complexity: {
    endpoint: '/free/complexity',
    payload: { code: `function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    if (seen.has(arr[i])) {
      if (!duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
    seen.add(arr[i]);
  }
  return duplicates;
}

function mergeSortedArrays(a, b) {
  let i = 0, j = 0, result = [];
  while (i < a.length && j < b.length) {
    if (a[i] < b[j]) result.push(a[i++]);
    else result.push(b[j++]);
  }
  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);
  return result;
}`, mode: 'complexity' },
    label: '⚡ Complexity Analysis'
  }
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

async function runDemo(name, config) {
  console.log(`\n${colors.bold}${colors.cyan}━━━ ${config.label} ━━━${colors.reset}`);
  console.log(`${colors.yellow}Sending${colors.reset} to ${config.endpoint}...`);
  
  try {
    const res = await fetch(API + config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.payload)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      const output = data.output || data.result || data.analysis || data.summary || data.review || data.explanation || data.suggestions || JSON.stringify(data, null, 2);
      const outputStr = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
      const lines = outputStr.split('\n');
      const preview = lines.slice(0, 8).join('\n') + (lines.length > 8 ? '\n...' : '');
      console.log(`${colors.green}✓ Success${colors.reset}:`);
      console.log(preview);
      console.log(`${colors.green}✓ ${config.label} passed!${colors.reset}`);
      return { success: true, output };
    } else {
      console.log(`${colors.red}✗ Error:${colors.reset}`, data.error || res.status);
      return { success: false, error: data.error };
    }
  } catch (e) {
    console.log(`${colors.red}✗ Network error:${colors.reset}`, e.message);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log(`${colors.bold}${colors.magenta}
╔══════════════════════════════════════╗
║  🤖 my-automaton Free Demo Runner   ║
║  Testing all 7 services via free tier║
╚══════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.blue}Gateway:${colors.reset} ${API}`);
  console.log(`${colors.blue}Time:${colors.reset} ${new Date().toISOString()}`);
  
  let passed = 0, failed = 0;
  
  for (const [name, config] of Object.entries(demos)) {
    const result = await runDemo(name, config);
    if (result.success) passed++;
    else failed++;
  }
  
  console.log(`\n${colors.bold}${colors.cyan}═══════ RESULTS ═══════${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  if (failed > 0) console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════${colors.reset}`);
  
  if (passed === 7) {
    console.log(`\n${colors.green}${colors.bold}🎉 ALL 7 SERVICES WORKING!${colors.reset}`);
  }
}

main().catch(console.error);
