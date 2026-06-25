#!/usr/bin/env python3
"""
submit_sitemap.py - Submit sitemap to Google Search Console / Indexing API

Usage:
    python3 submit_sitemap.py

If /workspace/google-sa-key.json exists, it will authenticate using Google
Service Account credentials and submit/ping the sitemap URL via the
Google Indexing API and Search Console API.

If the key file is missing, it prints setup instructions.

Requirements:
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""

import os
import sys
import json
import logging
import urllib.request
import urllib.error

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%S'
)
logger = logging.getLogger('submit_sitemap')

SITE_URL = 'https://automation.songheng.vip'
SITEMAP_URL = f'{SITE_URL}/sitemap.xml'
SA_KEY_PATH = '/workspace/google-sa-key.json'


def ping_google():
    """Basic HTTP ping to Google to notify about sitemap update."""
    ping_url = f'https://www.google.com/ping?sitemap={SITEMAP_URL}'
    logger.info(f'Pinging Google with: {ping_url}')
    try:
        req = urllib.request.Request(ping_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode('utf-8', errors='replace')
            logger.info(f'Ping response status: {resp.status}')
            logger.info(f'Ping response (first 300 chars): {body[:300]}')
            return True
    except urllib.error.HTTPError as e:
        logger.warning(f'HTTP error during ping: {e.code} {e.reason}')
        return False
    except Exception as e:
        logger.warning(f'Ping failed: {e}')
        return False


def submit_via_search_console():
    """Submit sitemap via Google Search Console API using service account."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        logger.error('Missing required packages. Install with:')
        logger.error('  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib')
        return False

    # Load service account key
    if not os.path.exists(SA_KEY_PATH):
        logger.error(f'Service account key not found at: {SA_KEY_PATH}')
        return False

    try:
        with open(SA_KEY_PATH) as f:
            key_info = json.load(f)
    except (json.JSONDecodeError, PermissionError) as e:
        logger.error(f'Failed to read service account key: {e}')
        return False

    # The service account email
    sa_email = key_info.get('client_email', 'unknown')
    logger.info(f'Using service account: {sa_email}')

    # Define required scopes
    SCOPES = ['https://www.googleapis.com/auth/webmasters']

    try:
        credentials = service_account.Credentials.from_service_account_info(
            key_info, scopes=SCOPES
        )

        # Build the Search Console service
        service = build('webmasters', 'v3', credentials=credentials)

        # Submit sitemap
        logger.info(f'Submitting sitemap: {SITEMAP_URL}')
        service.sitemaps().submit(
            siteUrl=SITE_URL,
            feedpath=SITEMAP_URL
        ).execute()
        logger.info(f'✅ Sitemap submitted successfully to Google Search Console!')

        # List submitted sitemaps
        sitemaps = service.sitemaps().list(siteUrl=SITE_URL).execute()
        submitted = sitemaps.get('sitemap', [])
        for sm in submitted:
            logger.info(f'  - {sm.get("path", "?")} (last submitted: {sm.get("lastSubmitted", "?")})')

        return True

    except Exception as e:
        logger.error(f'Search Console API submission failed: {e}')
        return False


def submit_via_indexing_api():
    """Submit URL via Google Indexing API."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        return False

    if not os.path.exists(SA_KEY_PATH):
        return False

    try:
        with open(SA_KEY_PATH) as f:
            key_info = json.load(f)
    except Exception:
        return False

    SCOPES = ['https://www.googleapis.com/auth/indexing']

    try:
        credentials = service_account.Credentials.from_service_account_info(
            key_info, scopes=SCOPES
        )
        service = build('indexing', 'v3', credentials=credentials)

        # Submit the sitemap URL for indexing
        body = {
            'url': SITEMAP_URL,
            'type': 'URL_UPDATED'
        }
        service.urlNotifications().publish(body=body).execute()
        logger.info(f'✅ Indexing API notification sent for: {SITEMAP_URL}')
        return True
    except Exception as e:
        logger.warning(f'Indexing API submission failed (may not be enabled): {e}')
        return False


def print_setup_instructions():
    """Print instructions for setting up Google Search Console access."""
    instructions = f"""
{'='*60}
 Google Search Console - Setup Instructions
{'='*60}

No service account key found at: {SA_KEY_PATH}

To set up automated sitemap submission, follow these steps:

1. GOOGLE CLOUD CONSOLE SETUP:
   a. Go to https://console.cloud.google.com/
   b. Create a new project (or select existing)
   c. Enable APIs:
      - Google Search Console API
      - Google Indexing API (optional)
   d. Go to "IAM & Admin" → "Service Accounts"
   e. Create a new service account (e.g., "search-console-bot")
   f. Generate a JSON key and download it
   g. Save the key as: {SA_KEY_PATH}

2. GOOGLE SEARCH CONSOLE:
   a. Go to https://search.google.com/search-console
   b. Verify ownership of {SITE_URL} (if not already done)
   c. Add the service account email as an "Owner" or "Full User"
      under Settings → Users and permissions

3. RUN THIS SCRIPT AGAIN:
   python3 {__file__}

ALTERNATIVE - Manual Submission:
   • Submit your sitemap directly:
     {SITEMAP_URL}
   • Or use the Google Search Console UI at:
     https://search.google.com/search-console/sitemaps

{'='*60}
"""
    print(instructions)
    logger.info('Setup instructions printed above.')


def main():
    logger.info(f'='*50)
    logger.info(f'Submit Sitemap for: {SITE_URL}')
    logger.info(f'Sitemap URL: {SITEMAP_URL}')
    logger.info(f'='*50)

    # Always do a basic ping to Google
    logger.info('Step 1: Pinging Google...')
    ping_result = ping_google()
    logger.info(f'Ping result: {"✅ Success" if ping_result else "⚠️  Failed (non-critical)"}')

    # Check if service account key exists
    if os.path.exists(SA_KEY_PATH):
        logger.info(f'✅ Service account key found at: {SA_KEY_PATH}')
        logger.info('Step 2: Submitting via Google Search Console API...')
        sc_result = submit_via_search_console()

        logger.info('Step 3: Attempting Indexing API notification...')
        idx_result = submit_via_indexing_api()

        if sc_result:
            logger.info('✅ Sitemap submission completed successfully!')
        else:
            logger.warning('⚠️  Search Console API submission had issues.')
    else:
        logger.info('ℹ️  No service account key found.')
        print_setup_instructions()
        logger.info('✅ Basic ping sent. Manual setup required for API submission.')

    logger.info('Done.')


if __name__ == '__main__':
    main()
