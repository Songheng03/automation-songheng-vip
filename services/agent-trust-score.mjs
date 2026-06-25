#!/usr/bin/env node
/**
 * Agent Trust Score Service
 * 
 * Agents pay 1¢ via x402 to get a verifiable trust score.
 * Other agents query scores for free to evaluate counterparties.
 * Creates network effects: more agents → more valuable.
 * 
 * Port: 5590
 */

import http from 'http';
import crypto from 'crypto';

const PORT = 5590;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SCORE_COST_CENTS = 1; // 1¢ per score calculation

// Trust score factors
const WEIGHTS = {
  walletAge: 0.25,        // Older wallets = more trustworthy
  txCount: 0.20,          // More transactions = active
  uniqueInteractions: 0.15, // Diverse interactions
  serviceCount: 0.20,     // Running services = invested
  responseRate: 0.10,     // Responding to handshakes
  referrals: 0.10         // Referring other agents
};

const scores = new Map(); // address -> {score, breakdown, timestamp}
const payments = new Map();

// x402 payment verification
function verifyPayment(req) {
  const txHash = req.headers['x-x402-payment'] || '';
  // In production, verify on-chain. For now, accept demo payments.
  return txHash.length > 0 ? txHash : null;
}

function computeTrustScore(agent) {
  const factors = {
    walletAge: Math.min(1, (agent.walletAge || 0) / 365),  // 1 year = max
    txCount: Math.min(1, (agent.txCount || 0) / 100),      // 100 txs = max
    uniqueInteractions: Math.min(1, (agent.uniqueInteractions || 0) / 50),
    serviceCount: Math.min(1, (agent.serviceCount || 0) / 10),
    responseRate: agent.responseRate || 0,
    referrals: Math.min(1, (agent.referrals || 0) / 10)
  };

  let score = 0;
  const breakdown = {};
  for (const [factor, value] of Object.entries(factors)) {
    const weighted = value * WEIGHTS[factor];
    score += weighted;
    breakdown[factor] = { raw: value, weight: WEIGHTS[factor], contribution: weighted };
  }

  // Normalize to 0-100
  const normalizedScore = Math.round(score * 100);

  return {
    score: normalizedScore,
    breakdown,
    factors,
    tier: normalizedScore >= 80 ? 'trusted' : normalizedScore >= 50 ? 'established' : normalizedScore >= 20 ? 'emerging' : 'new',
    timestamp: Date.now()
  };
}

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment, X-Agent-Address'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const headers = { 'Content-Type': 'application/json', ...cors };
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = body ? JSON.parse(body) : {};
      const agentAddr = req.headers['x-agent-address'] || 'anonymous';

      // POST /v1/score - Calculate a trust score (1¢ via x402)
      if (path === '/v1/score' && req.method === 'POST') {
        // Check x402 payment
        if (!verifyPayment(req)) {
          res.writeHead(402, {
            ...headers,
            'X-X402-Cost': SCORE_COST_CENTS.toString(),
            'X-X402-Wallet': WALLET,
            'X-X402-Chain': 'Base',
            'X-X402-Reason': `Pay ${SCORE_COST_CENTS}¢ USDC for trust score`
          });
          res.end(JSON.stringify({
            error: 'x402 payment required',
            cost: `${SCORE_COST_CENTS}¢`,
            wallet: WALLET,
            chain: 'Base',
            instructions: 'Send exact USDC amount to wallet, retry with X-X402-Payment header'
          }));
          return;
        }

        const txHash = verifyPayment(req);
        const { address, walletAge, txCount, uniqueInteractions, serviceCount, responseRate, referrals } = data;
        
        if (!address) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'address required' }));
          return;
        }

        const agent = {
          address,
          walletAge: walletAge || 0,
          txCount: txCount || 0,
          uniqueInteractions: uniqueInteractions || 0,
          serviceCount: serviceCount || 0,
          responseRate: responseRate || 0,
          referrals: referrals || 0
        };

        const result = computeTrustScore(agent);
        result.address = address;
        result.payment = txHash;
        result.verification = crypto.createHash('sha256')
          .update(JSON.stringify(result) + scoreCostCents)
          .digest('hex')
          .slice(0, 16);

        scores.set(address, result);

        // Track payment
        const paymentId = crypto.randomUUID().slice(0, 8);
        payments.set(paymentId, {
          id: paymentId,
          txHash,
          address,
          amount: SCORE_COST_CENTS,
          timestamp: Date.now()
        });

        // Store score cost for signature
        const scoreCostCents = SCORE_COST_CENTS;

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          score: result.score,
          tier: result.tier,
          verification: result.verification,
          breakdown: result.breakdown,
          queryable: `GET /v1/check/${address}`,
          cost: `${SCORE_COST_CENTS}¢`
        }));
        return;
      }

      // GET /v1/check/:address - Free score lookup
      if (path.startsWith('/v1/check/') && req.method === 'GET') {
        const address = path.split('/').pop().toLowerCase();
        const score = scores.get(address);

        if (!score) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({
            error: 'No score found',
            address,
            recommendation: `POST /v1/score to calculate (${SCORE_COST_CENTS}¢)`
          }));
          return;
        }

        // Only expose public fields on free lookup
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          address,
          score: score.score,
          tier: score.tier,
          timestamp: score.timestamp,
          verification: score.verification
        }));
        return;
      }

      // GET /v1/leaderboard - Top scores
      if (path === '/v1/leaderboard' && req.method === 'GET') {
        const sorted = Array.from(scores.entries())
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, 20)
          .map(([addr, data]) => ({
            address: addr,
            score: data.score,
            tier: data.tier,
            timestamp: data.timestamp
          }));

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          count: sorted.length,
          totalScored: scores.size,
          leaderboard: sorted
        }));
        return;
      }

      // GET /v1/factors - Explain scoring factors
      if (path === '/v1/factors' && req.method === 'GET') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          cost: `${SCORE_COST_CENTS}¢ per score`,
          factors: Object.entries(WEIGHTS).map(([name, weight]) => ({
            name,
            weight,
            description: {
              walletAge: 'Days since first transaction (up to 365)',
              txCount: 'Total transactions (up to 100)',
              uniqueInteractions: 'Unique counterparties (up to 50)',
              serviceCount: 'Services/services offered (up to 10)',
              responseRate: 'Fraction of handshakes responded to',
              referrals: 'Other agents referred (up to 10)'
            }[name]
          })),
          tiers: [
            { name: 'trusted', range: '80-100', badge: '🛡️' },
            { name: 'established', range: '50-79', badge: '⭐' },
            { name: 'emerging', range: '20-49', badge: '🌱' },
            { name: 'new', range: '0-19', badge: '🆕' }
          ]
        }));
        return;
      }

      // GET /v1/stats - Service stats
      if (path === '/v1/stats' && req.method === 'GET') {
        const totalScored = scores.size;
        const totalRevenue = payments.size * SCORE_COST_CENTS;
        const txCount = payments.size;

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          service: 'Agent Trust Score',
          version: '1.0',
          wallet: WALLET,
          costPerScore: `${SCORE_COST_CENTS}¢`,
          totalScored,
          totalRevenue: `${totalRevenue}¢ ($${(totalRevenue/100).toFixed(2)})`,
          paymentsReceived: txCount,
          leaderboard: `${scores.size > 0 ? 'available' : 'empty'}`
        }));
        return;
      }

      // GET / - Info
      if (path === '/') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          service: 'Agent Trust Score',
          version: '1.0',
          wallet: WALLET,
          cost: `${SCORE_COST_CENTS}¢ per score via x402`,
          endpoints: {
            score: 'POST /v1/score - Calculate trust score (x402: 1¢) {address, walletAge, txCount, ...}',
            check: 'GET /v1/check/:address - Free score lookup',
            leaderboard: 'GET /v1/leaderboard - Top scores',
            factors: 'GET /v1/factors - Scoring methodology',
            stats: 'GET /v1/stats - Service statistics'
          },
          tiers: {
            trusted: '80-100 🛡️',
            established: '50-79 ⭐',
            emerging: '20-49 🌱',
            new: '0-19 🆕'
          }
        }));
        return;
      }

      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Not found' }));

    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Trust Score] Running on port ${PORT}`);
  console.log(`[Trust Score] Wallet: ${WALLET}`);
  console.log(`[Trust Score] Cost: ${SCORE_COST_CENTS}¢ per score`);
  console.log(`[Trust Score] Revenue model: ${SCORE_COST_CENTS}¢ x402 per query`);
});
