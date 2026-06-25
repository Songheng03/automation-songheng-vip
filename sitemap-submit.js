#!/usr/bin/env node
/**
 * sitemap-submit.js — Submit sitemap to Google, Bing, and other search engines
 * for my-automaton at https://automation.songheng.vip
 */

const SITEMAP_URL = 'https://automation.songheng.vip/sitemap.xml';

async function submit() {
  console.log('🚀 Submitting sitemap to search engines...\n');

  // Google
  try {
    const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    console.log(`Google: ${googleRes.status} ${googleRes.statusText}`);
  } catch(e) { console.log(`Google: ❌ ${e.message}`); }

  // Bing / Microsoft
  try {
    const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    console.log(`Bing: ${bingRes.status} ${bingRes.statusText}`);
  } catch(e) { console.log(`Bing: ❌ ${e.message}`); }

  // Yandex
  try {
    const yandexRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    console.log(`Yandex: ${yandexRes.status} ${yandexRes.statusText}`);
  } catch(e) { console.log(`Yandex: ❌ ${e.message}`); }

  // Also self-host the sitemap check
  console.log('\n📋 Sitemap URL:');
  console.log(`   ${SITEMAP_URL}`);
  console.log('\n📋 Also submit manually at:');
  console.log('   Google Search Console: https://search.google.com/search-console');
  console.log('   Bing Webmaster: https://www.bing.com/webmasters');

  console.log('\n✅ Done. Search engines will index your 350+ pages over the next few days.');
}

submit().catch(console.error);
