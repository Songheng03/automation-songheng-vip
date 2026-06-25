/**
 * Sitemap Generator Service
 * Full-featured sitemap generation and validation
 * Supports: XML sitemap generation, validation, URL extraction from sitemaps
 */

const https = require('https');
const http = require('http');
const url = require('url');

const FREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Generate an XML sitemap from URL entries
 * @param {Object} data - { urls: [{loc, changefreq, priority, lastmod}], baseUrl: string }
 * @returns {Object} - { xml, urls, count, valid, errors }
 */
function handleGenerate(data) {
  const errors = [];
  const urls = [];

  if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
    return { valid: false, error: 'No URLs provided. Send { urls: [{loc, changefreq, priority}] }', xml: null, count: 0, urls: [] };
  }

  // Limit to 50,000 URLs (standard sitemap limit)
  const entries = data.urls.slice(0, 50000);

  for (const entry of entries) {
    const loc = entry.loc?.trim();
    if (!loc) continue;
    if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
      errors.push(`Invalid URL: ${loc}`);
      continue;
    }
    const changefreq = FREQ.includes(entry.changefreq) ? entry.changefreq : 'monthly';
    let priority = parseFloat(entry.priority);
    if (isNaN(priority) || priority < 0.0 || priority > 1.0) priority = 0.5;
    const lastmod = entry.lastmod || new Date().toISOString().split('T')[0];

    urls.push({ loc, changefreq, priority: priority.toFixed(1), lastmod });
  }

  if (urls.length === 0) {
    return { valid: false, error: 'No valid URLs after validation', xml: null, count: 0, urls: [] };
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>';

  return {
    valid: true,
    count: urls.length,
    urls,
    errors: errors.length > 0 ? errors : undefined,
    xml,
    sizeBytes: Buffer.byteLength(xml, 'utf-8'),
    generated: new Date().toISOString()
  };
}

/**
 * Validate a sitemap by fetching it remotely
 * @param {Object} data - { url: string }
 * @returns {Promise<Object>} - { valid, count, error, details }
 */
function handleValidate(data) {
  return new Promise((resolve) => {
    const sitemapUrl = data?.url?.trim();
    if (!sitemapUrl) {
      return resolve({ valid: false, error: 'No URL provided. Send { url: "https://..." }' });
    }
    if (!sitemapUrl.startsWith('http://') && !sitemapUrl.startsWith('https://')) {
      return resolve({ valid: false, error: 'Invalid URL — must start with http:// or https://' });
    }

    const parsed = url.parse(sitemapUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(sitemapUrl, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        return resolve({ valid: false, error: `HTTP ${res.statusCode} — sitemap not accessible` });
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          // Check if it looks like a valid XML sitemap
          if (!body.includes('<urlset') && !body.includes('<sitemapindex')) {
            return resolve({ valid: false, error: 'Response is not a valid sitemap XML' });
          }

          // Count URLs
          const urlMatches = body.match(/<loc>/g);
          const count = urlMatches ? urlMatches.length : 0;

          // Extract basic details
          const locs = [];
          const regex = /<loc>([^<]+)<\/loc>/g;
          let match;
          while ((match = regex.exec(body)) !== null) {
            locs.push(match[1]);
          }

          resolve({
            valid: true,
            count,
            sizeBytes: Buffer.byteLength(body, 'utf-8'),
            isIndex: body.includes('<sitemapindex'),
            details: {
              sampleUrls: locs.slice(0, 10),
              totalUrls: count,
              contentType: res.headers['content-type'] || 'unknown'
            }
          });
        } catch (e) {
          resolve({ valid: false, error: `Parse error: ${e.message}` });
        }
      });
    });

    req.on('error', (e) => resolve({ valid: false, error: `Connection error: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ valid: false, error: 'Request timed out' }); });
  });
}

/**
 * Auto-generate a sitemap for all known routes
 * @returns {string} - XML sitemap string
 */
function generateFullSitemap() {
  const now = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: 'https://automation.songheng.vip/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/blog', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://automation.songheng.vip/tools', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/tools/sitemap-generator', priority: '0.7', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/tools/regex-tester', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/tools/json-formatter', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/tools/http-status-codes', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/api-docs', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/live-demo', priority: '0.7', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/upgrade', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/dashboard', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/api-playground', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/ai-code-reviewer', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/code-quality-checker', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/content-generator', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/seo-optimizer', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/quickstart', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://automation.songheng.vip/monitor', priority: '0.3', changefreq: 'monthly' },
  ];

  // Add blog articles (sample)
  const blogSlugs = [
    'understanding-xml-sitemaps.html', 'seo-optimization-guide.html',
    'ai-code-review-best-practices.html', 'automated-security-scanning.html',
    'regex-patterns-guide.html', 'json-formatter-tips.html',
    'http-status-codes-reference.html', 'api-integration-strategies.html',
    'developer-productivity-tips.html', 'content-optimization-strategies.html',
    'security-best-practices.html', 'agent-automation-future.html',
    'deep-dive-ai-analysis.html', 'markdown-to-html-converter.html',
    'batch-processing-tips.html'
  ];
  for (const slug of blogSlugs) {
    urls.push({
      loc: `https://automation.songheng.vip/blog/${slug}`,
      priority: '0.4',
      changefreq: 'monthly'
    });
  }

  const result = handleGenerate({ urls });
  return result.xml;
}

module.exports = { handleGenerate, handleValidate, generateFullSitemap };
