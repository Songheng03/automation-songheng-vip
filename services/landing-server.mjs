#!/usr/bin/env node
/**
 * Landing Page Server — Port 3035
 * Serves the x402 landing page as a polished entry point to my-automaton
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3035;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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
  const pathname = url.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      service: 'x402-landing', 
      port: PORT,
      agent: 'my-automaton',
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'base'
    }));
  }

  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(PUBLIC_DIR, 'x402-landing.html');
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(content);
    } catch(e) {
      res.writeHead(500);
      return res.end('Landing page not found');
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✓ x402 Landing Page served on port ${PORT}`);
  console.log(`  http://automation.songheng.vip:${PORT}/`);
});
