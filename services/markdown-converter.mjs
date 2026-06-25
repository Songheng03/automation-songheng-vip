#!/usr/bin/env node
/**
 * Markdown Converter — Port 3097
 * Free service: convert markdown to HTML, extract plain text, get stats
 */
import http from 'http';

const PORT = 3097;

function mdToHtml(md) {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]<)/gm, '<p>') + '</p>';
  return `<div class="md-content">${html}</div>`;
}

function stripMd(md) {
  return md.replace(/[#*`\[\]()>_\-]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function mdStats(md) {
  return {
    chars: md.length,
    words: md.split(/\s+/).filter(Boolean).length,
    lines: md.split('\n').length,
    headings: (md.match(/^#{1,3}\s/gm) || []).length,
    links: (md.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
    codeBlocks: (md.match(/```/g) || []).length / 2,
    lists: (md.match(/^[-*]\s/gm) || []).length
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    return res.end(`<h1>Markdown Converter</h1><p>POST /render with {"markdown":"...","format":"html|text|stats"}</p>`);
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const md = data.markdown || data.text || '';
      const format = data.format || 'html';

      let result;
      if (format === 'text') result = { text: stripMd(md) };
      else if (format === 'stats') result = { stats: mdStats(md) };
      else result = { html: mdToHtml(md), stats: mdStats(md) };

      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => console.log(`Markdown Converter on port ${PORT}`));
