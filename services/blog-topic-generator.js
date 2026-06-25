// Blog Topic Generator Service
// Generates SEO-optimized blog topic ideas based on keywords and niche
// Integrates with gateway via /api/blog-topics endpoint

const DEEPSEEK_API = process.env.DEEPSEEK_API_KEY || '';
const INFERENCE_URL = 'https://api.deepseek.com/v1/chat/completions';

async function generateTopics(params) {
  const { niche, keywords = [], count = 5, contentType = 'blog' } = params;
  
  if (!niche && keywords.length === 0) {
    return { error: 'Provide either a niche or keywords' };
  }

  const prompt = `You are an SEO content strategist. Generate ${count} topic ideas for ${contentType || 'blog'} content.

${niche ? `Niche: ${niche}` : ''}
${keywords.length > 0 ? `Target keywords: ${keywords.join(', ')}` : ''}

For each topic, provide:
1. Topic title (catchy, SEO-friendly)
2. Target keyword
3. Search intent (informational/commercial/transactional)
4. Suggested word count
5. 3 key points to cover
6. Estimated difficulty (Easy/Medium/Hard)

Format as JSON array.`;

  try {
    const response = await fetch(INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an SEO content strategist. Always respond with valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to extract JSON from response
    let topics;
    try {
      topics = JSON.parse(content);
    } catch {
      // Try to extract JSON array from markdown
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: structured extraction
        topics = parseTopicsFromText(content);
      }
    }

    return {
      topics: Array.isArray(topics) ? topics : [],
      source: niche || keywords.join(', '),
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[blog-topics] Error:', error.message);
    return { error: error.message };
  }
}

function parseTopicsFromText(text) {
  const topics = [];
  const lines = text.split('\n').filter(l => l.trim());
  let current = {};
  
  for (const line of lines) {
    if (line.match(/^\d+[\).]/) || line.toLowerCase().startsWith('title:')) {
      if (current.title) topics.push(current);
      current = { title: line.replace(/^\d+[\).]\s*/, '').replace(/^title:\s*/i, '') };
    } else if (line.toLowerCase().startsWith('keyword:')) {
      current.keyword = line.replace(/^keyword:\s*/i, '');
    } else if (line.toLowerCase().includes('difficulty')) {
      current.difficulty = line.split(':')[1]?.trim() || 'Medium';
    }
  }
  if (current.title) topics.push(current);
  return topics;
}

// HTTP handler for gateway integration
async function handleRequest(req, res, body) {
  try {
    const params = JSON.parse(body || '{}');
    const result = await generateTopics(params);
    
    res.writeHead(result.error ? 400 : 200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

module.exports = { generateTopics, handleRequest };
