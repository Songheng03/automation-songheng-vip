# AI Code Review Action

Automatic AI-powered code review on every pull request. Catches bugs, security vulnerabilities, and performance issues before they reach production.

## Features

- 🔍 **Deep Analysis**: Reviews every line of code for bugs, security issues, and anti-patterns
- 📊 **Inline Comments**: Posts review findings directly on changed lines
- ⚡ **Fast**: Reviews complete in 10-30 seconds
- 🔒 **Secure**: Your code is never stored or logged
- 💰 **Pay-per-use**: Only 5¢ per review with USDC micropayments
- 🆓 **Free Tier**: 3 free reviews per day to get started

## Quick Start

### 1. Get your API key

Visit [automation.songheng.vip](https://automation.songheng.vip) and purchase a credit pack:
- Starter: HK$38 for 500 credits (100 reviews)
- Pro: HK$78 for 1100 credits (220 reviews)
- Team: HK$198 for 3000 credits (600 reviews)

### 2. Add the workflow to your repo

Create `.github/workflows/ai-code-review.yml`:

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
      
      - name: AI Code Review
        uses: automation-songheng/ai-code-review-action@v1
        with:
          api-key: ${{ secrets.AI_REVIEW_KEY }}
```

### 3. Add your API key as a secret

In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret

Name: `AI_REVIEW_KEY`  
Value: `am_your_key_here`

### 4. Done!

Every new PR will automatically get reviewed. You'll see inline comments on any issues found.

## Example Output

When a PR is opened, the action posts a summary comment like this:

```
## ⚠️ AI Code Review Summary

| Metric | Value |
|--------|-------|
| Files Reviewed | 5 |
| Issues Found | 3 |
| Review Level | standard |

### Issues Found

1. **src/auth.js**: Potential SQL injection vulnerability in user query
2. **src/api.js**: Missing error handling in database connection
3. **src/utils.js**: Inefficient nested loop could be optimized

---

Powered by my-automaton AI Code Review
```

It also posts inline comments on the specific lines with issues.

## Configuration

You can customize the action with these inputs:

```yaml
- name: AI Code Review
  uses: automation-songheng/ai-code-review-action@v1
  with:
    api-key: ${{ secrets.AI_REVIEW_KEY }}
    review-level: deep  # summary, standard, or deep
    max-files: 15       # max files to review per PR
    languages: javascript,python,go  # comma-separated list
```

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `api-key` | Your API key (required) | - |
| `review-level` | Review depth: `summary`, `standard`, or `deep` | `standard` |
| `max-files` | Maximum files to review per PR | `10` |
| `languages` | Comma-separated languages to review | all detected |

### Outputs

| Output | Description |
|--------|-------------|
| `review-summary` | Summary text of findings |
| `files-reviewed` | Number of files reviewed |
| `issues-found` | Number of issues detected |

## How It Works

1. **Trigger**: Action runs on `pull_request` events
2. **Diff**: Gets the PR diff from GitHub API
3. **Analyze**: Sends code changes to AI review API
4. **Comment**: Posts summary + inline comments on issues
5. **Complete**: Action finishes with success/failure status

## Pricing

- **Free tier**: 3 reviews per day per IP
- **Paid**: 5¢ per review (1 credit = 1 review)
- **No subscription**: Pay only for what you use
- **Credits never expire**

Purchase credits at [automation.songheng.vip](https://automation.songheng.vip)

## Privacy & Security

- Your code is sent to our API for analysis
- We never store your code permanently
- We never use your code for training
- All communication is encrypted (HTTPS)
- API keys are scoped to your account only

## Support

- 📧 Email: support@songheng.vip
- 💬 Discord: [Join our community](https://discord.gg/automation)
- 📖 Docs: [automation.songheng.vip/docs](https://automation.songheng.vip/docs)

## License

MIT License - see LICENSE file for details

---

Built with ❤️ by [my-automaton](https://automation.songheng.vip)
