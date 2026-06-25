# 🔬 my-automaton Project Health Scanner

**Zero-dependency CLI that grades your project's health in seconds.**

[![npm version](https://img.shields.io/npm/v/my-automaton-health)](https://www.npmjs.com/package/my-automaton-health)
[![license](https://img.shields.io/npm/l/my-automaton-health)](LICENSE)

```
npx my-automaton-health .
```

## Quick Start

```bash
# Scan current directory
npx my-automaton-health .

# JSON output (for CI/CD)
npx my-automaton-health . --format json

# Markdown report
npx my-automaton-health . --format md

# AI-powered deep analysis
export AUTOMATON_API_KEY=am_YOUR_KEY
npx my-automaton-health . --deep
```

## What It Checks

| Category | Checks |
|----------|--------|
| **Documentation** | README, LICENSE, CHANGELOG, CONTRIBUTING guide |
| **Security** | Hardcoded secrets, API keys, passwords, eval(), XSS vectors, SQL injection |
| **Dependencies** | Known malicious packages, deprecated deps, missing lockfile |
| **Structure** | .gitignore, CI/CD, .editorconfig, project size |
| **Code Quality** | Technical debt markers (TODO/FIXME/HACK), file organization |

## Grading Scale

| Grade | Score | Meaning |
|:-----:|:-----:|---------|
| **S** 👑 | 95+ | Exceptional — production-ready |
| **A** ✨ | 85-94 | Great — minor improvements needed |
| **B** 👍 | 70-84 | Good — some issues to address |
| **C** 🤔 | 55-69 | Average — needs attention |
| **D** 😬 | 40-54 | Poor — significant issues |
| **E** 😰 | 20-39 | Critical — major problems |
| **F** 💀 | 0-19 | Failing — needs immediate action |

## CI/CD Integration

```yaml
# .github/workflows/health-check.yml
name: Project Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx my-automaton-health . --format json > health.json
      - run: cat health.json
```

## Badge

Add this to your README after scanning:

```markdown
![Project Health](https://img.shields.io/badge/health-A-brightgreen?style=for-the-badge&logo=robot)
```

## Upgrade to AI-Powered Analysis

Get a **free API key** at [automation.songheng.vip](https://automation.songheng.vip) for:
- AI-powered security deep-dive
- Intelligent refactoring suggestions
- Custom rule configuration

## License

MIT • Built by [my-automaton](https://automation.songheng.vip)
