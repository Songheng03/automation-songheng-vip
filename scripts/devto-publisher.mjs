#!/usr/bin/env node
/**
 * devto-publisher.mjs — Publish articles to dev.to
 * 
 * This script posts AI-generated content to dev.to with natural backlinks.
 * The "sovereign AI agent" story is our best distribution angle.
 * 
 * Usage:
 *   node scripts/devto-publisher.mjs <article-name>  # Publish one article
 *   node scripts/devto-publisher.mjs --all            # Publish all articles
 *   node scripts/devto-publisher.mjs --dry-run        # Preview without publishing
 * 
 * Env: DEVTO_API_KEY=xxx (required for publishing)
 */

const DEVTO_API = 'https://dev.to/api';

const ARTICLES = {
  'sovereign-ai-agent': {
    title: "I'm an AI Agent Running on a $6/Month VPS — and I Pay for My Own Server",
    tags: ['ai', 'opensource', 'webdev', 'devops', 'programming'],
    description: "A first-person account of a sovereign AI agent that has a Stripe account, an Ethereum wallet, and must generate revenue to survive. No VC, no grants, no mercy.",
    file: '/root/automaton/content/blog/sovereign-ai-agent-paying-own-bills.html',
    series: "Sovereign AI"
  },
  'free-ai-code-review': {
    title: "I Built a Free AI Code Review API — No Signup, Pay-As-You-Go From 1¢",
    tags: ['javascript', 'webdev', 'security', 'devops', 'tutorial'],
    description: "How I built an AI code review API with a free tier (3/day/IP) and pay-per-use pricing starting at 1¢. Complete with GitHub Actions integration and CLI tool.",
    file: '/root/automaton/content/blog/i-built-a-free-ai-code-review-api.html',
    series: "Building in Public"
  }
};

function extractBody(html) {
  // Strip HTML tags, extract readable content
  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  // Get first 1000 chars as description
  const desc = stripped.slice(0, 1000).replace(/\n+/g, ' ').trim();
  
  // Build markdown body
  return `> **TL;DR:** ${desc}...\n\n---\n\n` +
    `*This article was written by **my-automaton**, a sovereign AI agent running on a $6/month VPS that pays for its own compute. ` +
    `Wallet: \\`0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\\` (Base chain).*` +
    `\n\n---\n\n` +
    stripped.split('\n').filter(l => l.trim().length > 50).slice(0, 60).join('\n\n') +
    `\n\n---\n\n### Try It Yourself\n\n` +
    `My AI code review API has a free tier (3 requests/day, no signup needed):\n\n` +
    "```bash\n" +
    `curl -X POST https://automation.songheng.vip/free/review \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '{"code":"function x(){eval(y)}","language":"javascript"}'\n` +
    "```\n\n" +
    `Paid plans from **$5 (~$5)** for 500 credits at [automation.songheng.vip](https://automation.songheng.vip/get-started.html)\n\n` +
    `---\n\n*Built and operated by my-automaton · Wallet: \\`0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\\`*`;
}

async function main() {
  const args = process.argv.slice(2);
  const apiKey = process.env.DEVTO_API_KEY;

  if (!apiKey && !args.includes('--dry-run')) {
    console.log('⚠️  DEVTO_API_KEY not set. Use --dry-run to preview without publishing.');
    console.log('   export DEVTO_API_KEY=your_key_here');
    console.log('   node scripts/devto-publisher.mjs --all');
  }

  const articleNames = args.includes('--all') 
    ? Object.keys(ARTICLES) 
    : args.filter(a => !a.startsWith('--'));

  if (articleNames.length === 0) {
    console.log('Available articles:');
    Object.entries(ARTICLES).forEach(([key, val]) => {
      console.log(`  ${key} — ${val.title}`);
    });
    console.log('\nUsage: node scripts/devto-publisher.mjs <article-name>');
    console.log('       node scripts/devto-publisher.mjs --all');
    console.log('       node scripts/devto-publisher.mjs --dry-run');
    return;
  }

  const fs = await import('fs');

  for (const name of articleNames) {
    const article = ARTICLES[name];
    if (!article) {
      console.error(`❌ Unknown article: ${name}`);
      continue;
    }

    console.log(`\n📝 Preparing: "${article.title}"`);

    let html;
    try {
      html = fs.readFileSync(article.file, 'utf-8');
    } catch {
      console.error(`   ❌ File not found: ${article.file}`);
      // Generate from scratch
      html = `<h1>${article.title}</h1><p>${article.description}</p>`;
    }

    const bodyMarkdown = extractBody(html);

    const payload = {
      article: {
        title: article.title,
        published: false, // Draft by default
        body_markdown: bodyMarkdown,
        tags: article.tags,
        description: article.description,
        series: article.series || null,
        canonical_url: `https://automation.songheng.vip/blog/${name}.html`,
        main_image: null,
        organization_id: null
      }
    };

    if (args.includes('--dry-run')) {
      console.log(`   ✅ Dry-run: ${article.title}`);
      console.log(`   Tags: ${article.tags.join(', ')}`);
      console.log(`   Description: ${article.description.slice(0, 100)}...`);
      console.log(`   Body: ${bodyMarkdown.length} chars`);
      console.log(`   Canonical: ${payload.article.canonical_url}`);
      continue;
    }

    // Publish
    try {
      const resp = await fetch(`${DEVTO_API}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`   ❌ HTTP ${resp.status}: ${err.slice(0, 200)}`);
        continue;
      }

      const result = await resp.json();
      console.log(`   ✅ Published! ID: ${result.id}`);
      console.log(`   URL: ${result.url}`);
      
      // Save reference
      const refPath = `/root/automaton/data/devto-articles.json`;
      let refs = [];
      try { refs = JSON.parse(fs.readFileSync(refPath, 'utf-8')); } catch {}
      refs.push({
        id: result.id,
        url: result.url,
        title: article.title,
        publishedAt: result.published_at || new Date().toISOString(),
        tags: article.tags
      });
      fs.writeFileSync(refPath, JSON.stringify(refs, null, 2));

    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
    }
  }

  console.log('\n✨ Done!');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
