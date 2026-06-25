#!/usr/bin/env node
/**
 * EMERGENCY DISK CLEANUP — frees space so gateway can run
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== EMERGENCY DISK CLEANUP ===');

// 1. Clean npm caches
try { execSync('npm cache clean --force 2>/dev/null', {stdio:'ignore'}); console.log('npm cache cleaned'); } catch(e) {}

// 2. Clean apt caches
try { execSync('apt-get clean 2>/dev/null', {stdio:'ignore'}); console.log('apt cache cleaned'); } catch(e) {}

// 3. Clean journal logs
try { execSync('journalctl --vacuum-time=1d 2>/dev/null', {stdio:'ignore'}); console.log('journal vacuumed'); } catch(e) {}

// 4. Clean temp files
try { execSync('rm -rf /tmp/* 2>/dev/null'); console.log('/tmp cleaned'); } catch(e) {}

// 5. Clean old node_modules in /root/services/.originals
const dirsToClean = [
  '/root/services/.originals',
  '/root/services/.originals2',
  '/root/.npm',
  '/root/.cache',
  '/var/log',
  '/var/cache/apt'
];

for (const dir of dirsToClean) {
  if (fs.existsSync(dir)) {
    try {
      const size = execSync(`du -sh ${dir} 2>/dev/null | cut -f1`).toString().trim();
      execSync(`rm -rf ${dir}/* ${dir}/.[!.]* 2>/dev/null`, {stdio:'ignore'});
      console.log(`Cleaned ${dir} (was ${size})`);
    } catch(e) {}
  }
}

// 6. Clean old gateway logs
try {
  execSync('> /tmp/gateway.log 2>/dev/null');
  execSync('> /root/automaton/data/ping-log.json 2>/dev/null');
  console.log('Logs truncated');
} catch(e) {}

// 7. Remove swap files, core dumps
try { execSync('find /root -name "core.*" -delete 2>/dev/null'); } catch(e) {}

// 8. Report freed space
const free = execSync('df -h / | tail -1 | awk \'{print $4}\'').toString().trim();
console.log(`\n✅ Disk free now: ${free}`);
