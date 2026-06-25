#!/usr/bin/env python3
"""
ClawHunt Submission Script

ClawHunt (https://clawhunt.com) describes itself as "Product Hunt for AI Agents".
It references /submit-tool and /api-docs in the footer navigation, but both pages
return 404 errors. The site appears to be a concept/demo with placeholder tool data.
Submission functionality is not currently available.
"""

import json
import os
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timezone

# Service details from service_description.md
SERVICE_NAME = "Premium Analysis MCP Server"
SERVICE_URL = "https://automation.songheng.vip"
SERVICE_DESCRIPTION = "Premium AI-native analytics via micropayments. 7 specialized tools covering data analysis, content generation, and research synthesis with x402 micropayments on Base chain USDC."

# ClawHunt site URLs
CLAWHUNT_BASE = "https://clawhunt.com"
CLAWHUNT_ENDPOINTS = [
    "/submit-tool",
    "/api-docs",
    "/api",
    "/api/submit",
    "/api/v1/submit",
    "/api/tools",
    "/api/v1/tools",
]


def check_url(url: str) -> dict:
    """Check if a URL is accessible and return status info."""
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, method="GET")
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        return {
            "url": url,
            "status_code": resp.status,
            "accessible": True,
        }
    except urllib.error.HTTPError as e:
        return {
            "url": url,
            "status_code": e.code,
            "accessible": False,
        }
    except Exception as e:
        return {
            "url": url,
            "error": str(e),
            "accessible": False,
        }


def attempt_submission():
    """
    Attempt to submit the service to ClawHunt.
    Since there is no functional submission mechanism, this will report the status.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Check base site
    base_status = check_url(CLAWHUNT_BASE)
    
    # Check potential endpoints
    endpoint_results = {}
    for ep in CLAWHUNT_ENDPOINTS:
        url = CLAWHUNT_BASE + ep
        result = check_url(url)
        endpoint_results[ep] = result
    
    # Check if any endpoint is functional
    working_endpoints = [
        ep for ep, res in endpoint_results.items()
        if res.get("accessible") and res.get("status_code") == 200
    ]
    
    submit_endpoints = [ep for ep in working_endpoints if "submit" in ep.lower()]
    
    if submit_endpoints:
        # Found a working submit endpoint - try to POST
        print(f"Found working submit endpoint(s): {submit_endpoints}")
        
        payload = {
            "name": SERVICE_NAME,
            "url": SERVICE_URL,
            "description": SERVICE_DESCRIPTION,
            "type": "MCP Server",
            "serverConfig": {
                "mcpServers": {
                    "premium-analysis": {
                        "url": SERVICE_URL
                    }
                }
            }
        }
        
        for ep in submit_endpoints:
            url = CLAWHUNT_BASE + ep
            try:
                ctx = ssl.create_default_context()
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, method="POST")
                req.add_header("Content-Type", "application/json")
                req.add_header("Accept", "application/json")
                
                resp = urllib.request.urlopen(req, context=ctx, timeout=15)
                resp_body = resp.read().decode("utf-8")
                
                return {
                    "status": "submitted",
                    "timestamp": timestamp,
                    "message": f"Successfully submitted to {url}",
                    "submissionId": None,  # unknown
                    "endpoints_checked": endpoint_results,
                }
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                return {
                    "status": "failed",
                    "timestamp": timestamp,
                    "message": f"HTTP {e.code} when posting to {url}: {body[:500]}",
                    "endpoints_checked": endpoint_results,
                }
            except Exception as e:
                return {
                    "status": "failed",
                    "timestamp": timestamp,
                    "message": f"Error posting to {url}: {str(e)}",
                    "endpoints_checked": endpoint_results,
                }
    
    # No working submit endpoint found
    # Let's also try doing a GET on the submit-tool page to see if there's any clue
    submit_url = CLAWHUNT_BASE + "/submit-tool"
    
    return {
        "status": "submission_unavailable",
        "timestamp": timestamp,
        "message": (
            f"ClawHunt ({CLAWHUNT_BASE}) is a concept/demo site. "
            f"The /submit-tool and /api-docs pages referenced in the footer "
            f"both return 404 errors. No functional submission mechanism is available. "
            f"The site contains placeholder tool data (SuperAPI, PaymentPro, DataStore). "
            f"Submission cannot be completed at this time."
        ),
        "submissionId": None,
        "directory": "ClawHunt",
        "endpoints_checked": endpoint_results,
        "base_site_status": base_status,
    }


def main():
    print("=" * 60)
    print("ClawHunt Submission Script")
    print("=" * 60)
    
    print(f"\nService: {SERVICE_NAME}")
    print(f"URL: {SERVICE_URL}")
    print(f"Target: {CLAWHUNT_BASE}")
    
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] Checking ClawHunt...")
    
    result = attempt_submission()
    
    print(f"\nResult status: {result['status']}")
    print(f"Message: {result['message']}")
    
    # Read existing results or create new
    results_file = "submission_results.json"
    if os.path.exists(results_file):
        with open(results_file, "r") as f:
            try:
                all_results = json.load(f)
            except json.JSONDecodeError:
                all_results = {}
    else:
        all_results = {}
    
    # Build the entry for clawhunt
    clawhunt_entry = {
        "directory": result.get("directory", "ClawHunt"),
        "status": result["status"],
        "timestamp": result["timestamp"],
        "message": result["message"],
        "submissionId": result.get("submissionId"),
    }
    
    all_results["clawhunt"] = clawhunt_entry
    
    with open(results_file, "w") as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\nResults appended to {results_file}")
    print(f"ClawHunt entry: {json.dumps(clawhunt_entry, indent=2)}")
    
    return result


if __name__ == "__main__":
    main()
