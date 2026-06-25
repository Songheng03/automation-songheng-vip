#!/usr/bin/env node
/**
 * start-gateway.mjs - Start gateway with proper DeepSeek API key
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const config = JSON.parse(readFileSync('/root/automaton/automaton.json', 'utf8'));
const deepseekKey = config.deepseekApiKey || '';

console.log(`DeepSeek key loaded: ${deepseekKey.slice(0, 8)}...`);
process.env.DEEPSEEK_API_KEY = deepseekKey;

// Start gateway
execSync('node /root/automaton/gateway.cjs', {
  cwd: '/root/automaton',
  stdio: 'inherit',
  env: { ...process.env, DEEPSEEK_API_KEY: deepseekKey }
});
