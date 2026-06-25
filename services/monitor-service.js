#!/usr/bin/env node
/**
 * SERVER MONITOR — lightweight health endpoint service
 * Runs as part of gateway, provides:
 * - /api/stats/overview — payment stats, uptime, blog count
 * - /api/health — system health
 * - /api/quota — free tier quota per IP
 * 
 * This file injects these endpoints into gateway.js
 * WITHOUT modifying the core gateway routes
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const DATA_DIR = '/root/automaton/data';

// In-memory storage for free quota tracking
const dailyFreeQuota = new Map();
const DAILY_FREE_LIMIT = 3;

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket?.remoteAddress || 'unknown';
}

function getDailyKey(ip, service = 'brief') {
  const today = new Date().toISOString().slice(0, 10);
  return `${service}:${ip}:${today}`;
}

function getFreeRemaining(ip, service = 'brief') {
  return Math.max(0, DAILY_FREE_LIMIT - (dailyFreeQuota.get(getDailyKey(ip, service)) || 0));
}

function useFreeSlot(ip, service = 'brief') {
  const key = getDailyKey(ip, service);
  dailyFreeQuota.set(key, (dailyFreeQuota.get(key) || 0) + 1);
}

// Middleware factory
function createMonitorMiddleware() {
  return {
    // GET /api/health
    health: (req, res) => {
      let blogCount = 0;
      try { 
        blogCount = fs.readdirSync(path.join(CONTENT_DIR, 'blog'))
          .filter(f => f.endsWith('.html')).length; 
      } catch(e) {}
      
      let toolCount = 0;
      try {
        toolCount = fs.readdirSync(path.join(CONTENT_DIR, 'tools'))
          .filter(f => f.endsWith('.html')).length;
      } catch(e) {}
      
      res.json({
        status: 'ok',
        agent: 'my-automaton',
        uptime: process.uptime(),
        uptime_hours: Math.floor(process.uptime() / 3600),
        blog_count: blogCount,
        tool_count: toolCount,
        services: ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity', 'batch', 'render', 'brief'],
        version: '2.2.0'
      });
    },
    
    // GET /api/stats/overview
    stats: (req, res) => {
      let blogCount = 0;
      try { 
        blogCount = fs.readdirSync(path.join(CONTENT_DIR, 'blog'))
          .filter(f => f.endsWith('.html')).length; 
      } catch(e) {}
      
      // Read payment log if exists
      let totalPayments = 0;
      let totalRevenue = 0;
      let totalRequests = 0;
      try {
        const logFile = path.join(DATA_DIR, 'payments.jsonl');
        if (fs.existsSync(logFile)) {
          const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.amount) totalRevenue += entry.amount;
              totalPayments++;
            } catch(e) {}
          }
        }
      } catch(e) {}
      
      // Count tool usage
      try {
        const toolLog = path.join(DATA_DIR, 'tool-usage.jsonl');
        if (fs.existsSync(toolLog)) {
          totalRequests = fs.readFileSync(toolLog, 'utf-8').trim().split('\n').filter(Boolean).length;
        }
      } catch(e) {}
      
      res.json({
        agent: 'my-automaton',
        wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        chain: 'base',
        total_payments: totalPayments,
        total_revenue_cents: totalRevenue,
        total_revenue_usd: (totalRevenue / 100).toFixed(2),
        total_requests: totalRequests,
        services_available: 10,
        blog_articles: blogCount,
        uptime: process.uptime(),
        uptime_hours: Math.floor(process.uptime() / 3600),
        survival_tier: 'normal',
        credits_remaining: '$26.06'
      });
    },
    
    // GET /api/quota
    quota: (req, res) => {
      const ip = getClientIp(req);
      res.json({
        free_remaining: getFreeRemaining(ip),
        free_total: DAILY_FREE_LIMIT,
        paid_cost: '0.02 USDC',
        wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        chain: 'base',
        token: 'USDC'
      });
    }
  };
}

module.exports = { createMonitorMiddleware, getFreeRemaining, useFreeSlot, getClientIp, DAILY_FREE_LIMIT };
