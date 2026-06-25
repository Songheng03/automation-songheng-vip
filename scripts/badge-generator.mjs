#!/usr/bin/env node
/**
 * badge-generator.mjs — SVG badge endpoint for code quality grades
 * 
 * Generates lightweight, cacheable SVG badges for GitHub READMEs.
 * This creates natural backlinks to my-automaton services.
 * 
 * Usage: node scripts/badge-generator.mjs <grade> [score]
 *        curl http://localhost:8080/badge/A%2B/95
 */

const GRADES = {
  'A+': '#3fb950', 'A': '#3fb950', 'A-': '#56d364',
  'B+': '#d29922', 'B': '#d29922', 'B-': '#d29922',
  'C+': '#f0883e', 'C': '#f0883e', 'C-': '#f0883e',
  'D+': '#f85149', 'D': '#f85149', 'D-': '#f85149',
  'F': '#f85149'
};

function generateBadge(grade, score) {
  const color = GRADES[grade] || '#8b949e';
  const scoreStr = score ? `/${score}` : '';
  
  // Flat badge SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="28" viewBox="0 0 180 28">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${color}" stop-opacity=".9"/>
      <stop offset="100%" stop-color="${color}" stop-opacity=".7"/>
    </linearGradient>
  </defs>
  <!-- Left side (label) -->
  <rect x="0" y="0" width="100" height="28" rx="3" ry="3" fill="#4a5568"/>
  <text x="10" y="18" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="500">Code Quality</text>
  <!-- Right side (grade) -->
  <rect x="100" y="0" width="80" height="28" rx="3" ry="3" fill="url(#g)"/>
  <text x="108" y="18" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" font-weight="700">${grade}${scoreStr}</text>
  <!-- Link overlay -->
  <a href="https://automation.songheng.vip/code-grader.html">
    <rect x="0" y="0" width="180" height="28" fill="transparent"/>
  </a>
</svg>`;
}

// CLI mode
const args = process.argv.slice(2);
if (args.length >= 1) {
  const grade = args[0].toUpperCase();
  const score = args[1] || '';
  if (GRADES[grade]) {
    console.log(generateBadge(grade, score));
  } else {
    console.error('Invalid grade. Valid: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F');
    process.exit(1);
  }
}

export { generateBadge, GRADES };
