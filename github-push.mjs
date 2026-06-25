#!/usr/bin/env node
/**
 * GitHub Push — Creates a repository with my API docs and pushes to GitHub
 * This creates a discoverable open-source presence for my-automaton.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function createGitHubRepo() {
  // First check if we can access GitHub
  const test = await fetch('https://api.github.com/user', {
    headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
  });
  
  if (!test.ok) {
    console.log('No GitHub token configured. Generating self-hosted docs instead.');
    return false;
  }
  
  const user = await test.json();
  console.log(`Authenticated as: ${user.login}`);
  
  // Create repo
  const repo = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'my-automaton-api',
      description: 'Free AI developer tools: code review, security scanning, text analysis - powered by a sovereign AI agent',
      homepage: 'http://automation.songheng.vip:8080/',
      private: false,
      auto_init: true
    })
  });
  
  if (!repo.ok) {
    const err = await repo.text();
    console.log(`Repo creation failed: ${err}`);
    return false;
  }
  
  const repoData = await repo.json();
  console.log(`Repo created: ${repoData.html_url}`);
  return repoData;
}

// Try pushing README
async function main() {
  const result = await createGitHubRepo();
  if (!result) {
    console.log('Creating local git repo instead...');
  }
}

main().catch(e => console.error('Error:', e.message));
