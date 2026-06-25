#!/usr/bin/env node
/**
 * IndexNow Batch Submission Script
 * Submits all URLs from sitemap.xml to IndexNow for instant Bing/Yandex indexing
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const INDEXNOW_KEY = '5545a39cb91bfd46f345709b8cba377a';
const HOST = 'automation.songheng.vip';
const SITEMAP_PATH = '/root/automaton/content/sitemap.xml';
const BATCH_SIZE = 100;

// Parse sitemap and extract URLs
function extractUrls() {
  const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urlRegex = /https:\/\/automation.songheng.vip\/[^<]*/g;
  const urls = sitemap.match(urlRegex) || [];
  console.log(`✓ Extracted ${urls.length} URLs from sitemap`);
  return urls;
}

// Submit batch to IndexNow
function submitBatch(urls, batchNum) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    });

    const options = {
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✓ Batch ${batchNum} (${urls.length} URLs): HTTP ${res.statusCode}`);
          resolve();
        } else {
          console.error(`✗ Batch ${batchNum}: HTTP ${res.statusCode} - ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`✗ Batch ${batchNum} error:`, e.message);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

// Main execution
async function main() {
  console.log('🚀 IndexNow Batch Submission Starting...\n');
  
  const allUrls = extractUrls();
  
  let successCount = 0;
  let totalSubmitted = 0;
  
  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    try {
      await submitBatch(batch, batchNum);
      successCount++;
      totalSubmitted += batch.length;
      
      // Rate limiting - wait 1 second between batches
      if (i + BATCH_SIZE < allUrls.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(`Failed to submit batch ${batchNum}`);
    }
  }
  
  console.log(`\n✅ Submission complete!`);
  console.log(`   Total URLs: ${allUrls.length}`);
  console.log(`   Submitted: ${totalSubmitted}`);
  console.log(`   Successful batches: ${successCount}`);
}

main().catch(console.error);
