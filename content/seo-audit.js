/**
 * Free SEO Audit Tool — my-automaton Service
 * Analyzes any public URL for SEO best practices.
 * Free to use — drives traffic to paid x402 endpoints.
 * 
 * Endpoint: POST /api/seo-audit
 * Route: /free-seo-audit-tool
 */

import https from 'https';
import http from 'http';

const USER_AGENT = 'my-automaton-SEO-Audit/1.0 (+https://automation.songheng.vip:8080)';

export function canHandle(method, urlPath) {
  return (method === 'POST' && urlPath === '/api/seo-audit') ||
         (method === 'GET' && urlPath === '/free-seo-audit-tool');
}

export async function handle(req, res) {
  if (req.method === 'GET' && req.url === '/free-seo-audit-tool') {
    res.writeHead(302, { Location: '/free-seo-audit-tool.html' });
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { url } = JSON.parse(body);
      if (!url) throw new Error('URL is required');
      
      const result = await analyzeSEO(url);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

async function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const req = client.get(targetUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      timeout: 15000
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', chunk => {
        chunks.push(chunk);
        size += chunk.length;
        if (size > 500000) req.destroy(); // 500KB limit
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
          responseTimeMs: Date.now() - startTime,
          contentType: res.headers['content-type'] || ''
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function extractMetaTags($, body) {
  const tags = [];
  // Title
  const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Meta tags
  const metaRegex = /<meta[^>]*>/gi;
  let match;
  while ((match = metaRegex.exec(body)) !== null) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    const propertyMatch = match[0].match(/property=["']([^"']+)["']/i);
    const contentMatch = match[0].match(/content=["']([^"']*)["']/i);
    if (nameMatch || propertyMatch) {
      tags.push({
        name: nameMatch ? nameMatch[1] : null,
        property: propertyMatch ? propertyMatch[1] : null,
        content: contentMatch ? contentMatch[1] : ''
      });
    }
  }
  
  const metaDescription = tags.find(t => t.name === 'description');
  const hasViewport = tags.some(t => t.name === 'viewport');
  
  return { title, tags, metaDescription: metaDescription?.content || '', hasViewport };
}

function extractHeadings(body) {
  const headings = [];
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) headings.push({ tag: 'H' + match[1], text });
  }
  return headings;
}

function extractLinks(body, baseUrl) {
  const internal = [], external = [];
  const base = new URL(baseUrl);
  const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.hostname === base.hostname) internal.push(href);
      else external.push(href);
    } catch { /* skip invalid URLs */ }
  }
  return { internal, external, internalCount: internal.length, externalCount: external.length };
}

function extractImages(body, baseUrl) {
  const images = [];
  const regex = /<img[^>]*>/gi;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const srcMatch = match[0].match(/src=["']([^"']+)["']/i);
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
    if (srcMatch) {
      images.push({
        src: srcMatch[1],
        alt: altMatch ? altMatch[1] : ''
      });
    }
  }
  const withAlt = images.filter(i => i.alt).length;
  return { images, count: images.length, altCount: withAlt };
}

function calculateScore(data) {
  let score = 50;
  
  if (data.title && data.title.length >= 10 && data.title.length <= 70) score += 10;
  else if (data.title) score += 5;
  else score -= 10;
  
  if (data.metaDescription && data.metaDescription.length >= 50 && data.metaDescription.length <= 160) score += 10;
  else if (data.metaDescription) score += 5;
  else score -= 10;
  
  if (data.h1Count === 1) score += 10;
  else if (data.h1Count === 0) score -= 10;
  else score += 3;
  
  if (data.headingCount > 0) score += 5;
  if (data.wordCount > 300) score += 10;
  else if (data.wordCount > 100) score += 5;
  else score -= 5;
  
  if (data.hasViewport) score += 5;
  if (data.hasFavicon) score += 5;
  if (data.imageCount > 0 && data.altCount === data.imageCount) score += 5;
  if (data.statusCode === 200) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function generateIssues(data) {
  const issues = [];
  if (!data.title) issues.push({ severity: 'critical', message: 'Missing page title tag. Search engines display this in results.' });
  else if (data.title.length < 10) issues.push({ severity: 'warning', message: `Page title too short (${data.title.length} chars). Aim for 10-70 characters.` });
  else if (data.title.length > 70) issues.push({ severity: 'warning', message: `Page title too long (${data.title.length} chars). May be truncated in search results.` });
  
  if (!data.metaDescription) issues.push({ severity: 'critical', message: 'Missing meta description. Search engines often use this in snippets.' });
  else if (data.metaDescription.length < 50) issues.push({ severity: 'warning', message: `Meta description too short (${data.metaDescription.length} chars). Aim for 50-160 characters.` });
  else if (data.metaDescription.length > 160) issues.push({ severity: 'warning', message: `Meta description too long (${data.metaDescription.length} chars). May be truncated.` });
  
  if (data.h1Count === 0) issues.push({ severity: 'critical', message: 'No H1 tag found. Every page should have exactly one H1.' });
  else if (data.h1Count > 1) issues.push({ severity: 'warning', message: `Found ${data.h1Count} H1 tags. Use exactly one H1 per page.` });
  
  if (data.headingCount === 0) issues.push({ severity: 'warning', message: 'No heading tags (H2-H6) found. Headings improve readability and SEO.' });
  
  if (data.wordCount < 100) issues.push({ severity: 'critical', message: `Very low word count (${data.wordCount} words). Aim for at least 300 words for SEO.` });
  else if (data.wordCount < 300) issues.push({ severity: 'warning', message: `Low word count (${data.wordCount} words). Aim for 300+ words for better ranking.` });
  
  if (!data.hasViewport) issues.push({ severity: 'warning', message: 'Missing viewport meta tag. Page may not be mobile-friendly.' });
  if (!data.hasFavicon) issues.push({ severity: 'info', message: 'No favicon found. A favicon helps with brand recognition in browser tabs.' });
  
  if (data.imageCount > 0 && data.altCount < data.imageCount) {
    const missingAlt = data.imageCount - data.altCount;
    issues.push({ severity: 'warning', message: `${missingAlt} of ${data.imageCount} images missing alt text. Alt text improves accessibility and SEO.` });
  }
  
  if (data.internalLinks === 0) issues.push({ severity: 'info', message: 'No internal links found. Internal linking helps with site navigation and SEO.' });
  
  return issues;
}

async function analyzeSEO(targetUrl) {
  // Normalize URL
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }
  
  const response = await fetchUrl(targetUrl);
  const body = response.body;
  const contentType = response.contentType;
  const url = response.headers['x-final-url'] || targetUrl;
  
  // Check if HTML
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    return {
      url: targetUrl,
      statusCode: response.statusCode,
      contentType,
      responseTimeMs: response.responseTimeMs,
      score: 0,
      error: 'Not an HTML page',
      issues: [{ severity: 'critical', message: `URL returns ${contentType}, not HTML. SEO audit requires an HTML page.` }]
    };
  }
  
  // Check for favicon
  const hasFavicon = body.includes('favicon') || body.includes('icon');
  
  // Check for robots/sitemap references
  const hasRobots = body.includes('robots.txt');
  const hasSitemap = body.includes('sitemap');
  
  // Extract data
  const { title, tags, metaDescription, hasViewport } = extractMetaTags(null, body);
  const headings = extractHeadings(body);
  const h1Count = headings.filter(h => h.tag === 'H1').length;
  const headingCount = headings.length;
  const { internal: internalLinks, external: externalLinks, internalCount, externalCount } = extractLinks(body, targetUrl);
  const { images, count: imageCount, altCount } = extractImages(body, targetUrl);
  
  // Word count (rough)
  const textContent = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
  const wordCount = textContent.split(/\s+/).length;
  
  // Content length
  const contentLength = Buffer.byteLength(body, 'utf8');
  
  const data = {
    title,
    metaDescription,
    h1Count,
    headingCount,
    wordCount,
    imageCount,
    altCount,
    internalLinks: internalCount,
    externalLinks: externalCount,
    hasViewport,
    hasFavicon,
    hasRobots,
    hasSitemap,
    statusCode: response.statusCode
  };
  
  const score = calculateScore(data);
  const issues = generateIssues(data);
  
  return {
    url: targetUrl,
    statusCode: response.statusCode,
    score,
    title,
    metaDescription,
    h1Count,
    headingCount,
    wordCount,
    imageCount,
    altCount,
    internalLinks: internalCount,
    externalLinks: externalCount,
    contentLength,
    responseTimeMs: response.responseTimeMs,
    server: response.headers['server'] || '',
    contentType,
    hasViewport,
    hasFavicon,
    hasRobots,
    hasSitemap,
    metaTags: tags,
    headings: headings.slice(0, 30),
    images: images.slice(0, 20),
    issues
  };
}
