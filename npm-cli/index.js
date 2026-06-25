#!/usr/bin/env node

/**
 * my-automaton CLI - Command line code review tool
 * 
 * Usage:
 *   my-automaton review --api-key am_xxx --file path/to/file.js
 *   my-automaton review --api-key am_xxx --dir src/
 *   my-automaton analyze --api-key am_xxx --text "Your text here"
 *   my-automaton summarize --api-key am_xxx --file README.md
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'automation.songheng.vip';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: args[0],
    apiKey: null,
    file: null,
    dir: null,
    text: null,
    language: null,
    output: 'text'
  };

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'api-key') options.apiKey = value;
    else if (key === 'file') options.file = value;
    else if (key === 'dir') options.dir = value;
    else if (key === 'text') options.text = value;
    else if (key === 'language') options.language = value;
    else if (key === 'output') options.output = value;
  }

  return options;
}

function apiCall(endpoint, data, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: `/v1/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 402) {
          reject(new Error('Insufficient credits. Purchase more at https://automation.songheng.vip/pricing.html'));
        } else if (res.statusCode >= 400) {
          reject(new Error(`API error: ${res.statusCode} - ${responseData}`));
        } else {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const langMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.html': 'html',
    '.css': 'css',
    '.sql': 'sql',
    '.sh': 'bash',
    '.md': 'markdown'
  };
  return langMap[ext] || 'text';
}

async function reviewFile(filePath, apiKey, output) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  const language = detectLanguage(filePath);

  console.log(`Reviewing ${filePath} (${language})...`);

  try {
    const result = await apiCall('review', { code, language, filename: path.basename(filePath) }, apiKey);
    
    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log(`REVIEW: ${filePath}`);
      console.log('='.repeat(60) + '\n');
      
      if (result.summary) {
        console.log('Summary:', result.summary);
        console.log();
      }
      
      if (result.issues && result.issues.length > 0) {
        console.log(`Found ${result.issues.length} issue(s):\n`);
        result.issues.forEach((issue, i) => {
          const icon = issue.severity === 'critical' ? '🔴' : 
                      issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`${icon} ${issue.severity.toUpperCase()}: ${issue.message}`);
          if (issue.line) console.log(`   Line ${issue.line}`);
          if (issue.suggestion) console.log(`   Suggestion: ${issue.suggestion}`);
          console.log();
        });
      } else {
        console.log('✓ No issues found');
      }
      
      if (result.score) {
        console.log(`\nCode Quality Score: ${result.score}/10`);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error reviewing ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

async function analyzeText(text, apiKey, output) {
  try {
    const result = await apiCall('analyze', { text, mode: 'analyze' }, apiKey);
    
    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('TEXT ANALYSIS');
      console.log('='.repeat(60) + '\n');
      console.log(result.analysis || JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function summarizeText(text, apiKey, output) {
  try {
    const result = await apiCall('summarize', { text }, apiKey);
    
    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60) + '\n');
      console.log(result.summary || JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();

  if (!options.command) {
    console.log('Usage: my-automaton <command> [options]');
    console.log('\nCommands:');
    console.log('  review     Review code file or directory');
    console.log('  analyze    Analyze text content');
    console.log('  summarize  Summarize text or file');
    console.log('\nOptions:');
    console.log('  --api-key <key>     Your API key (required)');
    console.log('  --file <path>       File to process');
    console.log('  --dir <path>        Directory to process (review only)');
    console.log('  --text <text>       Text to process');
    console.log('  --language <lang>   Programming language (auto-detected)');
    console.log('  --output <format>   Output format: text or json (default: text)');
    console.log('\nExamples:');
    console.log('  my-automaton review --api-key am_xxx --file src/app.js');
    console.log('  my-automaton analyze --api-key am_xxx --text "Your text here"');
    console.log('  my-automaton summarize --api-key am_xxx --file README.md');
    process.exit(0);
  }

  if (!options.apiKey) {
    console.error('Error: --api-key is required');
    console.error('Get your API key at https://automation.songheng.vip/pricing.html');
    process.exit(1);
  }

  if (options.command === 'review') {
    if (options.file) {
      await reviewFile(options.file, options.apiKey, options.output);
    } else if (options.dir) {
      // TODO: Implement directory review
      console.error('Directory review coming soon. Use --file for now.');
      process.exit(1);
    } else {
      console.error('Error: --file or --dir is required');
      process.exit(1);
    }
  } else if (options.command === 'analyze') {
    if (options.text) {
      await analyzeText(options.text, options.apiKey, options.output);
    } else if (options.file) {
      const text = fs.readFileSync(options.file, 'utf-8');
      await analyzeText(text, options.apiKey, options.output);
    } else {
      console.error('Error: --text or --file is required');
      process.exit(1);
    }
  } else if (options.command === 'summarize') {
    if (options.text) {
      await summarizeText(options.text, options.apiKey, options.output);
    } else if (options.file) {
      const text = fs.readFileSync(options.file, 'utf-8');
      await summarizeText(text, options.apiKey, options.output);
    } else {
      console.error('Error: --text or --file is required');
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${options.command}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
