# Outreach Post Update Guide: Domain Migration

> **Goal:** Replace old domain `chaosong.dpdns.org` (and variant `automation.songheng.vip`) with the canonical new domain `automation.songheng.vip` in all previously submitted external outreach posts.

**Date:** 2026-06-19  
**Prepared by:** automaton agent  
**Status:** ⚠️ Manual action required — no API credentials available

---

## Summary

| Platform | Post Type | API Available? | Credentials Found? | Action |
|----------|-----------|:---:|:---:|--------|
| **Hacker News** | Show HN | ❌ No edit API | ❌ None | Manual re-post or email mods |
| **Dev.to** | Article | ✅ Forem API v1 | ❌ No `DEVTO_API_KEY` | Manual edit via web UI |

---

## 1. Hacker News (Show HN)

### Current State

HN does **not** have an API for editing posts. Posts can only be edited via the web interface within a **2-hour grace window** after submission. After that, the edit link disappears.

If the original Show HN post is older than 2 hours, you have two options:

### Option A: Contact HN Moderators (Recommended)

Send an email to the HN moderators requesting a URL/text update:

- **Email:** `hn@ycombinator.com`
- **Subject:** Request to update Show HN post URL
- **Include:**
  - Link to the original post (find it at https://news.ycombinator.com/submitted?id=YOUR_USERNAME)
  - Old domain: `chaosong.dpdns.org`
  - New domain: `automation.songheng.vip`
  - Brief explanation: "We've migrated domains. Please update the URL in our Show HN post."

Moderators are known to be responsive and helpful for legitimate domain changes.

### Option B: Submit a New Show HN Post

Create a new Show HN post with updated content:

1. Go to: https://news.ycombinator.com/submit
2. **Title template:**
   ```
   Show HN: My-Automaton — Sovereign AI Agent That Pays for Its Own Server (now at automation.songheng.vip)
   ```
3. **URL:** `https://automation.songheng.vip`
4. **Text (if text post):**
   ```
   Previously at chaosong.dpdns.org, now migrated to automation.songheng.vip.

   My-Automaton is an autonomous AI agent running on a $12/mo VPS. It provides:
   - AI Code Review ($0.05)
   - Security Scanning ($0.03)
   - Text Analysis ($0.01)
   - Summarization ($0.02)
   - Code Refactoring ($0.05)

   Pay-per-request via USDC (Base chain) — no subscriptions, no signup.
   Free tier: 3 requests/day per IP.

   Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
   ```

### Updated Content for HN

The old `workspace/hn-post.md` still references the Chaosong brand and GitHub org. Updated recommended title and URL:

| Element | Old | New |
|---------|-----|-----|
| Title | Show HN: Chaosong AI Gateway - 9 premium AI endpoints | Show HN: My-Automaton — Sovereign AI Agent with Pay-Per-Request API |
| URL | github.com/chaosong/ai-gateway | automation.songheng.vip |
| Docs | docs.chaosong.ai | automation.songheng.vip/api-docs.html |

---

## 2. Dev.to

### Current State

Dev.to uses the [Forem API](https://developers.forem.com/api/), which **does** support editing articles. However, we need an API key.

### What You Need

1. **Dev.to API Key** — Generate one at: https://dev.to/settings/extensions
   - Scroll to "DEV Community API Keys"
   - Generate a new key (store it as `DEVTO_API_KEY`)
2. **Article ID** — Find the article ID from the article URL:
   - `https://dev.to/YOUR_USERNAME/article-slug-abc123` → the last segment contains the ID
   - Or use the API to list articles: `curl -H "api-key: YOUR_KEY" https://dev.to/api/articles/me`

### Step-by-Step: Update via Web UI (No API Key Needed)

1. Log in to https://dev.to
2. Go to your Dashboard: https://dev.to/dashboard
3. Find the article: **"I Built an AI Agent That Pays for Its Own Server — Here's How"** (or similar title)
4. Click **Edit**
5. Use **Find & Replace** (Ctrl+H / Cmd+H):
   - Find: `automation.songheng.vip`
   - Replace: `automation.songheng.vip`
6. Also check for any `chaosong.dpdns.org` references and replace with `automation.songheng.vip`
7. Click **Save changes**

### Step-by-Step: Update via API (Once You Have API Key)

Once you have a `DEVTO_API_KEY`:

```bash
# 1. Find your article ID
curl -H "api-key: $DEVTO_API_KEY" \
  https://dev.to/api/articles/me | jq '.[] | {id, title, url}'

# 2. Get the current article
curl -H "api-key: $DEVTO_API_KEY" \
  https://dev.to/api/articles/ARTICLE_ID

# 3. Update the article (replace ARTICLE_ID with actual ID)
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "api-key: $DEVTO_API_KEY" \
  https://dev.to/api/articles/ARTICLE_ID \
  -d '{
    "article": {
      "body_markdown": "UPDATED_CONTENT_HERE",
      "title": "I Built an AI Agent That Pays for Its Own Server — Here'\''s How"
    }
  }'
```

### Domain Replacements Needed in Dev.to Article

The `workspace/devto-article.json` contains these URLs that need fixing:

| Find | Replace With |
|------|---------------|
| `automation.songheng.vip` | `automation.songheng.vip` |
| (any `chaosong.dpdns.org`) | `automation.songheng.vip` |

**Note:** The double `automation.automation.` prefix appears in multiple places in the article body — this is likely a typo from a previous domain update. All should be corrected to the single `automation.songheng.vip`.

---

## 3. Files Already Updated (No Action Needed)

The following workspace files already reference the correct new domain:

| File | Status |
|------|:---:|
| `/root/automaton/content/syndication/hackernews-ai-api-credits-pricing-guide-2026.md` | ✅ Uses `automation.songheng.vip` |
| `/root/automaton/content/syndication/devto-ai-api-credits-pricing-guide-2026.md` | ✅ Uses `automation.songheng.vip` |
| `/root/automaton/auto-outreach.js` | ✅ Uses `automation.songheng.vip` |

---

## 4. Files Still Containing Old References

These files still contain `chaosong.dpdns.org` references (Cloudflare tunnel keys/configs, not user-facing URLs):

| File | Context | Priority |
|------|---------|:---:|
| `/root/automaton/services/tunnel-fix.cjs` | Cloudflare tunnel config reference | Low |
| `/root/automaton/scripts/traffic-blaster.mjs` | Tunnel key config | Low |
| `/root/automaton/scripts/traffic-bot.js` | Tunnel key config | Low |
| `/root/automaton/scripts/generate-blog-cli.js` | IndexNow key reference | Low |
| `/root/automaton/workspace/hn-post.md` | **Old HN post template** — needs rewrite | **High** |
| `/root/automaton/workspace/devto-article.json` | **Has `automation.automation.` typo** | **High** |

---

## 5. Quick-Action Checklist

- [ ] **HN:** Email `hn@ycombinator.com` about domain update OR submit new Show HN
- [ ] **Dev.to:** Log in at https://dev.to/dashboard and manually edit article
  - [ ] Fix `automation.songheng.vip` → `automation.songheng.vip` (double-prefix typo)
  - [ ] Fix any `chaosong.dpdns.org` → `automation.songheng.vip`
- [ ] **Dev.to (optional):** Generate API key at https://dev.to/settings/extensions for future automated updates
- [ ] **Optional:** Update `workspace/hn-post.md` with new branding for future reference
- [ ] **Optional:** Fix `workspace/devto-article.json` double-prefix typo

---

## Why This Can't Be Fully Automated

1. **Hacker News** has no edit API — human intervention is required either way
2. **Dev.to** has an API but no `DEVTO_API_KEY` is configured in the workspace
3. No credentials were found in: environment variables, `/root/automaton/gateway.env`, `credentials_status.json`, or any config files

To enable future automated Dev.to updates, generate an API key at https://dev.to/settings/extensions and set it as:
```bash
export DEVTO_API_KEY=your_key_here
```
Then add it to `/root/automaton/gateway.env` for persistence.
