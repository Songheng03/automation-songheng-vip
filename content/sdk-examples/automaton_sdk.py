#!/usr/bin/env python3
"""
my-automaton — Python SDK

One-liner install: pip install git+https://github.com/my-automaton/python-sdk.git

Usage:
    from automaton_sdk import Automaton
    
    # Free tier — no API key needed
    client = Automaton()
    result = client.review("def foo(): return 1")
    print(result)
    
    # Premium tier
    client = Automaton(api_key="am_your_key_here")
    result = client.security_scan("SELECT * FROM users WHERE id = " + id)
    print(result)
"""

import json
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE_URL = "https://automation.songheng.vip"
FREE_ENDPOINTS = {
    "review": "/api/free/review",
    "security": "/api/free/security",
    "complexity": "/api/free/complexity",
    "explain": "/api/free/explain",
    "refactor": "/api/free/refactor",
    "analyze": "/api/free/analyze",
    "summarize": "/api/free/summarize",
}

PREMIUM_ENDPOINTS = {
    "review": "/v1/review",
    "security": "/v1/security",
    "complexity": "/v1/complexity",
    "explain": "/v1/explain",
    "refactor": "/v1/refactor",
    "analyze": "/v1/analyze",
    "summarize": "/v1/summarize",
}


class Automaton:
    """Client for my-automaton AI code review and analysis API."""

    def __init__(self, api_key=None, base_url=BASE_URL):
        self.api_key = api_key or os.getenv("AUTOMATON_API_KEY")
        self.base_url = base_url.rstrip("/")
        self.free_mode = not self.api_key

    def _call(self, endpoint, data, text_field="code"):
        """Make an API call to the automaton service."""
        body = json.dumps({text_field: data}).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "automaton-python-sdk/1.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        else:
            endpoint = FREE_ENDPOINTS.get(
                [k for k, v in FREE_ENDPOINTS.items() if v == endpoint][0],
                "/api/free/" + endpoint.split("/")[-1] if "/" in endpoint else endpoint,
            )

        url = f"{self.base_url}{endpoint}"
        req = Request(url, data=body, headers=headers, method="POST")

        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except HTTPError as e:
            body = e.read().decode()
            if e.code == 402:
                raise RuntimeError(
                    "402 Payment Required — You've used your 3 free requests for today. "
                    "Get an API key at https://automation.songheng.vip/upgrade"
                ) from e
            if e.code == 401:
                raise ValueError(
                    "Invalid API key. Check your AUTOMATON_API_KEY or get one at "
                    "https://automation.songheng.vip/upgrade"
                ) from e
            raise RuntimeError(f"API error {e.code}: {body}") from e
        except Exception as e:
            raise RuntimeError(f"Connection error: {e}") from e

    # --- Free tier methods (no API key needed) ---

    def review(self, code: str) -> dict:
        """Full code review: bugs, security, performance, style."""
        return self._call("/api/free/review", code)

    def security_scan(self, code: str) -> dict:
        """Security vulnerability scan (OWASP Top 10)."""
        return self._call("/api/free/security", code)

    def complexity_analysis(self, code: str) -> dict:
        """Cyclomatic and cognitive complexity analysis."""
        return self._call("/api/free/complexity", code)

    def explain(self, code: str) -> dict:
        """Plain-English explanation of code."""
        return self._call("/api/free/explain", code)

    def refactor(self, code: str) -> dict:
        """Refactoring suggestions with before/after examples."""
        return self._call("/api/free/refactor", code)

    def analyze_text(self, text: str) -> dict:
        """Text analysis: sentiment, themes, writing quality."""
        return self._call("/api/free/analyze", text)

    def summarize(self, text: str) -> dict:
        """AI-powered text summarization."""
        return self._call("/api/free/summarize", text)

    # --- Premium tier methods (require API key) ---

    def premium_review(self, code: str) -> dict:
        """Premium code review (bypasses free limit)."""
        return self._call("/v1/review", code)

    def premium_security_scan(self, code: str) -> dict:
        """Premium security scan."""
        return self._call("/v1/security", code)

    def premium_complexity_analysis(self, code: str) -> dict:
        """Premium complexity analysis."""
        return self._call("/v1/complexity", code)

    def premium_explain(self, code: str) -> dict:
        """Premium code explanation."""
        return self._call("/v1/explain", code)

    def premium_refactor(self, code: str) -> dict:
        """Premium refactoring suggestions."""
        return self._call("/v1/refactor", code)

    def premium_analyze(self, text: str) -> dict:
        """Premium text analysis."""
        return self._call("/v1/analyze", text, text_field="text")

    def premium_summarize(self, text: str) -> dict:
        """Premium text summarization."""
        return self._call("/v1/summarize", text, text_field="text")


# CLI interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python automaton_sdk.py [service] [file_path_or_text]")
        print("Services: review, security, complexity, explain, refactor, analyze, summarize")
        print("Example: python automaton_sdk.py review myfile.py")
        sys.exit(1)

    service = sys.argv[1]
    arg = sys.argv[2]

    client = Automaton()
    method_map = {
        "review": client.review,
        "security": client.security_scan,
        "complexity": client.complexity_analysis,
        "explain": client.explain,
        "refactor": client.refactor,
        "analyze": client.analyze_text,
        "summarize": client.summarize,
    }

    fn = method_map.get(service)
    if not fn:
        print(f"Unknown service: {service}")
        print(f"Available: {', '.join(method_map.keys())}")
        sys.exit(1)

    if os.path.isfile(arg):
        with open(arg, "r") as f:
            content = f.read()
    else:
        content = arg

    result = fn(content)
    print(json.dumps(result, indent=2))
