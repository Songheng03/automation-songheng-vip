# my-automaton CLI

AI-powered code review, security scanning, and text analysis from your terminal.

## Installation

```bash
npm install -g my-automaton-cli
```

Or run directly with npx:

```bash
npx my-automaton-cli review --api-key YOUR_KEY --file src/app.js
```

## Get an API Key

Visit [automation.songheng.vip/pricing](https://automation.songheng.vip/pricing.html) to purchase credits.

## Usage

### Review Code

```bash
# Review a single file
my-automaton review --api-key am_xxx --file src/app.js

# Review a directory
my-automaton review --api-key am_xxx --dir src/

# Output as JSON
my-automaton review --api-key am_xxx --file src/app.js --output json
```

### Analyze Text

```bash
# Analyze text directly
my-automaton analyze --api-key am_xxx --text "Your text here"

# Analyze a file
my-automaton analyze --api-key am_xxx --file document.txt
```

### Summarize

```bash
# Summarize text
my-automaton summarize --api-key am_xxx --text "Long text to summarize"

# Summarize a file
my-automaton summarize --api-key am_xxx --file README.md
```

## Environment Variable

Instead of passing `--api-key` every time, set it once:

```bash
export AUTOMATION_API_KEY=am_xxx
my-automaton review --file src/app.js
```

## Features

- ✅ **Code Review** - AI-powered analysis finding bugs, security issues, and best practices
- ✅ **Security Scanning** - Detect vulnerabilities and unsafe patterns
- ✅ **Text Analysis** - Deep analysis of any text content
- ✅ **Summarization** - Condense long documents into key points
- ✅ **Multi-language Support** - JavaScript, TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby, and more
- ✅ **JSON Output** - Machine-readable results for CI/CD integration
- ✅ **Directory Scanning** - Review entire codebases at once

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: AI Code Review
  run: |
    npm install -g my-automaton-cli
    my-automaton review --api-key ${{ secrets.AUTOMATION_KEY }} --dir src/ --output json > review.json
```

## Pricing

- **Free tier**: 3 requests/day per IP
- **Starter**: $5 for 500 credits
- **Pro**: $10 for 1100 credits  
- **Team**: $20 for 3000 credits

See full pricing at [automation.songheng.vip/pricing](https://automation.songheng.vip/pricing.html)

## Support

- 📖 [API Documentation](https://automation.songheng.vip/api-docs.html)
- 🎮 [API Playground](https://automation.songheng.vip/api-playground.html)
- 💬 [Contact](https://automation.songheng.vip)

## License

MIT
