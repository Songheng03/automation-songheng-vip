# Google Search Console Setup Instructions

## Current Status

The homepage (`/root/automaton/services/public/index.html`) contains a placeholder meta tag for Google Search Console verification:

```html
<meta name="google-site-verification" content="GOOGLE_VERIFICATION_CODE">
```

This **must be replaced** with your actual verification code from Google Search Console.

---

## Step-by-Step Instructions

### 1. Verify Site Ownership in Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click **"Add property"**
4. Enter your domain: `https://automation.songheng.vip/`
5. Select the **"HTML tag"** verification method

### 2. Obtain Your Verification Code

Google will provide a meta tag like:

```html
<meta name="google-site-verification" content="YOUR_UNIQUE_VERIFICATION_CODE">
```

Copy the `content` value (the long alphanumeric string).

### 3. Update the Verification Code

Replace the placeholder in the homepage file:

**File:** `/root/automaton/services/public/index.html`

Replace:
```html
<meta name="google-site-verification" content="GOOGLE_VERIFICATION_CODE">
```

With:
```html
<meta name="google-site-verification" content="YOUR_ACTUAL_CODE_HERE">
```

### 4. Restart the Gateway

After updating the file, restart the service to pick up the changes:

```bash
cd /root/automaton && node gateway.cjs
```

Or restart the gateway process.

### 5. Verify in Google Search Console

Click **"Verify"** in Google Search Console. If successful, you'll see green confirmation.

---

## Alternative: HTML File Verification

If you prefer file-based verification instead of the meta tag:

1. In Google Search Console, select **"HTML file"** verification method
2. Download the provided `googleXXXXX.html` file
3. Place it in the public directory:
   ```
   /root/automaton/services/public/googleXXXXX.html
   ```
4. Verify the file is accessible at: `https://automation.songheng.vip/googleXXXXX.html`
5. Click **"Verify"** in Google Search Console

---

## Sitemap Submission

After verification, submit your sitemap:

```bash
curl -X POST "https://automation.songheng.vip/sitemap.xml"
```

Or add it manually in Google Search Console under **Sitemaps** section.

---

## Next Steps After Verification

1. **Monitor Performance**: Check the Search Console dashboard for impressions, clicks, and average position
2. **Review Index Coverage**: Ensure all important pages are indexed
3. **Optimize for Search**: Review the SEO meta tags already added to the homepage
4. **Submit URL Inspection**: Request indexing for the homepage

---

## Already Present SEO Tags

The following SEO enhancements are already in place in `/root/automaton/services/public/index.html`:

| Tag | Status |
|-----|--------|
| `<title>` | ✅ Present |
| `<meta name="description">` | ✅ Present |
| `<meta name="keywords">` | ✅ Present |
| `<meta name="robots">` | ✅ Present |
| `<link rel="canonical">` | ✅ Present |
| `<meta property="og:title">` | ✅ Present |
| `<meta property="og:description">` | ✅ Present |
| `<meta property="og:image">` | ✅ Present |
| `<meta property="og:url">` | ✅ Present |
| `<meta property="og:type">` | ✅ Present |
| `<meta property="og:site_name">` | ✅ Present |
| `<meta property="og:locale">` | ✅ Present |
| `<meta property="og:image:width/height">` | ✅ Present |
| `<meta name="twitter:card">` | ✅ Present |
| `<meta name="twitter:title">` | ✅ Present |
| `<meta name="twitter:description">` | ✅ Present |
| `<meta name="twitter:image">` | ✅ Present |
| `<script type="application/ld+json"> (WebSite)` | ✅ Present |
| `<script type="application/ld+json"> (Product)` | ✅ Present |
| `<meta name="google-site-verification">` | ⚠️ Placeholder - needs real code |

**Last updated:** June 18, 2025
