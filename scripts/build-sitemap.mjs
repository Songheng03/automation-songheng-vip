import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const publicDir = path.join(root, 'public');
const BASE = 'https://automation.songheng.vip';

function walkDir(dir, basePath = '') {
  let pages = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        pages = pages.concat(walkDir(full, path.join(basePath, item)));
      } else if (item.endsWith('.html')) {
        const urlPath = path.join('/', basePath, item === 'index.html' ? '' : item.replace(/\.html$/, ''));
        pages.push(urlPath);
      }
    }
  } catch {}
  return pages;
}

const pages = walkDir(contentDir).concat(walkDir(publicDir));

// Add known routes
const routes = ['/', '/upgrade', '/api-playground', '/demo', '/mcp-config-generator', '/api-docs', '/blog', '/dashboard', '/tools'];
const allPages = [...new Set([...routes, ...pages])];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const page of allPages) {
  const cleanPath = page === '/index' ? '/' : page;
  xml += `  <url><loc>${BASE}${cleanPath}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
}
xml += '</urlset>';

fs.writeFileSync(path.join(contentDir, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(root, 'content/sitemap.xml'), xml);

console.log(`✅ Sitemap: ${allPages.length} URLs`);
