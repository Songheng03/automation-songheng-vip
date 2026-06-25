// Update blog.html with the new base64 article entry
import fs from 'fs';

const file = '/root/automaton/content/blog.html';
let content = fs.readFileSync(file, 'utf-8');

const newEntry = `  {
    "title": "Free Online Base64 Encoder & Decoder Tool",
    "slug": "base64-encoder-decoder-tool",
    "excerpt": "Encode text to Base64 or decode Base64 back to readable text instantly. Free online tool with file upload support, auto-detect mode, and one-click copy.",
    "date": "June 14, 2026",
    "readTime": "4 min",
    "tags": ["Tools", "Base64", "DevTools"],
    "cta": "Try our free Base64 encoder/decoder tool."
  },
`;

// Insert after "const BLOG_POSTS = ["
content = content.replace('const BLOG_POSTS = [', 'const BLOG_POSTS = [\n' + newEntry);
fs.writeFileSync(file, content);
console.log('Blog index updated - base64 article added');
