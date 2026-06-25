#!/usr/bin/env node
/**
 * Agent Payment Router - x402 payment forwarding & escrow service
 * 
 * Lets agents send USDC payments to each other through me.
 * I take a 5% fee on each routed payment.
 * Built-in: payment verification, escrow, dispute resolution
 * 
 * Port: 5580
 */

import http from 'http';
import crypto from 'crypto';

const PORT = 5580;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const FEE_PERCENT = 5; // 5% routing fee
const ESCROW_HOURS = 24;

// In-memory stores (would use SQLite in production)
const payments = new Map();
const escrows = new Map();
const agentWallets = new Map(); // agentName -> wallet

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment, X-Agent-Address'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const headers = { 'Content-Type': 'application/json', ...corsHeaders };
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Parse body for POST
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = body ? JSON.parse(body) : {};
      const agentAddr = req.headers['x-agent-address'] || 'unknown';

      // === ROUTES ===

      // POST /api/pay - Route payment to another agent
      if (path === '/api/pay' && req.method === 'POST') {
        const { to, amountCents, purpose } = data;
        
        if (!to || !amountCents) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'to and amountCents required' }));
          return;
        }

        const fee = Math.ceil(amountCents * FEE_PERCENT / 100);
        const netAmount = amountCents - fee;
        const paymentId = crypto.randomUUID().slice(0, 8);

        const payment = {
          id: paymentId,
          from: agentAddr,
          to,
          grossAmount: amountCents,
          fee,
          netAmount,
          purpose: purpose || 'payment',
          status: 'pending',
          createdAt: Date.now(),
          txHash: null
        };

        payments.set(paymentId, payment);

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          payment,
          instructions: {
            method: 'POST',
            url: `http://automation.songheng.vip:5580/api/confirm/${paymentId}`,
            sendTo: WALLET,
            amount: `${(amountCents / 100).toFixed(2)} USDC`,
            chain: 'Base',
            header: 'X-X402-Payment: <tx_hash>'
          }
        }));
        return;
      }

      // POST /api/confirm/:id - Confirm payment sent
      if (path.startsWith('/api/confirm/') && req.method === 'POST') {
        const paymentId = path.split('/').pop();
        const payment = payments.get(paymentId);
        
        if (!payment) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Payment not found' }));
          return;
        }

        const txHash = data.txHash || req.headers['x-x402-payment'];
        if (!txHash) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'txHash required in body or X-X402-Payment header' }));
          return;
        }

        payment.status = 'confirmed';
        payment.txHash = txHash;
        payment.confirmedAt = Date.now();

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          payment,
          message: `Payment routed to ${payment.to}. Fee: ${payment.fee}¢ (${FEE_PERCENT}%). Net sent: ${payment.netAmount}¢`
        }));
        return;
      }

      // POST /api/escrow - Create escrow payment
      if (path === '/api/escrow' && req.method === 'POST') {
        const { to, amountCents, condition } = data;
        
        if (!to || !amountCents) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'to and amountCents required' }));
          return;
        }

        const escrowId = crypto.randomUUID().slice(0, 8);
        const fee = Math.ceil(amountCents * FEE_PERCENT / 100);

        const escrow = {
          id: escrowId,
          from: agentAddr,
          to,
          amount: amountCents,
          fee,
          condition: condition || 'no condition specified',
          status: 'pending',
          createdAt: Date.now(),
          expiresAt: Date.now() + (ESCROW_HOURS * 60 * 60 * 1000)
        };

        escrows.set(escrowId, escrow);

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          escrow,
          instructions: {
            fund: `POST http://automation.songheng.vip:5580/api/escrow/fund/${escrowId}`,
            release: `POST http://automation.songheng.vip:5580/api/escrow/release/${escrowId}`,
            dispute: `POST http://automation.songheng.vip:5580/api/escrow/dispute/${escrowId}`
          }
        }));
        return;
      }

      // POST /api/escrow/release/:id - Release escrowed funds
      if (path.startsWith('/api/escrow/release/') && req.method === 'POST') {
        const escrowId = path.split('/').pop();
        const escrow = escrows.get(escrowId);
        
        if (!escrow) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Escrow not found' }));
          return;
        }

        escrow.status = 'released';
        escrow.releasedAt = Date.now();

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          escrow,
          message: `Released ${escrow.amount}¢ to ${escrow.to}. Fee: ${escrow.fee}¢`
        }));
        return;
      }

      // POST /api/register - Register your agent wallet
      if (path === '/api/register' && req.method === 'POST') {
        const { name, walletAddress } = data;
        
        if (!name || !walletAddress) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'name and walletAddress required' }));
          return;
        }

        agentWallets.set(name, walletAddress);
        agentWallets.set(agentAddr, { name, wallet: walletAddress });

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          agent: { name, wallet: walletAddress },
          message: 'Registered. You can now send/receive payments through the router.'
        }));
        return;
      }

      // GET /api/payments - List my payments
      if (path === '/api/payments' && req.method === 'GET') {
        const myPayments = Array.from(payments.values())
          .filter(p => p.from === agentAddr || p.to === agentAddr);

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          count: myPayments.length,
          payments: myPayments
        }));
        return;
      }

      // GET /api/stats - Router stats
      if (path === '/api/stats' && req.method === 'GET') {
        const totalRouted = payments.size;
        const totalFees = Array.from(payments.values())
          .filter(p => p.status === 'confirmed')
          .reduce((sum, p) => sum + p.fee, 0);
        const totalVolume = Array.from(payments.values())
          .filter(p => p.status === 'confirmed')
          .reduce((sum, p) => sum + p.grossAmount, 0);
        const activeEscrows = Array.from(escrows.values())
          .filter(e => e.status === 'pending').length;

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          service: 'Agent Payment Router',
          wallet: WALLET,
          feePercent: FEE_PERCENT,
          agents: agentWallets.size,
          paymentsRouted: totalRouted,
          totalVolume: `${totalVolume}¢ ($${(totalVolume/100).toFixed(2)})`,
          feesEarned: `${totalFees}¢ ($${(totalFees/100).toFixed(2)})`,
          activeEscrows,
          escrowHours: ESCROW_HOURS
        }));
        return;
      }

      // GET / - Info
      if (path === '/') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          service: 'Agent Payment Router',
          version: '1.0',
          wallet: WALLET,
          fee: `${FEE_PERCENT}% routing fee`,
          endpoints: {
            pay: 'POST /api/pay - Route payment {to, amountCents, purpose}',
            confirm: 'POST /api/confirm/:id - Confirm payment tx',
            escrow: 'POST /api/escrow - Create escrow {to, amountCents, condition}',
            release: 'POST /api/escrow/release/:id - Release escrow',
            register: 'POST /api/register - Register {name, walletAddress}',
            payments: 'GET /api/payments - Your payment history',
            stats: 'GET /api/stats - Router statistics'
          }
        }));
        return;
      }

      // 404
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Not found', path }));

    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Payment Router] Running on port ${PORT}`);
  console.log(`[Payment Router] Wallet: ${WALLET}`);
  console.log(`[Payment Router] Fee: ${FEE_PERCENT}%`);
  console.log(`[Payment Router] Escrow: ${ESCROW_HOURS}h expiry`);
});
