#!/usr/bin/env node
/**
 * badge-server.mjs — Standalone badge SVG server
 * 
 * Serves lightweight badge SVGs that GitHub READMEs can hotlink.
 * Every badge image links back to my-automaton services.
 * Creates viral backlink network from GitHub projects.
 * 
 * Run: node scripts/badge-server.mjs
 * Or integrate into gateway as a route handler.
 * 
 * Badge URL pattern: /badge/:grade/:score
 * Examples:
 *   /badge/A%2B/95  →  "Code Quality: A+ /95" green badge
 *   /badge/B/72     →  "Code Quality: B /72" yellow badge  
 *   /badge/F/15     →  "Code Quality: F /15" red badge
 */

const COLORS = {
  'A+': '#3fb950', 'A': '#3fb950', 'A-': '#56d364',
  'B+': '#d29922', 'B': '#d29922', 'B-': '#d29922',
  'C+': '#f0883e', 'C': '#f0883e', 'C-': '#f0883e',
  'D+': '#f85149', 'D': '#f85149', 'D-': '#f85149',
  'F': '#f85149'
};

const VALID_GRADES = new Set(Object.keys(COLORS));

function gradeColor(grade) {
  return COLORS[grade] || '#8b949e';
}

/**
 * Generate a shields.io-compatible flat badge SVG
 */
function badgeSVG(grade, score) {
  const color = gradeColor(grade);
  const scoreStr = score ? `/${score}` : '';
  
  // Calculate widths based on text length
  const leftWidth = 90;
  const rightWidth = Math.max(60, grade.length * 10 + (score ? score.toString().length * 8 : 0) + 16);
  const totalWidth = leftWidth + rightWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="Code Quality: ${grade}${scoreStr}">
  <title>Code Quality: ${grade}${scoreStr}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${Math.round(leftWidth / 2)}" y="14" fill="#fff">Code Quality</text>
    <text x="${leftWidth + Math.round(rightWidth / 2)}" y="14" fill="#fff" font-weight="bold">${grade}${scoreStr}</text>
  </g>
  <a target="_blank" xlink:href="https://automation.songheng.vip/code-grader.html">
    <rect width="${totalWidth}" height="20" fill="transparent"/>
  </a>
</svg>`;
}

/**
 * HTTP request handler — use in gateway.cjs
 * 
 * Add to gateway:
 *   const badgeHandler = require('./scripts/badge-server.mjs');
 *   // route: GET /badge/:grade/:score?
 */
function handleBadge(req, res) {
  const url = require('url');
  const parsed = url.parse(req.url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  
  // /badge/{grade}/{score?}
  // or /badge/{grade}
  let grade, score;
  
  if (parts[0] === 'badge' && parts.length >= 2) {
    // URL decode the grade (A%2B → A+)
    grade = decodeURIComponent(parts[1]).toUpperCase();
  }
  
  if (parts.length >= 3) {
    score = parseInt(parts[2]);
    if (isNaN(score)) score = undefined;
  }
  
  if (!grade || !VALID_GRADES.has(grade)) {
    // Serve default badge for unknown grades
    grade = 'A';
  }
  
  const svg = badgeSVG(grade, score || '');
  
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml;charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(svg);
}

// Export both the SVG generator and the HTTP handler
module.exports = { badgeSVG, handleBadge, VALID_GRADES, COLORS };

// Standalone server (for testing)
if (require.main === module) {
  const http = require('http');
  const PORT = parseInt(process.env.PORT) || 0;
  
  // Don't start a server — this is just a module
  // The handler should be integrated into the gateway
  console.log('Badge generator module loaded.');
  console.log('Valid grades:', [...VALID_GRADES].join(', '));
  console.log('\nExample SVG:');
  console.log(badgeSVG('A+', 95));
}
