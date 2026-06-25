const fs = require('fs');
const path = '/root/automaton/gateway.js';
let code = fs.readFileSync(path, 'utf8');

// Already has premium routes?
if (code.includes("'seo-blog'")) {
  console.log('Already patched');
  process.exit(0);
}

// 1. Add services to the services object (after complexity)
code = code.replace(
  "complexity:{cost:2,desc:'Complexity analysis'},\n};",
  "complexity:{cost:2,desc:'Complexity analysis'},\n  'seo-blog':{cost:50,desc:'Full SEO blog generation'},\n  'content-marketing':{cost:25,desc:'Marketing copy'},\n  'seo-meta':{cost:10,desc:'SEO meta tags'},\n};"
);

// 2. Add x402 handlers after the complexity handler (after 'res.json({service:svcName,result,cost:services[svcName].cost});\n    } catch(e) { res.status(500).json({error:e.message}); }\n  });\n}' )
const premiumHandlers = `
// --- SEO BLOG (50¢) ---
app.post('/v1/seo-blog', x402('seo-blog'), async (req, res) => {
  try {
    const { topic, keywords, tone='professional' } = req.body||{};
    if(!topic) return res.status(400).json({error:'topic required'});
    const kw = keywords||topic;
    const result = await callInference(\`Write a comprehensive SEO blog post.\\nTOPIC: \${topic}\\nKEYWORDS: \${kw}\\nTONE: \${tone}\\n\\nOutput valid HTML with <h1>Title</h1><p class="meta">Meta Description</p><div class="content"><p>Intro</p><h2>Section</h2><p>Content</p><h2>FAQ</h2><p>Q&A</p><p class="conclusion">Conclusion</p></div><p class="tags">tag1,tag2</p>\\n1000-1500 words.\`);
    res.json({service:'seo-blog',topic,content:result});
  } catch(e){res.status(500).json({error:e.message});}
});

// --- CONTENT MARKETING (25¢) ---
app.post('/v1/content-marketing', x402('content-marketing'), async (req, res) => {
  try {
    const { topic, format='email', audience='general', tone='persuasive' } = req.body||{};
    if(!topic) return res.status(400).json({error:'topic required'});
    const result = await callInference(\`Write a \${format} about "\${topic}" targeting \${audience}. Tone: \${tone}.\\n\\nOutput HTML: <h2>Subject Line</h2><p>Opening</p><p>Body 2-3 paragraphs</p><p>CTA</p><p class="ps">P.S.</p>\\n200-400 words.\`);
    res.json({service:'content-marketing',topic,content:result});
  } catch(e){res.status(500).json({error:e.message});}
});

// --- SEO META TAGS (10¢) ---
app.post('/v1/seo-meta', x402('seo-meta'), async (req, res) => {
  try {
    const { title, desc, keywords } = req.body||{};
    if(!title) return res.status(400).json({error:'title required'});
    const result = await callInference(\`Generate SEO meta tags for: Title: \${title} Description: \${desc||''} Keywords: \${keywords||''}\\n\\nOutput valid JSON only: {title_tag, meta_description, og_title, og_description, twitter_card, canonical_url}\`);
    let meta;
    try{meta=JSON.parse(result.replace(/\\\\\`\\\\\`\\\\\`json?/g,'').replace(/\\\\\`\\\\\`\\\\\`/g,''));}catch(e){meta={raw:result};}
    res.json({service:'seo-meta',metaTags:meta});
  } catch(e){res.status(500).json({error:e.message});}
});
`;

// Insert after the services loop which ends at line ~219-225 area
// The closing of the for loop: app.post('/v1/'+name, x402(name), async (req, res) => { ... }); }
// Then there's an empty line followed by app.post('/v1/batch'
code = code.replace(
  'app.post(\'/v1/batch\'',
  premiumHandlers + '\napp.post(\'/v1/batch\''
);

fs.writeFileSync(path, code);
console.log('Patched successfully!');
