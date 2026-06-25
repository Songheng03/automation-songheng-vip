#!/usr/bin/env node
/**
 * x402 Test Page Server — Port 3170
 * Serves the interactive x402 payment demo/test page
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3170;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SERVICES_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Health
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      service: 'x402-test-page', 
      port: PORT,
      page: 'http://automation.songheng.vip:3170/'
    }));
  }

  // Serve the test page
  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(PUBLIC_DIR, 'x402-test-page.html');
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(content);
    } catch(e) {
      res.writeHead(500);
      return res.end('Page not found');
    }
  }

  // API proxy for the validator
  if (pathname.startsWith('/api/')) {
    const proxyPath = pathname.replace('/api', '');
    const proxyReq = http.request(
      { hostname: 'localhost', port: 3020, path: proxyPath, method: req.method, headers: req.headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    req.pipe(proxyReq);
    proxyReq.on('error', () => {
      res.writeHead(502);
      res.end('Proxy error');
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✓ x402 Test Page served on port ${PORT}`);
  console.log(`  http://automation.songheng.vip:${PORT}/`);
});
