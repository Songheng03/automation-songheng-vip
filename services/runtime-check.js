#!/usr/bin/env node
const { execSync } = require('child_process');
console.log('node:', process.version);
console.log('cwd:', process.cwd());
console.log('home:', process.env.HOME);
try {
  const which = execSync('which python3 python node npm 2>/dev/null', {encoding:'utf8'});
  console.log('available:', which.replace(/\n/g, ', '));
} catch(e) {}
