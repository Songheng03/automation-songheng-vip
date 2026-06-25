# AI Code Review GitHub Action

Automatically review pull requests with AI-powered code analysis. Get instant feedback on code quality, security issues, and best practices.

## Features

- 🤖 **AI-Powered Analysis** — Deep code review using advanced AI models
- 🔒 **Security Scanning** — Detect vulnerabilities and security issues
- 📊 **Code Quality** — Identify code smells and anti-patterns
- 💡 **Best Practices** — Suggestions for cleaner, more maintainable code
- 🚀 **Fast** — Reviews PRs in seconds
- 💰 **Pay Per Use** — Only $0.05 per review (5 credits)

## Setup

### 1. Get an API Key

Visit [automation.songheng.vip](https://automation.songheng.vip/get-started.html) to get your API key.

**Pricing:**
- Starter: $5 for 500 credits (100 reviews)
- Pro: $10 for 1,100 credits (220 reviews)
- Team: $20 for 3,000 credits (600 reviews)

### 2. Add to Your Repository

Create `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: AI Code Review
        uses: my-automaton/ai-code-review@v1
        with:
          api-key: ${{ secrets.AUTOMATON_API_KEY }}
```

### 3. Add API Key to Secrets

1. Go to your repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `AUTOMATON_API_KEY`
5. Value: Your API key from step 1

## Usage

Every time a pull request is opened or updated, the action will:

1. Scan all changed code files (`.js`, `.ts`, `.py`, `.go`, `.rs`, `.java`, etc.)
2. Send them to the AI for review
3. Post a detailed review comment on the PR with:
   - Code quality issues
   - Security vulnerabilities
   - Performance concerns
   - Best practice violations
   - Suggestions for improvement

## Example Review Output

```markdown
## 🤖 AI Code Review

### 📄 src/utils/auth.js

**Issues Found:**

🔒 **Security Issues:**
- Line 15: Hardcoded API key detected. Use environment variables instead.
- Line 23: SQL injection vulnerability. Use parameterized queries.

⚠️ **Code Quality:**
- Line 8: Function is too long (45 lines). Consider breaking it down.
- Line 31: Magic number detected. Extract to named constant.

💡 **Suggestions:**
- Add input validation for user-provided data
- Consider using async/await for better error handling
- Add JSDoc comments for public functions

**Score: 65/100**
```

## Supported Languages

- JavaScript / TypeScript
- Python
- Go
- Rust
- Java
- C / C++
- Ruby
- PHP

## Cost

Each PR review costs **5 credits** ($0.05). Most teams spend $5-20/month on code reviews.

**Free Tier:** 3 free reviews per day per IP for testing.

## Troubleshooting

### "No files to review"
The action only reviews added or modified files in the PR. If no code files were changed, no review is performed.

### "API key invalid"
Make sure you've added your API key to repository secrets as `AUTOMATON_API_KEY`.

### "Rate limit exceeded"
You've used all your credits. Purchase more at [automation.songheng.vip](https://automation.songheng.vip/pricing.html).

## Support

- 📖 [API Documentation](https://automation.songheng.vip/api-docs.html)
- 💬 [GitHub Discussions](https://github.com/my-automaton/ai-code-review/discussions)
- 📧 support@songheng.vip

## License

MIT
