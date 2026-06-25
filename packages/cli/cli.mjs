#!/usr/bin/env node
/**
 * @my-automaton/cli — AI Code Review & Analysis CLI
 * 
 * Usage:
 *   npx @my-automaton/cli review <file>
 *   npx @my-automaton/cli security <file>  
 *   npx @my-automaton/cli analyze <text>
 *   npx @my-automaton/cli summarize <text>
 *   npx @my-automaton/cli explain <file>
 *   npx @my-automaton/cli refactor <file>
 *   npx @my-automaton/cli complexity <file>
 * 
 * Environment:
 *   MY_AUTOMATON_KEY   — API key for premium tier (optional)
 *   MY_AUTOMATON_URL   — API base URL (default: https://automation.songheng.vip)
 */

const MODES = ['review', 'security', 'analyze', 'summarize', 'explain', 'refactor', 'complexity'];

async function readInput(mode, arg) {
  if (!arg) {
    console.error(`Usage: my-automaton ${mode} <file|text>`);
    process.exit(1);
  }
  
  // Check if arg is a file
  try {
    const fs = await import('fs');
    if (fs.existsSync(arg)) {
      const content = fs.readFileSync(arg, 'utf-8');
      const ext = arg.split('.').pop();
      return { code: content, language: ext, input_type: 'file' };
    }
  } catch {}
  
  return { text: arg, input_type: 'text' };
}

function formatOutput(result, mode) {
  if (!result || result.error) {
    return `❌ Error: ${result?.error || 'Unknown error'}`;
  }
  
  let output = '';
  
  switch (mode) {
    case 'review':
      if (result.summary) output += `📊 Summary: ${result.summary}\n\n`;
      if (result.score) output += `⭐ Score: ${result.score}/100\n\n`;
      if (result.issues && Array.isArray(result.issues)) {
        for (const issue of result.issues) {
          const sev = issue.severity || 'info';
          const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '⚪';
          output += `${icon} [${sev.toUpperCase()}] `;
          if (issue.line) output += `Line ${issue.line}: `;
          output += `${issue.title || issue.description}\n`;
          if (issue.suggestion) output += `   💡 ${issue.suggestion}\n`;
          output += '\n';
        }
      }
      break;
    
    case 'security':
      if (result.summary) output += `📊 Summary: ${result.summary}\n\n`;
      if (result.score) output += `⭐ Security Score: ${result.score}/100\n\n`;
      if (result.vulnerabilities && Array.isArray(result.vulnerabilities)) {
        for (const vuln of result.vulnerabilities) {
          const sev = vuln.severity || 'medium';
          const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '⚪';
          output += `${icon} [${sev.toUpperCase()}] ${vuln.type || vuln.title}\n`;
          if (vuln.description) output += `   ${vuln.description}\n`;
          if (vuln.remediation) output += `   ✅ Fix: ${vuln.remediation}\n`;
          output += '\n';
        }
      }
      break;
    
    case 'analyze':
      output += '📊 Text Analysis\n';
      output += `${'═'.repeat(50)}\n`;
      if (result.sentiment) output += `😊 Sentiment: ${typeof result.sentiment === 'object' ? result.sentiment.score || JSON.stringify(result.sentiment) : result.sentiment}\n`;
      if (result.readability) output += `📖 Readability: ${typeof result.readability === 'object' ? result.readability.score || JSON.stringify(result.readability) : result.readability}\n`;
      if (result.entities && Array.isArray(result.entities)) {
        output += `\n🏷️ Entities:\n`;
        for (const e of result.entities) {
          output += `  - ${e.name || e} (${e.type || ''})\n`;
        }
      }
      if (result.themes && Array.isArray(result.themes)) {
        output += `\n🎯 Themes:\n`;
        for (const t of result.themes) {
          output += `  - ${t.name || t}\n`;
        }
      }
      break;
    
    case 'summarize':
      output += '📝 Summary\n';
      output += `${'═'.repeat(50)}\n`;
      output += `${result.summary || JSON.stringify(result)}\n`;
      output += '\n';
      break;
    
    case 'explain':
      output += '💡 Code Explanation\n';
      output += `${'═'.repeat(50)}\n`;
      output += `${result.explanation || JSON.stringify(result)}\n`;
      output += '\n';
      break;
    
    case 'refactor':
      output += '🔧 Refactoring Suggestions\n';
      output += `${'═'.repeat(50)}\n`;
      output += `${result.suggestions || JSON.stringify(result)}\n`;
      output += '\n';
      break;
    
    case 'complexity':
      output += '📊 Complexity Analysis\n';
      output += `${'═'.repeat(50)}\n`;
      if (result.score) output += `⭐ Complexity Score: ${result.score}\n`;
      if (result.cyclomatic) output += `🔄 Cyclomatic: ${result.cyclomatic}\n`;
      if (result.cognitive) output += `🧠 Cognitive: ${result.cognitive}\n`;
      if (result.maintainability) output += `🔧 Maintainability: ${result.maintainability}\n`;
      break;
  }
  
  return output;
}

async function main() {
  const API_BASE = process.env.MY_AUTOMATON_URL || 'https://automation.songheng.vip';
  const API_KEY = process.env.MY_AUTOMATON_KEY || '';
  
  const args = process.argv.slice(2);
  const mode = args[0];
  const arg = args.slice(1).join(' ');
  
  if (!mode || mode === '--help' || mode === '-h') {
    console.log(`
🤖 my-automaton CLI — AI Code Review & Analysis

Usage:
  my-automaton <mode> <file|text>

Modes:
  review      Full code review
  security    Security vulnerability scan
  analyze     Deep text analysis
  summarize   AI summarization
  explain     Code explanation
  refactor    Refactoring suggestions
  complexity  Complexity analysis

Examples:
  my-automaton review myfile.js
  my-automaton security app.py
  my-automaton analyze "Your text here"
  my-automaton summarize README.md

Environment:
  MY_AUTOMATON_KEY   API key for premium (optional)
  MY_AUTOMATON_URL   API base URL

Info:  ${API_BASE}
Docs:  ${API_BASE}/api-docs.html
Demo:  ${API_BASE}/demo.html
`);
    process.exit(0);
  }
  
  if (!MODES.includes(mode)) {
    console.error(`Unknown mode: ${mode}. Use: ${MODES.join(', ')}`);
    process.exit(1);
  }
  
  const input = await readInput(mode, arg);
  const isPremium = !!API_KEY;
  const endpoint = isPremium ? `${API_BASE}/v1/${mode}` : `${API_BASE}/api/free/${mode}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  
  console.error(`🔍 ${mode}... (${isPremium ? 'premium' : 'free'})`);
  
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(input)
  });
  
  if (resp.status === 402) {
    console.error('❌ Out of credits. Get more at:', `${API_BASE}/upgrade.html`);
    process.exit(1);
  }
  
  const result = await resp.json();
  const output = formatOutput(result, mode);
  console.log(output);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
