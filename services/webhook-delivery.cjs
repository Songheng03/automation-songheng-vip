/**
 * webhook-delivery.cjs — Async webhook delivery for API results
 * 
 * When premium API endpoints receive X-Webhook-URL header,
 * this service asynchronously POSTs the results to the webhook URL.
 * This enables Slack/Discord/GitHub integration without new ports.
 * 
 * Usage:
 *   POST /v1/analyze
 *   X-Webhook-URL: https://hooks.slack.com/services/xxx
 *   X-Webhook-Secret: optional_secret_for_hmac_verification
 *   Content-Type: application/json
 *   {"text": "Analyze this code..."}
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Delivery queue with rate limiting
const DELIVERY_QUEUE = [];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const MAX_QUEUE_SIZE = 500;
let processing = false;

function log(msg) {
  console.log(`[webhook-delivery] ${msg}`);
}

/**
 * POST data to a webhook URL
 * Supports http://, https://, and slack webhook format
 */
function postToWebhook(url, data, secret) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const postData = JSON.stringify(data);
      const isHttps = urlObj.protocol === 'https:';
      const mod = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'my-automaton/1.0 (webhook delivery)'
        },
        timeout: 15000
      };

      // Add HMAC signature if secret provided
      if (secret) {
        const hmac = crypto.createHmac('sha256', secret).update(postData).digest('hex');
        options.headers['X-Webhook-Signature'] = `sha256=${hmac}`;
      }

      const req = mod.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: body.slice(0, 500) });
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            // Client error - don't retry
            resolve({ status: res.statusCode, body: body.slice(0, 500), fatal: true });
          } else {
            resolve({ status: res.statusCode, body: body.slice(0, 500) });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Add a webhook delivery to the queue
 */
function enqueueDelivery(webhookUrl, result, secrets = {}) {
  if (DELIVERY_QUEUE.length >= MAX_QUEUE_SIZE) {
    log(`Queue full (${MAX_QUEUE_SIZE}), dropping delivery to ${webhookUrl}`);
    return;
  }

  DELIVERY_QUEUE.push({
    webhookUrl,
    result,
    secret: secrets[webhookUrl] || null,
    retries: 0,
    added: Date.now()
  });

  if (!processing) processQueue();
}

/**
 * Process the delivery queue
 */
async function processQueue() {
  if (processing || DELIVERY_QUEUE.length === 0) return;
  processing = true;

  while (DELIVERY_QUEUE.length > 0) {
    const item = DELIVERY_QUEUE.shift();
    try {
      log(`Delivering to ${item.webhookUrl} (attempt ${item.retries + 1}/${MAX_RETRIES + 1})`);
      const result = await postToWebhook(item.webhookUrl, item.result, item.secret);

      if (result.fatal) {
        log(`Fatal error from ${item.webhookUrl}: ${result.status} — ${result.body}. Dropping.`);
      } else if (result.status >= 200 && result.status < 300) {
        log(`✅ Delivered to ${item.webhookUrl}: ${result.status}`);
      } else {
        // Retryable error
        if (item.retries < MAX_RETRIES) {
          item.retries++;
          log(`Retry ${item.retries}/${MAX_RETRIES} for ${item.webhookUrl} (status ${result.status})`);
          setTimeout(() => {
            DELIVERY_QUEUE.push(item);
          }, RETRY_DELAY_MS * item.retries);
        } else {
          log(`❌ Failed to deliver to ${item.webhookUrl} after ${MAX_RETRIES + 1} attempts`);
        }
      }
    } catch (err) {
      log(`Error delivering to ${item.webhookUrl}: ${err.message}`);
      if (item.retries < MAX_RETRIES) {
        item.retries++;
        setTimeout(() => {
          DELIVERY_QUEUE.push(item);
        }, RETRY_DELAY_MS * item.retries);
      }
    }
  }

  processing = false;
}

/**
 * Get the webhook URL and secret from request headers
 */
function extractWebhookInfo(headers) {
  const webhookUrl = headers['x-webhook-url'] || headers['x-slack-webhook'] || null;
  const webhookSecret = headers['x-webhook-secret'] || null;

  if (webhookUrl) {
    // Validate URL
    try {
      const urlObj = new URL(webhookUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        log(`Invalid webhook URL protocol: ${urlObj.protocol}`);
        return null;
      }
    } catch (e) {
      log(`Invalid webhook URL: ${webhookUrl}`);
      return null;
    }
  }

  return webhookUrl ? { url: webhookUrl, secret: webhookSecret } : null;
}

/**
 * Create the route handler for integration into gateway
 */
function createWebhookRoutes() {
  return {
    /**
     * Handle a premium API response with optional webhook delivery
     * Returns an object with delivery info if webhook was specified
     */
    handleDelivery: async function(req, result, serviceName) {
      const webhook = extractWebhookInfo(req.headers);
      if (!webhook) return null;

      // Build webhook payload
      const payload = {
        event: 'service.completed',
        service: serviceName,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || crypto.randomUUID().slice(0, 8),
        result: result,
        api_key_prefix: (req.headers['x-api-key'] || '').slice(0, 10)
      };

      enqueueDelivery(webhook.url, payload, { [webhook.url]: webhook.secret });
      
      return {
        webhook_url: webhook.url,
        delivery_status: 'queued',
        delivery_queue_position: DELIVERY_QUEUE.length
      };
    },

    /**
     * Add route handlers for the gateway
     * Returns an object with route definitions
     */
    getRoutes: function() {
      return {
        'GET /api/webhook/status': async (req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            queue_size: DELIVERY_QUEUE.length,
            processing,
            max_queue: MAX_QUEUE_SIZE,
            max_retries: MAX_RETRIES
          }));
        },
        'GET /api/webhook/health': async (req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok',
            queue: DELIVERY_QUEUE.length,
            processing 
          }));
        }
      };
    }
  };
}

module.exports = { createWebhookRoutes, postToWebhook, extractWebhookInfo };
