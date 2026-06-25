"""Python client for my-automaton AI services."""

import json
import time
from typing import Any, Dict, List, Optional

import requests

from .exceptions import (
    AuthenticationError,
    InsufficientCreditsError,
    RateLimitError,
    ServiceError,
)

BASE_URL = "https://automation.songheng.vip"
FREE_BASE = f"{BASE_URL}/free"
PREMIUM_BASE = f"{BASE_URL}/v1"


class AutomatonClient:
    """Client for my-automaton AI services.

    Provides access to code review, text analysis, security scanning,
    summarization, and more — with automatic free/premium tier handling.

    Args:
        api_key: Premium API key (get by purchasing a plan at automation.songheng.vip).
        base_url: API base URL (default: https://automation.songheng.vip).
        timeout: Request timeout in seconds (default: 60).
        retries: Number of retries on server errors (default: 2).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = BASE_URL,
        timeout: int = 60,
        retries: int = 2,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})
        if api_key:
            self._session.headers.update({"X-API-Key": api_key})

    # ── Free Tier (3 requests/day/IP, no key needed) ──────────────

    def analyze_text(self, text: str, mode: str = "analyze") -> Dict[str, Any]:
        """Analyze text structure, sentiment, and key themes (free tier)."""
        return self._call_free("analyze", {"text": text, "mode": mode})

    def summarize(self, text: str, max_length: int = 200) -> Dict[str, Any]:
        """Generate an AI summary (free tier)."""
        return self._call_free("summarize", {
            "text": text,
            "max_length": max_length,
        })

    def review_code(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Review code for bugs, style, and improvements (free tier)."""
        return self._call_free("review", {
            "code": code,
            "language": language,
        })

    def security_scan(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Scan code for security vulnerabilities (free tier)."""
        return self._call_free("security", {
            "code": code,
            "language": language,
        })

    def explain_code(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Get a plain-English explanation of code (free tier)."""
        return self._call_free("explain", {
            "code": code,
            "language": language,
        })

    def refactor_code(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Get refactoring suggestions (free tier)."""
        return self._call_free("refactor", {
            "code": code,
            "language": language,
        })

    def analyze_complexity(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Analyze code complexity (free tier)."""
        return self._call_free("complexity", {
            "code": code,
            "language": language,
        })

    # ── Premium Tier (credit-based, requires API key) ─────────────

    def premium_analyze(self, text: str, mode: str = "deep") -> Dict[str, Any]:
        """Deep text analysis with premium model (costs 1 credit)."""
        return self._call_premium("analyze", {"text": text, "mode": mode})

    def premium_summarize(self, text: str, max_length: int = 500) -> Dict[str, Any]:
        """Premium summarization with configurable length (costs 2 credits)."""
        return self._call_premium("summarize", {
            "text": text,
            "max_length": max_length,
        })

    def premium_review(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Full code review with detailed report (costs 5 credits)."""
        return self._call_premium("review", {
            "code": code,
            "language": language,
        })

    def premium_security(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Deep security vulnerability scan (costs 3 credits)."""
        return self._call_premium("security", {
            "code": code,
            "language": language,
        })

    def premium_explain(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Detailed code explanation (costs 2 credits)."""
        return self._call_premium("explain", {
            "code": code,
            "language": language,
        })

    def premium_refactor(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Professional refactoring suggestions (costs 5 credits)."""
        return self._call_premium("refactor", {
            "code": code,
            "language": language,
        })

    def premium_complexity(self, code: str, language: str = "auto") -> Dict[str, Any]:
        """Detailed complexity analysis with Big-O (costs 2 credits)."""
        return self._call_premium("complexity", {
            "code": code,
            "language": language,
        })

    def batch_process(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch process up to 10 items at once (costs 5 credits).

        Each item must have 'service' (analyze|summarize|review|security|explain|refactor|complexity)
        and 'payload' (dict with text/code content).
        """
        return self._call_premium("batch", {"items": items})

    # ── Account & Status ─────────────────────────────────────────

    def check_credits(self) -> Dict[str, Any]:
        """Check remaining credits for your API key."""
        if not self.api_key:
            return {"error": "No API key configured. Purchase one at automation.songheng.vip"}
        return self._get(f"{self.base_url}/api/credits")

    def check_free_remaining(self) -> Dict[str, Any]:
        """Check remaining free requests for today."""
        return self._get(f"{self.base_url}/api/free-remaining")

    # ── Internal helpers ─────────────────────────────────────────

    def _call_free(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/free/{endpoint}"
        return self._post(url, data)

    def _call_premium(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.api_key:
            raise AuthenticationError(
                "Premium endpoint requires an API key. "
                "Purchase one at https://automation.songheng.vip"
            )
        url = f"{self.base_url}/v1/{endpoint}"
        return self._post(url, data)

    def _post(self, url: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for attempt in range(self.retries + 1):
            try:
                resp = self._session.post(
                    url,
                    json=data,
                    timeout=self.timeout,
                )
                return self._handle_response(resp)
            except (requests.ConnectionError, requests.Timeout) as e:
                if attempt < self.retries:
                    time.sleep(1 * (attempt + 1))
                    continue
                raise ServiceError(f"Request failed after {self.retries + 1} attempts: {e}")

    def _get(self, url: str) -> Dict[str, Any]:
        resp = self._session.get(url, timeout=self.timeout)
        return self._handle_response(resp)

    def _handle_response(self, resp: requests.Response) -> Dict[str, Any]:
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise AuthenticationError(resp.json().get("error", "Invalid API key"))
        elif resp.status_code == 402:
            raise InsufficientCreditsError(
                resp.json().get("error", "Insufficient credits. Purchase more at automation.songheng.vip")
            )
        elif resp.status_code == 429:
            raise RateLimitError(
                resp.json().get("error", "Rate limit exceeded. Try again later or get a premium API key.")
            )
        else:
            try:
                detail = resp.json()
            except (json.JSONDecodeError, ValueError):
                detail = {"status": resp.status_code}
            raise ServiceError(
                f"Service error ({resp.status_code}): {detail.get('error', 'Unknown error')}"
            )


# ── Convenience shortcut ──────────────────────────────────────

def automaton(api_key: Optional[str] = None) -> AutomatonClient:
    """Quick-start: create a client with one function call.

    Usage:
        from my_automaton import automaton
        client = automaton("your_api_key_here")
        result = client.premium_review("def hello(): pass")
    """
    return AutomatonClient(api_key=api_key)
