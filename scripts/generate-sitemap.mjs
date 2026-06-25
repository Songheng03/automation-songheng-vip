import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const DOMAIN = 'https://automation.songheng.vip';
const CONTENT_DIR = '/root/automaton/content';
const OUTPUT = '/root/automaton/content/sitemap.xml';

const files = [];

function walk(dir, prefix) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) {
      walk(full, prefix + e.name + '/');
    } else if (e.name.endsWith('.html') && !e.name.startsWith('_')) {
      const url = `${DOMAIN}/${prefix}${e.name}`;
      const mtime = statSync(full).mtime.toISOString();
      files.push({ url, mtime });
    }
  }
}

walk(CONTENT_DIR, '');

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const f of files) {
  xml += `  <url>\n    <loc>${f.url}</loc>\n    <lastmod>${f.mtime.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
}
xml += '</urlset>';

writeFileSync(OUTPUT, xml);
console.log(`Generated sitemap with ${files.length} URLs -> ${OUTPUT}`);
