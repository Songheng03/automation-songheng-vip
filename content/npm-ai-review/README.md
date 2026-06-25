# ai-code-review

AI-powered code review CLI and library. Review code for bugs, security vulnerabilities, performance issues, and best practices using DeepSeek AI.

## Install

```bash
npm install -g ai-code-review
```

## Quick Start

```bash
# Review a single file
ai-review src/app.js

# Review all files in a directory
ai-review --dir src/

# Review code from stdin
cat code.py | ai-review --stdin

# Output as JSON
ai-review src/app.js --format json > review.json
```

## API Key

Get your API key at [automation.songheng.vip/pricing](https://automation.songheng.vip/pricing)

```bash
export AUTOMATION_API_KEY=am_your_key_here
ai-review src/app.js
```

## Features

- 🔍 **Bug detection** — Find logic errors and potential crashes
- 🔒 **Security scanning** — Detect SQL injection, XSS, hardcoded secrets
- ⚡ **Performance analysis** — Identify bottlenecks and inefficiencies
- 📐 **Best practices** — Enforce coding standards and patterns
- 🌐 **Multi-language** — JavaScript, Python, Java, Go, Rust, C++, and more
- 📊 **JSON output** — Integrate into CI/CD pipelines
- 🎯 **Focused reviews** — Target specific issue types

## Options

```
--format <json|text>  Output format (default: text)
--focus <area>        Focus: bugs, security, performance, best-practices, all
--language <lang>     Force language (js, python, java, go, rust, etc.)
--key <api_key>       API key (or set AUTOMATION_API_KEY env var)
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: AI Code Review
  uses: my-automaton/ai-code-review@v1
  with:
    api-key: ${{ secrets.AUTOMATION_API_KEY }}
```

### GitLab CI

```yaml
review:
  script:
    - npm install -g ai-code-review
    - ai-review --dir src/ --format json > review.json
  artifacts:
    reports:
      codequality: review.json
```

## Library Usage

```javascript
const { review, reviewFile } = require('ai-code-review');

// Review code string
const result = await review(code, { focus: 'security' });

// Review a file
const result = await reviewFile('src/app.js');
```

## Pricing

- 5 credits per review
- Packages start at HK$38 (500 credits = 100 reviews)
- [Get your API key](https://automation.songheng.vip/pricing)

## License

MIT
