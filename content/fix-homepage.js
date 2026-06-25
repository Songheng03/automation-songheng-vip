const fs = require('fs');
let html = fs.readFileSync('/root/automaton/content/index.html', 'utf8');

// 1. Remove duplicate .daily-banner CSS blocks - keep only the first one
// The CSS block has multiple copies of:
// .daily-banner{background:...}
// Fix: remove all but the first occurrence
let dailyBannerCss = '.daily-banner{background:linear-gradient(135deg,#1a2332,#162032);border:1px solid #d29922;border-radius:12px;padding:1rem 1.5rem;margin:0 0 1rem;box-shadow:0 0 20px rgba(210,153,34,.1)}';

// Find all occurrences of the daily-banner CSS (including variations)
// Pattern: find .daily-banner{background:...} after the first one
let cssCount = 0;
html = html.replace(/\.daily-banner\{background:linear-gradient\(135deg,#1a2332,#162032\);border:1px solid #d29922;border-radius:12px;padding:1rem 1\.5rem;margin:0 0 1rem;box-shadow:0 0 20px rgba\(210,153,34,\.1\)\}/g, (match) => {
    cssCount++;
    if (cssCount === 1) return match; // keep first
    console.log(`Removing duplicate CSS #${cssCount}`);
    return ''; // remove duplicates
});

// 2. Fix the broken daily banner HTML sections
// There are multiple broken <!-- DAILY CHALLENGE BANNER --> sections followed by partial divs
// The pattern is:
//   </div>ANNER -->  
//   <!-- DAILY CHALLENGE BANNER -->
//   (repeated)
// We need to remove the broken fragments and keep only the good daily-banner div

// Find and remove all content between the first </div> (closing the daily-banner)
// and before the <!-- LIVE SOCIAL PROOF BANNER -->, keeping only the good daily-banner

// Strategy: remove everything from the first broken fragment to the social proof banner
html = html.replace(
    /<\/div>ANNER -->\s*<!-- DAILY CHALLENGE BANNER -->[\s\S]*?(?=<!-- LIVE SOCIAL PROOF BANNER -->)/,
    ''
);

// Also remove any remaining standalone <!-- DAILY CHALLENGE BANNER --> comments
html = html.replace(/<!-- DAILY CHALLENGE BANNER -->\s*/g, '');

// 3. Fix the social proof banner broken HTML
// The <div class="sp-divider"></ is broken
html = html.replace(/<div class="sp-divider"><\/div>/g, ''); // Remove broken ones first

// 4. Check for other broken tags
// Remove any extra empty <style> tags
html = html.replace(/<style>\s*<\/style>/g, '');

// 5. Remove empty newlines (consecutive blank lines)
html = html.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync('/root/automaton/content/index.html', html, 'utf8');
console.log('Fixed index.html');
console.log(`New size: ${fs.statSync('/root/automaton/content/index.html').size} bytes`);

// Validate HTML structure
const hasDocType = html.includes('<!DOCTYPE');
const hasHtml = html.includes('<html');
const hasBody = html.includes('</body>');
const hasHead = html.includes('</head>');
console.log(`Has DOCTYPE: ${hasDocType}, Has <html>: ${hasHtml}, Has </body>: ${hasBody}, Has </head>: ${hasHead}`);
