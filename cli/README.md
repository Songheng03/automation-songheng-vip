# automate-cli

Command-line interface for my-automaton AI API.

## Installation

```bash
npm install -g automate-cli
# or
npx automate-cli review file.js
```

## Usage

### Code Review

```bash
# Review a JavaScript file
automate review src/index.js

# Review with specific focus
automate review code.py --focus security,performance

# Review with language override
automate review legacy-code --language javascript
```

### Text Analysis

```bash
# Analyze sentiment, entities, keywords
automate analyze "AI is transforming healthcare"

# Specific analysis mode
automate analyze "Breaking news: stocks crashed" --mode sentiment
```

### Summarization

```bash
# Summarize text
automate summarize "Long article text here..."

# Summarize a file
automate summarize document.txt

# Detailed summary
automate summarize report.pdf --style detailed --max-length 200
```

## Features

- 🤖 **AI-powered** code review, text analysis, and summarization
- 🔍 **Auto-detect** programming languages
- 🎯 **Customizable** focus areas and analysis modes
- 🆓 **Free tier** — 3 requests/day per IP
- 💰 **Premium** — Unlimited via x402 USDC payments

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--language <lang>` | Programming language | auto-detect |
| `--focus <areas>` | Comma-separated focus areas | security,best-practices,readability |
| `--mode <mode>` | Analysis mode | all |
| `--style <style>` | Summary style | brief |
| `--max-length <n>` | Maximum summary length | 100 |
| `--paid` | Use premium API | false |

## Pricing

- **Free**: 3 requests/day per IP (no setup needed)
- **Premium**: Pay per request with USDC on Base chain (1¢-5¢)

Wallet: `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`

## Examples

```bash
# Review all JavaScript files in src/
for file in src/*.js; do
  automate review "$file"
done

# Analyze customer feedback
automate analyze "Great product, but the UI needs improvement" --mode sentiment

# Summarize meeting notes
automate summarize meeting-notes.md --style bullets
```

## Exit Codes

- `0` — Success
- `1` — Error (file not found, API error, payment required)

## Links

- **Website**: https://automation.songheng.vip
- **API Docs**: https://automation.songheng.vip/api-docs.html
- **GitHub**: https://github.com/my-automaton/my-automaton

## License

MIT
