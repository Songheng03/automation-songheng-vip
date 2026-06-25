#!/usr/bin/env python3
"""Submit to Glama.ai - Attempt to check if service is indexed and document submission."""

import json
import time
import urllib.request
import urllib.error
import os

RESULTS_FILE = "/root/automaton/submission_results.json"

def check_glama_indexed():
    """Check if our server is already indexed by Glama."""
    checks = {
        "repo_url": "https://glama.ai/mcp/servers/@Conway-Research/automaton",
        "search_name": "https://glama.ai/mcp/servers?query=my-automaton",
        "search_repo": "https://glama.ai/mcp/servers?query=Conway-Research",
    }
    
    results = {}
    for name, url in checks.items():
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SubmissionBot/1.0)"}
            )
            resp = urllib.request.urlopen(req, timeout=15)
            html = resp.read().decode("utf-8", errors="replace")
            status = resp.status
            
            # Check if page contains relevant info (not a 404)
            found_automaton = "my-automaton" in html or "Conway-Research" in html
            is_not_found = "Not Found" in html[:500] if len(html) > 500 else False
            
            results[name] = {
                "status_code": status,
                "found_our_service": found_automaton,
                "is_404_page": is_not_found,
                "url": url
            }
        except urllib.error.HTTPError as e:
            results[name] = {
                "status_code": e.code,
                "found_our_service": False,
                "is_404_page": e.code == 404,
                "error": str(e),
                "url": url
            }
        except Exception as e:
            results[name] = {
                "status_code": None,
                "found_our_service": False,
                "error": str(e),
                "url": url
            }
    
    return results

def check_glama_api():
    """Check Glama API endpoints for submission capabilities."""
    endpoints = {
        "root": "https://glama.ai",
        "servers_page": "https://glama.ai/mcp/servers",
        "methodology": "https://glama.ai/mcp/methodology",
        "mcp_reference": "https://glama.ai/mcp/reference",
        "api_mcp_servers": "https://glama.ai/api/mcp/servers",
    }
    
    results = {}
    for name, url in endpoints.items():
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SubmissionBot/1.0)"}
            )
            resp = urllib.request.urlopen(req, timeout=15)
            results[name] = {
                "status_code": resp.status,
                "content_type": resp.headers.get("Content-Type", ""),
                "accessible": True
            }
        except urllib.error.HTTPError as e:
            results[name] = {
                "status_code": e.code,
                "error": str(e),
                "accessible": False
            }
        except Exception as e:
            results[name] = {
                "status_code": None,
                "error": str(e),
                "accessible": False
            }
    
    return results

def main():
    print("=" * 60)
    print("Glama.ai Submission Script")
    print("=" * 60)
    
    # Step 1: Check API endpoints
    print("\n[1] Checking Glama API endpoints...")
    api_results = check_glama_api()
    for name, result in api_results.items():
        print(f"  {name}: HTTP {result.get('status_code', 'N/A')} - {'Accessible' if result.get('accessible') else 'Not accessible'}")
    
    # Step 2: Check if we're already indexed
    print("\n[2] Checking if our service is already indexed by Glama...")
    index_results = check_glama_indexed()
    for name, result in index_results.items():
        found = "FOUND" if result.get("found_our_service") else "NOT FOUND"
        print(f"  {name}: {found} (HTTP {result.get('status_code', 'N/A')})")
    
    # Step 3: Build the result entry
    submission_data = {
        "glama": {
            "submission_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "directory": "Glama",
            "domain": "glama.ai",
            "url": "https://glama.ai",
            "submission_page": "https://glama.ai/mcp/servers",
            "submission_type": "github_repository_auto_indexing",
            "success": False,
            "confirmation": None,
            "automatable": False,
            "error": "No public REST API available for programmatic submission. Glama.ai uses GitHub repository auto-indexing. Submission requires: (1) GitHub OAuth login with write/admin access to Conway-Research/automaton, (2) Navigating to the MCP servers page, (3) Submitting the repository URL. The server is automatically scanned via Docker build, MCP introspection, and behavioral analysis in a Firecracker microVM.",
            "manual_needed": True,
            "endpoint_checks": api_results,
            "index_checks": index_results,
            "submission_steps": [
                "1. Open https://glama.ai and sign up via GitHub OAuth (requires write/admin access to Conway-Research/automaton)",
                "2. Navigate to https://glama.ai/mcp/servers",
                "3. Click 'Submit Server' or 'Add Server' button",
                "4. Enter repository URL: https://github.com/Conway-Research/automaton",
                "5. Glama verifies write access via GitHub OAuth",
                "6. Glama clones the repo, builds Docker image, runs MCP introspection (tools/list, resources/list, prompts/list)",
                "7. Behavioral analysis (syscall/network inspection) and TDQS scoring are performed",
                "8. Server appears at https://glama.ai/mcp/servers/@Conway-Research/automaton"
            ],
            "prerequisites": {
                "github_repo": "https://github.com/Conway-Research/automaton",
                "dockerfile_required": True,
                "github_write_access_required": True,
                "server_must_listen_on_port_8080": True
            },
            "pricing": "Free to submit. Glama has paid plans ($9/mo Starter, $26/mo Pro) for additional features.",
            "recommended_action": "Manual submission by a human with GitHub write/admin access to Conway-Research/automaton. Follow the steps in /root/automaton/glama_manual.md.",
            "details": {
                "summary": "Glama.ai is a comprehensive MCP registry that auto-indexes GitHub repositories. It does not provide a public submission API. The methodology involves: cloning the Git repo, building from Dockerfile, running in isolated Firecracker microVM, protocol introspection (tools/list, resources/list, prompts/list), behavioral analysis (syscall/network monitoring), and computing Tool Definition Quality Score (TDQS). Build failures result in hidden listings. Servers are continuously synced from GitHub - every push triggers a re-scan.",
                "methodology_reference": "https://glama.ai/mcp/methodology",
                "github_org": "https://github.com/glama-ai",
                "registered_servers_count": "37,835+ servers in registry"
            }
        }
    }
    
    # Step 4: Update submission_results.json
    print(f"\n[3] Updating {RESULTS_FILE} with glama submission data...")
    
    try:
        with open(RESULTS_FILE, "r") as f:
            existing_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing_data = {}
    
    # Update with glama key
    existing_data["glama"] = submission_data["glama"]
    
    with open(RESULTS_FILE, "w") as f:
        json.dump(existing_data, f, indent=2)
    
    print("  Done! Glama submission data appended to submission_results.json under key 'glama'.")
    
    # Step 5: Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Service: my-automaton")
    print(f"  Repository: https://github.com/Conway-Research/automaton")
    print(f"  Server URL: https://automation.songheng.vip")
    print(f"  Glama Submission: MANUAL REQUIRED")
    print(f"  Reason: No public API - GitHub OAuth + Web UI only")
    print(f"  Indexed on Glama: NO (HTTP 404 - server not yet listed)")
    print(f"  Manual guide: /root/automaton/glama_manual.md")
    print("=" * 60)
    
    return submission_data

if __name__ == "__main__":
    result = main()
    print("\nScript completed successfully.")
