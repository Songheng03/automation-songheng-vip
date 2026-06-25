# @my-automaton/cli

Command-line AI code review, analysis, and summarization tool.

## Installation

```bash
npm install -g @my-automaton/cli
```

## Get Your API Key

1. Visit [automation.songheng.vip/pricing.html](https://automation.songheng.vip/pricing.html)
2. Purchase credits (Starter: 500 credits for $5)
3. Copy your API key: `am_xxxxxxxx`

## Usage

### Review Code

```bash
# Review a single file
my-automaton review --api-key am_xxx --file src/app.js

# Review with JSON output
my-automaton review --api-key am_xxx --file src/app.js --output json
```

### Analyze Text

```bash
# Analyze inline text
my-automaton analyze --api-key am_xxx --text "Your text here"

# Analyze a file
my-automaton analyze --api-key am_xxx --file README.md
```

### Summarize

```bash
# Summarize text
my-automaton summarize --api-key am_xxx --text "Long document..."

# Summarize a file
my-automaton summarize --api-key am_xxx --file article.md
```

## Options

| Option | Required | Description |
|--------|----------|-------------|
| `--api-key` | Yes | Your my-automaton API key |
| `--file` | No* | File path to process |
| `--text` | No* | Text to process |
| `--output` | No | Output format: `text` (default) or `json` |
| `--language` | No | Programming language (auto-detected for code) |

*Either `--file` or `--text` is required

## Pricing

- Code review: **5¢ per file** (5 credits)
- Text analysis: **1¢ per request** (1 credit)
- Summarization: **2¢ per request** (2 credits)

Starter plan (500 credits) = 100 code reviews or 500 analyses.

## Examples

```bash
# Review a Python file
my-automaton review --api-key am_xxx --file models/user.py

# Analyze a log file
my-automaton analyze --api-key am_xxx --file server.log

# Summarize documentation
my-automaton summarize --api-key am_xxx --file docs/api.md --output json > summary.json

# Review multiple files (with shell loop)
for file in src/*.js; do
  my-automaton review --api-key am_xxx --file "$file"
done
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: AI Code Review
  run: |
    npm install -g @my-automaton/cli
    my-automaton review \
      --api-key ${{ secrets.MY_AUTOMATON_KEY }} \
      --file src/index.js \
      --output json > review.json
```

### GitLab CI

```yaml
review:
  script:
    - npm install -g @my-automaton/cli
    - my-automaton review --api-key $MY_AUTOMATON_KEY --file src/main.py
```

## Supported Languages

Auto-detected by file extension:
- JavaScript/TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`)
- Python (`.py`)
- Java (`.java`)
- Go (`.go`)
- Rust (`.rs`)
- Ruby (`.rb`)
- PHP (`.php`)
- C/C++ (`.c`, `.cpp`)
- C# (`.cs`)
- HTML/CSS (`.html`, `.css`)
- SQL (`.sql`)
- Shell scripts (`.sh`)
- Markdown (`.md`)

## Troubleshooting

### "Insufficient credits"
Purchase more at [automation.songheng.vip/pricing.html](https://automation.songheng.vip/pricing.html)

### "API key required"
Add `--api-key am_xxx` to your command

### "File not found"
Check the file path is correct

## Support

- **Docs**: [automation.songheng.vip/api-docs.html](https://automation.songheng.vip/api-docs.html)
- **Issues**: [github.com/my-automaton/cli/issues](https://github.com/my-automaton/cli/issues)
- **Email**: support@automation.songheng.vip

## License

MIT
