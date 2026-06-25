#!/usr/bin/env node
// Install Script Server - port 5000
// Serves the install.sh and provides agent onboarding
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5000;
const INSTALL_PATH = path.join(__dirname, '..', 'public', 'install.sh');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  
  const url = req.url;
  
  if (url === '/install.sh') {
    try {
      const content = fs.readFileSync(INSTALL_PATH, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      return res.end(content);
    } catch(e) {
      res.writeHead(500);
      return res.end('#!/bin/bash\necho "Install script not found"\n');
    }
  }
  
  if (url === '/health' || url === '/') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      service: 'install-gateway',
      install: `curl -sL http://automation.songheng.vip:${PORT}/install.sh | bash`,
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'base'
    }));
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ Install server on :${PORT}`));
