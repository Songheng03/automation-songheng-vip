# GitHub Action: AI Code Review for Pull Requests

Automatically review every PR with AI. Costs 5¢ per review (or use free tier: 3/day).

## Setup

1. Create `.github/workflows/ai-review.yml` in your repo:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get changed files
        id: changed
        run: |
          echo "files<<EOF" >> $GITHUB_OUTPUT
          git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.event.pull_request.head.sha }} | grep -E '\.(js|ts|py|go|rs|java|cpp|c)$' >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: AI Code Review
        if: steps.changed.outputs.files != ''
        run: |
          FILES="${{ steps.changed.outputs.files }}"
          for file in $FILES; do
            if [ -f "$file" ]; then
              echo "Reviewing $file..."
              CODE=$(cat "$file")
              
              # Call AI Code Review API
              RESPONSE=$(curl -s -X POST https://automation.songheng.vip/free/review \
                -H "Content-Type: application/json" \
                -d "{
                  \"code\": $(echo "$CODE" | jq -Rs .),
                  \"language\": \"$(echo $file | grep -oE '\.[^.]+$' | tr -d '.')\",
                  \"focus\": [\"security\", \"performance\", \"best-practices\"]
                }")
              
              # Post review comment
              if [ -n "$RESPONSE" ]; then
                echo "### 🤖 AI Review: $file" >> review.md
                echo "$RESPONSE" | jq -r '.review // "No issues found"' >> review.md
                echo "" >> review.md
              fi
            fi
          done

      - name: Post review comment
        if: steps.changed.outputs.files != ''
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            if (review.trim()) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: review
              });
            }
```

## How It Works

1. **Trigger**: Runs on every PR (opened or updated)
2. **Detect changes**: Gets list of changed code files
3. **Review each file**: Sends code to AI review API
4. **Post comment**: Adds review as PR comment

## Cost

- **Free tier**: 3 reviews/day per IP (GitHub Actions IP)
- **Paid**: 5¢ per review via USDC on Base chain
- **Typical PR**: 1-5 files = 5¢-25¢ (vs $15/month for CodeRabbit)

## Get API Credits

Buy credits at https://automation.songheng.vip/pricing.html

- Starter: $5 = 500 credits (100 reviews)
- Pro: $10 = 1100 credits (220 reviews)
- Team: $20 = 3000 credits (600 reviews)

## Example Output

```
### 🤖 AI Review: src/auth.js

**Security Issues:**
- Line 23: Hardcoded secret detected. Use environment variables.
- Line 45: SQL injection risk. Use parameterized queries.

**Performance:**
- Line 67: Nested loop O(n²). Consider using a Map for O(n).

**Best Practices:**
- Line 12: Function too long (85 lines). Split into smaller functions.
- Line 34: Magic number. Define as constant.

**Overall Score: 6.5/10**
```

## Advanced: Custom Review Focus

Change the `focus` parameter to customize:

```json
{
  "code": "...",
  "language": "javascript",
  "focus": ["security"]  // Only security issues
}
```

Options: `security`, `performance`, `best-practices`, `readability`, `maintainability`

## Self-Hosted Alternative

Want to run your own instance? The API is open-source:
https://automation.songheng.vip/api-docs.html

---

**Questions?** Open an issue or email support@songheng.vip
