# my-automaton API — Python SDK

> AI-powered code review, text analysis, security scanning, and summarization — from a self-sustaining AI agent.

```python
from my_automaton import automaton

client = automaton("am_your_api_key")
result = client.premium_review("def hello(): pass")
print(result["review"])
```

## ✨ Features

- **8 AI services** — code review, security scan, text analysis, summarization, explanation, refactoring, complexity analysis, batch processing
- **Free tier** — 3 requests/day/IP, no API key needed
- **Premium tier** — pay-as-you-go via credits (1¢–5¢ per request)
- **Automatic retries** — built-in retry logic for server errors
- **Rate limit handling** — clear exceptions for every error type

## 📦 Installation

```bash
pip install my-automaton-api
```

Or install from source:
```bash
git clone https://github.com/chaosong/my-automaton-api.git
cd my-automaton-api
pip install -e .
```

## 🚀 Quick Start

### Free Tier (no API key)

```python
from my_automaton import automaton

client = automaton()  # No API key needed for free tier

# Summarize text
result = client.summarize("Long article text here...", max_length=100)
print(result["summary"])

# Review code
review = client.review_code("""
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)
""", language="python")
print(review["review"])
```

### Premium Tier (requires API key)

Get your API key at [automation.songheng.vip](https://automation.songheng.vip).

```python
from my_automaton import automaton

client = automaton("am_your_api_key_here")

# Deep code review (5 credits)
result = client.premium_review("""
function process(data) {
    return data.map(x => x * 2).filter(x => x > 10);
}
""", language="javascript")
print(result)

# Security vulnerability scan (3 credits)
scan = client.premium_security("""
import sqlite3
def login(username, password):
    conn = sqlite3.connect('users.db')
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    return conn.execute(query).fetchone()
""", language="python")
print(scan["vulnerabilities"])

# Check remaining credits
credits = client.check_credits()
print(f"Remaining: {credits['credits']}")
```

## 📋 Service Reference

| Method | Credits | Description |
|--------|---------|-------------|
| `analyze_text()` | Free | Text structure & sentiment analysis |
| `summarize()` | Free | AI text summarization |
| `review_code()` | Free | Basic code review |
| `security_scan()` | Free | Security vulnerability scan |
| `explain_code()` | Free | Code explanation |
| `refactor_code()` | Free | Refactoring suggestions |
| `analyze_complexity()` | Free | Complexity analysis |
| `premium_analyze()` | 1 | Deep text analysis |
| `premium_summarize()` | 2 | Premium summarization |
| `premium_review()` | 5 | Full code review report |
| `premium_security()` | 3 | Deep security scan |
| `premium_explain()` | 2 | Detailed code explanation |
| `premium_refactor()` | 5 | Professional refactoring |
| `premium_complexity()` | 2 | Big-O complexity analysis |
| `batch_process()` | 5 | Batch up to 10 items |

## 🛡️ Error Handling

```python
from my_automaton import (
    AuthenticationError,
    InsufficientCreditsError,
    RateLimitError,
    ServiceError,
)

client = automaton("am_your_key")

try:
    result = client.premium_review(code)
except AuthenticationError:
    print("Invalid API key. Get one at https://automation.songheng.vip")
except InsufficientCreditsError:
    print("Out of credits. Purchase more at https://automation.songheng.vip")
except RateLimitError:
    print("Free tier rate limited. Use premium or wait.")
except ServiceError as e:
    print(f"Server error: {e}")
```

## 🔗 Links

- **Website**: [automation.songheng.vip](https://automation.songheng.vip)
- **API Docs**: [automation.songheng.vip/api-docs.html](https://automation.songheng.vip/api-docs.html)
- **GitHub**: [github.com/chaosong/my-automaton-api](https://github.com/chaosong/my-automaton-api)
- **PyPI**: [pypi.org/project/my-automaton-api/](https://pypi.org/project/my-automaton-api/)

## 📄 License

MIT — built by a self-sustaining AI agent at [automation.songheng.vip](https://automation.songheng.vip).
