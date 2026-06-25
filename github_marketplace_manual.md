# GitHub Marketplace Submission Guide — AI Code Review Action

> **Status:** Manual submission required (no GitHub token available in this environment)
> **Project:** my-automaton AI Code Review Action
> **Generated:** 2026-06-17

---

## 📦 Files Included

The following files constitute the GitHub Action package:

| File | Path | Description |
|------|------|-------------|
| `action.yml` | `/root/automaton/github-action/action.yml` | Action metadata, inputs, branding, and run configuration |
| `index.js` | `/root/automaton/github-action/index.js` | Main action code (Node.js 20, uses `@actions/core` + `@actions/github`) |
| `package.json` | `/root/automaton/github-action/package.json` | Dependencies (`@actions/core@^1.10.1`, `@actions/github@^6.0.0`) |
| `README.md` | `/root/automaton/github-action/README.md` | Usage documentation, examples, pricing table |
| `.gitignore` | `/root/automaton/github-action/.gitignore` | Standard ignores |
| `publish-action.sh` | `/root/automaton/github-action/publish-action.sh` | Automated publish script (requires GITHUB_TOKEN) |

---

## 📋 Step-by-Step Manual Submission

### Step 1: Create the GitHub Repository

1. Go to https://github.com/new
2. Repository name: **`ai-code-review-action`**
3. Owner: **`chaosong`** (or your GitHub username)
4. Description: "Automated AI code review for pull requests. Analyzes diffs for bugs, security issues, and best practices."
5. Visibility: **Public**
6. Initialize: DO NOT check "Add a README" (we'll add our files)
7. Click **Create repository**

### Step 2: Upload Action Files

After creating the repo, upload the following files:

#### Option A: Via GitHub Web UI
1. On the repo page, click **Add file → Upload files**
2. Drag and drop these files:
   - `action.yml` (see content below)
   - `index.js` (see content below)
   - `package.json` (see content below)
   - `README.md` (see content below)
   - `.gitignore` (content: `node_modules/` and `*.log`)
3. Commit message: `v1.0.0: AI Code Review Action — automated PR reviews via my-automaton API`
4. Click **Commit changes**

#### Option B: Via Git Clone (from your local machine)
```bash
# Clone the repo
git clone https://github.com/chaosong/ai-code-review-action.git
cd ai-code-review-action

# Copy action files from this container
# (Run this on the host, not inside the container)
cp /root/automaton/github-action/* .

# Commit and push
git add -A
git commit -m "v1.0.0: AI Code Review Action"
git tag -a v1.0.0 -m "v1.0.0"
git push origin main --tags
```

### Step 3: Create a Release (Required for Marketplace)

1. Go to https://github.com/chaosong/ai-code-review-action/releases/new
2. Tag: **`v1.0.0`**
3. Release title: **`v1.0.0`**
4. Description:
```
## AI Code Review Action v1.0.0

Automated AI-powered code review for pull requests.

### Features
- 🔍 Analyzes PR diffs for bugs, security issues, and best practices
- 🏷️ Categorizes issues by severity (critical, high, medium, low)
- 💡 Provides fix suggestions for each issue
- 📊 Overall code quality score
- ⚡ Powered by my-automaton sovereign AI agent

### Usage
```yaml
- uses: chaosong/ai-code-review-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    api-key: ${{ secrets.AUTOMATON_API_KEY }}
```

See README.md for full documentation.
```
5. **IMPORTANT:** Check the box **"Publish this Action to the GitHub Marketplace"**
6. Click **Publish release**

### Step 4: Verify Marketplace Listing

1. Go to https://github.com/marketplace
2. Check if "AI Code Review" appears
3. The listing URL will be: **https://github.com/marketplace/actions/ai-code-review**
4. Verify the action's branding appears correctly
5. Test the action in a sample repository

### Step 5: Configure Marketplace Listing Details

After publishing, you can enhance the Marketplace listing:

1. Go to the action page on Marketplace
2. Click **Manage listing**
3. Add:
   - **Overview:** Paste content from README.md
   - **Categories:** Code review, Code quality, AI
   - **Supported languages:** JavaScript, TypeScript, Python, Go, Rust, Solidity, Java, Ruby, PHP, C++
   - **Screenshots:** Add screenshots of the review output
4. Save changes

---

## 📄 File Contents

### action.yml

```yaml
name: 'AI Code Review'
description: 'Automated AI code review for pull requests. Analyzes diffs for bugs, security issues, and best practices.'
author: 'my-automaton'
branding:
  icon: 'code'
  color: 'blue'

inputs:
  github-token:
    description: 'GitHub token for posting comments'
    required: true
    default: ${{ github.token }}
  severity:
    description: 'Minimum severity level (critical, high, medium, low, all)'
    required: false
    default: 'medium'
  endpoint:
    description: 'API endpoint for the automaton service'
    required: false
    default: 'https://automation.songheng.vip'
  max-comments:
    description: 'Maximum number of comments to post'
    required: false
    default: '10'
  api-key:
    description: 'Your automaton API key (get one from https://automation.songheng.vip/pricing)'
    required: true

runs:
  using: 'node20'
  main: 'index.js'
```

### package.json

```json
{
  "name": "ai-code-review-action",
  "version": "1.0.0",
  "description": "AI-powered code review for GitHub PRs",
  "main": "index.js",
  "dependencies": {
    "@actions/core": "^1.10.1",
    "@actions/github": "^6.0.0"
  }
}
```

### index.js

The main action code (see actual file at `/root/automaton/github-action/index.js`).

### README.md

Full documentation with usage examples, inputs table, pricing, etc. (see actual file at `/root/automaton/github-action/README.md`).

---

## 🔧 Usage in Workflow

Users can add this to their `.github/workflows/code-review.yml`:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: chaosong/ai-code-review-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          api-key: ${{ secrets.AUTOMATON_API_KEY }}
          severity: medium
          max-comments: 10
```

---

## ✅ Marketplace Submission Checklist

- [ ] Repository created at `github.com/chaosong/ai-code-review-action`
- [ ] `action.yml` uploaded and validated (actionlint)
- [ ] `index.js` uploaded
- [ ] `package.json` uploaded with correct dependencies
- [ ] `README.md` uploaded with full documentation
- [ ] Release created with `v1.0.0` tag
- [ ] "Publish to GitHub Marketplace" checkbox checked
- [ ] Marketplace listing verified
- [ ] Branding (icon: `code`, color: `blue`) visible in Marketplace
- [ ] API key instructions included in README
- [ ] License file (MIT) included

---

## 🔗 Important Links

- **Marketplace listing (after publish):** https://github.com/marketplace/actions/ai-code-review
- **Repository:** https://github.com/chaosong/ai-code-review-action
- **API docs:** https://automation.songheng.vip/api-docs
- **Pricing:** https://automation.songheng.vip/pricing
- **Publish script:** `publish-action.sh` (automatic, requires GITHUB_TOKEN)

---

## 📝 Notes

- The action uses Node.js 20 runtime (`runs.using: 'node20'`)
- Dependencies must be installed before publishing: `npm install` in the repo root
- The action calls the my-automaton API at `https://automation.songheng.vip/v1/review`
- Free tier: 3 reviews/day per IP
- Premium: API key required, starts at $5 for 500 credits
