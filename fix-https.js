#!/usr/bin/env node
// Fix: replace require('https') with direct import reference in badge inline
import fs from 'fs';

let c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Add import for https at the top (right after other imports)
c = c.replace(
  "import { handleBadge } from './services/repo-badges.js';",
  "import https from 'https';"
);

// Fix the inline githubApi function to use the imported https instead of require('https')
c = c.replace(
  "const httpsMod = require('https');\n    httpsMod.get(",
  "https.get("
);

fs.writeFileSync('/root/automaton/gateway.js', c, 'utf8');
console.log('OK: fixed https import in gateway.js');
