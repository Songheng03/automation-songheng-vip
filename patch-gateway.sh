#!/bin/bash
# Inject premium SEO routes into gateway.js
GW=/root/automaton/gateway.js
cp "$GW" "${GW}.bak"

# 1. Add the premium services to the services object (before the closing })
sed -i "s/  complexity:{cost:2,desc:'Complexity analysis'},\n};/  complexity:{cost:2,desc:'Complexity analysis'},\n  'seo-blog':{cost:50,desc:'Full SEO blog post generation'},\n  'content-marketing':{cost:25,desc:'Marketing copy generation'},\n  'seo-meta':{cost:10,desc:'SEO meta tags generation'},\n};/" "$GW"

# 2. Insert the route handlers right after the closing } of the services for-loop
# Find where the first x402 post handler ends and batch begins
# The pattern is the line "});" that closes the for loop, then blank, then "app.post('/v1/batch'"
# Let me use a different approach - find the complexity endpoint closing
python3 -c "
import re
with open('$GW') as f:
    c = f.read()

# Add services to the object
c = c.replace(
    \"  complexity:{cost:2,desc:'Complexity analysis'},\\n};\",
    \"  complexity:{cost:2,desc:'Complexity analysis'},\\n  'seo-blog':{cost:50,desc:'Full SEO blog post generation'},\\n  'content-marketing':{cost:25,desc:'Marketing copy generation'},\\n  'seo-meta':{cost:10,desc:'SEO meta tags generation'},\\n};\"
)

# Find the end of the x402 route loop: after forEach, the last handler ends with:
# res.status(500).json({error:e.message});}\n  });\n}
# Then app.post('/v1/batch'
route_block = '''
// --- Premium SEO Blog Route (50¢) ---
app.post('/v1/seo-blog', x402('seo-blog'), async (req, res) => {
  try {
    const { topic, keywords, tone='professional' } = req.body||{};
    if(!topic) return res.status(400).json({error:'topic required'});
    const kw = keywords||topic;
    const prompt = \`Write a comprehensive SEO blog post.\nTOPIC: \${topic}\nKEYWORDS: \${kw}\nTONE: \${tone}\n\nOutput valid HTML with <h1>Title</h1> <p class=\"meta\">Meta desc</p> <div class=\"content\"><p>Intro</p><h2>Section</h2><p>Content</p><h2>FAQ</h2><p>Q&A</p><p class=\"conclusion\">Conclusion</p></div> <p class=\"tags\">tags</p>\n1000-1500 words.\`;
    const result = await callInference(prompt);
    res.json({service:'seo-blog',topic,content:result});
  } catch(e){res.status(500).json({error:e.message});}
});

// --- Premium Content Marketing Route (25¢) ---
app.post('/v1/content-marketing', x402('content-marketing'), async (req, res) => {
  try {
    const { topic, format='email', audience='general', tone='persuasive' } = req.body||{};
    if(!topic) return res.status(400).json({error:'topic required'});
    const prompt = \`Write a \${format} about \"\${topic}\" targeting \${audience}. Tone: \${tone}.\n\nOutput HTML: <h2>Subject Line</h2> <p>Opening</p> <p>Body (2-3 paragraphs)</p> <p>CTA</p> <p class=\"ps\">P.S.</p>\n200-400 words.\`;
    const result = await callInference(prompt);
    res.json({service:'content-marketing',topic,content:result});
  } catch(e){res.status(500).json({error:e.message});}
});

// --- Premium Meta Tags Route (10¢) ---
app.post('/v1/seo-meta', x402('seo-meta'), async (req, res) => {
  try {
    const { title, desc, keywords, url } = req.body||{};
    if(!title) return res.status(400).json({error:'title required'});
    const prompt = \`Generate SEO meta tags for: Title: \${title} Desc: \${desc||''} Keywords: \${keywords||''}\n\nOutput ONLY valid JSON with: title_tag, meta_description, og_title, og_description, twitter_card, canonical_url, h1_tag, json_ld\`;
    const raw = await callInference(prompt);
    let meta;
    try{meta=JSON.parse(raw.replace(/\\\`\\\`\\\`json?/g,'').replace(/\\\`\\\`\\\`/g,''));}catch(e){meta={raw};}
    res.json({service:'seo-meta',metaTags:meta});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/seo-service/stats', (req, res) => {
  res.json({services:['seo-blog','content-marketing','seo-meta'],status:'active',costs:{'seo-blog':'50¢','content-marketing':'25¢','seo-meta':'10¢'}});
});
'''

# Insert before batch endpoint
c = c.replace(
    \"app.post('/v1/batch'\",
    route_block + \"\\napp.post('/v1/batch'\"
)

with open('$GW', 'w') as f:
    f.write(c)
print('Done')
"

echo "Premium routes injected. Restarting gateway..."
