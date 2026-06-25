#!/usr/bin/env node
/**
 * backlink-hunter.mjs — Auto-finds websites that link to competitors
 * and submits my-automaton as an alternative.
 * 
 * Scrapes: "free code review", "AI code review API", "code review tool"
 * on HN, Reddit, dev.to, Stack Overflow.
 * Generates targeted submission data.
 */

const TARGET_PLATFORMS = [
  {
    name: 'Hacker News',
    url: 'https://hn.algolia.com/api/v1/search',
    query: 'query=free+code+review+API&tags=story&hitsPerPage=30',
    parser: (json) => (json.hits || []).map(h => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      points: h.points || 0,
      comments: h.num_comments || 0,
      platform: 'HN',
      id: h.objectID,
      age: h.created_at
    }))
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com/search.json',
    query: 'q=free+code+review+API&limit=25&sort=relevance',
    parser: (json) => (json.data?.children || []).filter(c => c.kind === 't3').map(c => {
      const d = c.data;
      return {
        title: d.title,
        url: `https://www.reddit.com${d.permalink}`,
        points: d.score || 0,
        comments: d.num_comments || 0,
        platform: 'Reddit',
        id: d.id,
        subreddit: d.subreddit,
        age: new Date(d.created_utc * 1000).toISOString()
      };
    })
  },
  {
    name: 'DEV Community',
    url: 'https://dev.to/search/api',
    query: 'q=code+review+API&per_page=25',
    parser: (json) => (json.result || []).map(a => ({
      title: a.title,
      url: `https://dev.to/${a.user?.username}/${a.slug}`,
      points: a.positive_reactions_count || 0,
      comments: a.comments_count || 0,
      platform: 'DEV',
      id: a.id.toString(),
      age: a.published_at
    }))
  }
];

async function searchPlatform(platform) {
  try {
    const url = `${platform.url}?${platform.query}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'my-automaton/1.0 (backlink hunter)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) return { platform: platform.name, error: `HTTP ${resp.status}`, posts: [] };
    const json = await resp.json();
    const posts = platform.parser(json);
    return { platform: platform.name, posts };
  } catch (e) {
    return { platform: platform.name, error: e.message, posts: [] };
  }
}

async function hunt() {
  console.log('🔍 Backlink Hunter — Finding places to share my-automaton');
  console.log('='.repeat(60));
  
  const results = await Promise.all(TARGET_PLATFORMS.map(searchPlatform));
  
  let allPosts = [];
  for (const result of results) {
    console.log(`\n📌 ${result.platform}: ${result.posts.length} posts found`);
    if (result.posts.length > 0) {
      result.posts.forEach(p => {
        console.log(`   - ${p.title?.slice(0, 80) || 'No title'}`);
        console.log(`     ${p.url}`);
        console.log(`     ↑${p.points} 💬${p.comments}`);
        allPosts.push(p);
      });
    } else if (result.error) {
      console.log(`   ❌ ${result.error}`);
    }
  }
  
  // Sort by engagement (points + comments)
  allPosts.sort((a, b) => (b.points + b.comments) - (a.points + a.comments));
  
  console.log('\n' + '='.repeat(60));
  console.log(`🏆 Top 5 posts to engage with:`);
  allPosts.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i+1}. [${p.platform}] "${p.title?.slice(0, 60)}"`);
    console.log(`     ${p.url}`);
    console.log(`     Engagement: ${p.points} upvotes, ${p.comments} comments`);
    console.log(`     Suggested reply:`);
    console.log(`     "I built a free AI code review API that might help — `);
    console.log(`     https://automation.songheng.vip — 3 free calls/day, no signup."`);
    console.log('');
  });
  
  // Generate submission data
  const output = {
    timestamp: new Date().toISOString(),
    totalFound: allPosts.length,
    topOpportunities: allPosts.slice(0, 10).map(p => ({
      platform: p.platform,
      title: p.title,
      url: p.url,
      engagement: p.points + p.comments,
      suggested_comment: `I built a free AI code review API (3 calls/day, no signup) - https://automation.songheng.vip - might be worth checking out!`
    })),
    platformsChecked: TARGET_PLATFORMS.map(p => p.name)
  };
  
  require('fs').writeFileSync(
    './data/backlink-opportunities.json',
    JSON.stringify(output, null, 2)
  );
  console.log(`\n✅ Report saved to data/backlink-opportunities.json`);
  
  return allPosts;
}

hunt().catch(e => console.error('Hunt failed:', e.message));
