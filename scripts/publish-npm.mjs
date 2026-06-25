#!/usr/bin/env node
/**
 * publish-npm.mjs — Publish my-automaton CLI to npm
 * 
 * Requirements:
 *   npm login (interactive)
 *   Or set NPM_TOKEN env var
 * 
 * Run: node scripts/publish-npm.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from 'fs';

const PKG_DIR = '/tmp/my-automaton-npm-publish';
const CONTENT = '/root/automaton/content';

async function main() {
  console.log('📦 Building my-automaton CLI for npm publish');
  console.log('='.repeat(50));
  
  // Clean build dir
  rmSync(PKG_DIR, { recursive: true, force: true });
  mkdirSync(PKG_DIR, { recursive: true });
  
  // Copy files
  const files = ['package.json', 'my-automaton.mjs', 'README.md'];
  files.forEach(f => copyFileSync(`${CONTENT}/${f}`, `${PKG_DIR}/${f}`));
  
  console.log('📋 Files staged:');
  files.forEach(f => {
    const size = readFileSync(`${PKG_DIR}/${f}`).length;
    console.log(`   ${f} (${(size/1024).toFixed(1)} KB)`);
  });
  
  // Test the module loads
  console.log('\n🔍 Testing module...');
  try {
    const test = await import(`${PKG_DIR}/my-automaton.mjs`);
    console.log('   ✅ Module loads successfully');
  } catch(e) {
    console.log(`   ⚠️  Module test: ${e.message}`);
  }
  
  // Check npm auth
  console.log('\n🔑 Checking npm auth...');
  try {
    const whoami = execSync('npm whoami 2>&1', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ Logged in as: ${whoami}`);
    
    // Publish
    console.log('\n🚀 Publishing...');
    execSync(`cd ${PKG_DIR} && npm publish --access public 2>&1`, { encoding: 'utf-8', stdio: 'inherit' });
    console.log('   ✅ Published!');
  } catch(e) {
    console.log(`   ❌ npm auth/publish failed: ${e.message}`);
    console.log('\n📋 To publish manually:');
    console.log(`   1. cd ${PKG_DIR}`);
    console.log('   2. npm login');
    console.log('   3. npm publish --access public');
    console.log('\n   Or run: npm adduser && npm publish ' + PKG_DIR);
  }
}

main().catch(e => console.error('FATAL:', e));
