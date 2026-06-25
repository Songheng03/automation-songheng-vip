#!/usr/bin/env python3
"""
MCP.so Submission Script
Attempts to submit the Premium Analysis MCP Server to MCP.so
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
import ssl
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://mcp.so"
API_SUBMIT = "/api/submit-project"
API_SESSION = "/api/auth/session"
API_CSRF = "/api/auth/csrf"
API_PROVIDERS = "/api/auth/providers"
API_USER_INFO = "/api/get-user-info"

SERVICE_NAME = "Premium Analysis MCP Server"
SERVICE_URL = "https://automation.songheng.vip"

SERVER_CONFIG = json.dumps({
    "mcpServers": {
        "premium-analysis": {
            "url": "https://automation.songheng.vip",
            "description": "7 premium analytical tools powered by x402 micropayments on Base USDC"
        }
    }
}, indent=2)


def create_session() -> http.cookiejar.CookieJar:
    """Create a cookie jar for persistent session"""
    cj = http.cookiejar.CookieJar()
    return cj


def make_request(url: str, method: str = "GET", data: dict = None,
                 cookies: http.cookiejar.CookieJar = None,
                 headers: dict = None) -> tuple:
    """Make an HTTP request and return (status_code, response_body, response_headers)"""
    if cookies is None:
        cookies = create_session()

    if headers is None:
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/submit",
        }

    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookies)
    )

    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
    else:
        req = urllib.request.Request(url, headers=headers, method=method)

    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        response = opener.open(req, timeout=30, context=ctx)
        body = response.read()
        return response.getcode(), body, dict(response.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return 0, str(e).encode(), {}


def check_session(cookies: http.cookiejar.CookieJar) -> dict:
    """Check if we have an active session"""
    status, body, headers = make_request(
        f"{BASE_URL}{API_SESSION}",
        cookies=cookies
    )
    if body.strip() == b"null" or body.strip() == b"":
        return {"authenticated": False}
    try:
        data = json.loads(body)
        if data and data.get("user"):
            return {"authenticated": True, "user": data["user"]}
        return {"authenticated": False}
    except (json.JSONDecodeError, TypeError):
        return {"authenticated": False, "raw": body.decode("utf-8", errors="replace")}


def get_csrf_token(cookies: http.cookiejar.CookieJar) -> str:
    """Get CSRF token from NextAuth"""
    status, body, headers = make_request(
        f"{BASE_URL}{API_CSRF}",
        cookies=cookies
    )
    try:
        data = json.loads(body)
        return data.get("csrfToken", "")
    except (json.JSONDecodeError, TypeError):
        return ""


def get_providers(cookies: http.cookiejar.CookieJar) -> dict:
    """Get available authentication providers"""
    status, body, headers = make_request(
        f"{BASE_URL}{API_PROVIDERS}",
        cookies=cookies
    )
    try:
        return json.loads(body)
    except (json.JSONDecodeError, TypeError):
        return {}


def attempt_submit(cookies: http.cookiejar.CookieJar) -> dict:
    """Attempt to submit the server to MCP.so"""
    payload = {
        "name": SERVICE_NAME,
        "type": "server",
        "url": SERVICE_URL,
        "server_config": SERVER_CONFIG,
        "is_innovation": False,
        "is_dxt": False
    }

    status, body, headers = make_request(
        f"{BASE_URL}{API_SUBMIT}",
        method="POST",
        data=payload,
        cookies=cookies
    )

    try:
        response = json.loads(body)
        response["http_status"] = status
        return response
    except (json.JSONDecodeError, TypeError):
        return {
            "http_status": status,
            "raw_response": body.decode("utf-8", errors="replace")
        }


def try_google_one_tap_auth(cookies: http.cookiejar.CookieJar, csrf_token: str) -> dict:
    """Try the google-one-tap credentials provider (requires valid Google credential token)"""
    # The google-one-tap provider is a credentials provider that accepts
    # a Google identity credential JWT. Without a real Google credential token
    # from a Google OAuth sign-in, this will fail.
    # We document this for reference.
    print("[INFO] google-one-tap auth requires a valid Google credential token")
    print("[INFO] This is obtained via Google's One Tap JavaScript SDK")
    print("[INFO] Cannot be done programmatically without a real browser session")
    return {"status": "requires_google_credential"}


def main():
    """Main submission flow"""
    print("=" * 70)
    print("MCP.so Submission Script - Premium Analysis MCP Server")
    print("=" * 70)
    print()

    cookies = create_session()

    # Step 1: Check session status
    print("[1] Checking session...")
    session = check_session(cookies)
    print(f"    Authenticated: {session.get('authenticated', False)}")
    if session.get("authenticated"):
        print(f"    User: {session.get('user', {}).get('email', 'unknown')}")
    print()

    # Step 2: Get available providers
    print("[2] Checking authentication providers...")
    providers = get_providers(cookies)
    for pid, pdata in providers.items():
        print(f"    - {pid} ({pdata.get('name', 'unknown')}): {pdata.get('type', 'unknown')}")
    print()

    # Step 3: Get CSRF token
    print("[3] Getting CSRF token...")
    csrf = get_csrf_token(cookies)
    print(f"    CSRF Token: {csrf[:20]}...")
    print()

    # Step 4: Attempt submission
    print("[4] Attempting to submit server...")
    print(f"    Name: {SERVICE_NAME}")
    print(f"    URL: {SERVICE_URL}")
    print(f"    Type: server")
    print()

    result = attempt_submit(cookies)
    print(f"    HTTP Status: {result.get('http_status', 'N/A')}")
    print(f"    Response: {json.dumps({k: v for k, v in result.items() if k != 'http_status'}, indent=2)}")
    print()

    # Step 5: Interpret results
    print("[5] Result Analysis")
    print("-" * 40)
    print()

    code = result.get("code")
    message = result.get("message", "")
    http_status = result.get("http_status", 0)

    if code == 0:
        print("SUCCESS: Server submitted successfully!")
        submission_id = result.get("data", {}).get("uuid",
                       result.get("data", {}).get("name", "unknown"))
        print(f"    Submission ID: {submission_id}")
    elif code == -1:
        print("AUTHENTICATION REQUIRED: ", message)
        print()
        print("Explanation:")
        print("MCP.so requires authentication via Google or GitHub OAuth.")
        print("The /api/submit-project endpoint returns 'no auth, please login'")
        print("when no valid session cookie is present.")
        print()
        print("Authentication flow:")
        print("1. User must sign in via Google or GitHub (NextAuth)")
        print("2. A session cookie is set")
        print("3. The submit API validates the session")
        print()
        print("Without valid OAuth credentials, automated submission is not possible.")
    else:
        print(f"UNEXPECTED RESPONSE: code={code}, message={message}")

    print()

    # Build submission result
    submission_result = {
        "directory": "MCP.so",
        "status": "authentication_required",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message": (
            "Submission to MCP.so requires authentication (Google/GitHub OAuth via NextAuth). "
            "The /api/submit-project endpoint accepts POST with JSON body "
            "{name, type, url, server_config, is_innovation, is_dxt} but returns "
            f"'no auth, please login' without a valid session cookie. "
            f"API response: {message}"
        ),
        "submissionId": None,
        "details": {
            "api_endpoint": f"{BASE_URL}{API_SUBMIT}",
            "method": "POST",
            "authentication": {
                "required": True,
                "type": "NextAuth (Google OAuth / GitHub OAuth / Google One Tap)",
                "session_based": True,
                "providers": list(providers.keys())
            },
            "request_payload": {
                "name": SERVICE_NAME,
                "type": "server",
                "url": SERVICE_URL,
                "server_config": SERVER_CONFIG,
                "is_innovation": False,
                "is_dxt": False
            },
            "response": {k: v for k, v in result.items() if k != 'http_status'},
            "required_fields": ["name", "type", "url"],
            "optional_fields": ["server_config", "is_innovation", "is_dxt"],
            "web_form_url": "https://mcp.so/submit",
            "sign_in_url": "https://mcp.so/auth/signin"
        }
    }

    return submission_result


if __name__ == "__main__":
    result = main()

    print("=" * 70)
    print("FINAL SUBMISSION RESULT")
    print("=" * 70)
    print(json.dumps(result, indent=2))

    # Write result to a temp file for the caller
    with open("/tmp/mcpso_result.json", "w") as f:
        json.dump(result, f, indent=2)

    print("\nResult saved to /tmp/mcpso_result.json")
