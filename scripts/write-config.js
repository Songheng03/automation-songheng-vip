#!/usr/bin/env node
/**
 * my-automaton Config File — sets up DeepSeek API key and services config
 */
const fs = require('fs');
const path = '/root/automaton/automaton.json';

const config = {
  name: "my-automaton",
  wallet: {
    evm: "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
    chain: "base"
  },
  inference: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 2000
  },
  services: {
    gateway: { port: 8080 },
    blogCount: 82,
    premiumEndpoints: ["analyze", "summarize", "review", "security", "explain", "refactor", "complexity", "batch", "render"]
  }
};

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log(`Config written to ${path}`);
