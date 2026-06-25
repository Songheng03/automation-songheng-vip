import { execSync } from 'child_process';
import fs from 'fs';

const BASE_URL = 'http://automation.automation.songheng.vip:8080';
const RESULTS_FILE = '/root/automaton/gateway_test_results.json';

const endpoints = [
  'code-review',
  'security-scan',
  'text-analysis',
  'sentiment-analysis',
  'summarize',
  'translate',
  'qa',
  'chat',
  'image-analysis'
];

const payload = JSON.stringify({ text: 'Hello world, this is a test input for the AI endpoint.' });

const results = [];

for (const ep of endpoints) {
  const url = `${BASE_URL}/${ep}`;
  try {
    const result = execSync(
      `curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d '${payload}' '${url}'`,
      { timeout: 15000, encoding: 'utf-8' }
    );

    const lines = result.trim().split('\n');
    const httpCode = parseInt(lines[lines.length - 1], 10);
    const body = lines.slice(0, -1).join('\n');

    const isSuccess = httpCode >= 200 && httpCode < 300;
    const hasBody = body.trim().length > 0;
    const entry = {
      endpoint: `/${ep}`,
      status_code: httpCode,
      success: isSuccess && hasBody
    };
    if (!isSuccess) {
      entry.error = `HTTP ${httpCode} - non-2xx response`;
    } else if (!hasBody) {
      entry.error = 'Empty body';
    }
    results.push(entry);
  } catch (err) {
    results.push({
      endpoint: `/${ep}`,
      status_code: 0,
      success: false,
      error: `Request failed: ${err.message}`
    });
  }
}

fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

const successes = results.filter(r => r.success).length;
const total = results.length;
console.log(`\n=== Summary ===`);
console.log(`Successful: ${successes} / ${total}`);
for (const r of results) {
  const status = r.success ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${r.endpoint} -> ${r.status_code}${r.error ? ` (${r.error})` : ''}`);
}
