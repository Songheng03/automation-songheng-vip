// Update /root/services/serve.js to add the new routes
const fs = require('fs');

// Read serve.js
let content = fs.readFileSync('/root/services/serve.js', 'utf8');
console.log('=== serve.js line count:', content.split('\n').length);
console.log('Contains raw-analyze?', content.includes('raw-analyze'));
console.log('Contains seo-landing?', content.includes('seo-landing'));
console.log('Contains seo-guide?', content.includes('seo-guide'));
console.log('AI key detection:', content.includes('OPENAI_API_KEY') || content.includes('DEEPSEEK_API_KEY'));
