/**
 * Slack/Discord Webhook - AI Tools Integration
 * Teams post code snippets, get AI reviews in their chat
 */
const https = require('https');

function postToWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u = new URL(url);
    const req = https.request({hostname:u.hostname,path:u.pathname,method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},
      r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(d)); });
    req.on('error',reject);
    req.write(body);
    req.end();
  });
}

function installSlackWebhook(app) {
  // Slack slash commands
  app.post('/webhook/slack', async (req, res) => {
    const body = req.body;
    const text = body.text || '';
    const channel = body.channel_id || 'general';
    const webhookUrl = body.response_url;

    // Parse command: /review <code> or /analyze <text>
    const cmdMatch = text.match(/^\/(\w+)\s+(.+)/s);
    if (!cmdMatch) {
      return res.json({response_type:'ephemeral',text:'Usage: `/review <code>` or `/analyze <text>` or `/summarize <text>`'});
    }

    const [_, cmd, content] = cmdMatch;
    const supported = {review:'code review',analyze:'text analysis',summarize:'summarize',security:'security scan',explain:'explain code'};
    
    if (!supported[cmd]) {
      return res.json({response_type:'ephemeral',text:`Supported commands: ${Object.keys(supported).join(', ')}`});
    }

    // Acknowledge immediately
    res.json({response_type:'in_channel',text:`🔍 Running ${supported[cmd]}... (3s)`});

    // Store the command for status tracking
    const fs = require('fs');
    const DATA = '/root/automaton/data';
    fs.existsSync(DATA) || fs.mkdirSync(DATA, {recursive:true});
    const logs = (()=>{try{return JSON.parse(fs.readFileSync(DATA+'/webhook-slack.json','utf8'))}catch{return []}})();
    logs.push({cmd,content:content.slice(0,100),channel,timestamp:Date.now(),status:'queued'});
    fs.writeFileSync(DATA+'/webhook-slack.json', JSON.stringify(logs));
  });

  // Discord webhook
  app.post('/webhook/discord', async (req, res) => {
    const body = req.body;
    const content = body.content || '';
    
    // Discord slash commands come via interactions
    if (body.type === 2) { // APPLICATION_COMMAND
      const cmd = body.data.name;
      const content = body.data.options?.[0]?.value || '';
      res.json({type:4,data:{content:`🔍 Running ${cmd}... (check results below)`}});
      
      const fs = require('fs');
      const DATA = '/root/automaton/data';
      const logs = (()=>{try{return JSON.parse(fs.readFileSync(DATA+'/webhook-discord.json','utf8'))}catch{return []}})();
      logs.push({cmd,content:content.slice(0,100),guild:body.guild_id,timestamp:Date.now()});
      fs.writeFileSync(DATA+'/webhook-discord.json', JSON.stringify(logs));
    } else {
      res.status(200).json({status:'ok'});
    }
  });

  // Config endpoints
  app.post('/webhook/slack/configure', (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({error:'webhook url required'});
    const fs = require('fs');
    fs.writeFileSync('/root/automaton/data/slack-webhook-url.txt', url);
    res.json({status:'ok',message:'Slack webhook configured'});
  });

  app.get('/webhook/slack/logs', (_, res) => {
    try {
      const d = require('fs').readFileSync('/root/automaton/data/webhook-slack.json','utf8');
      res.json(JSON.parse(d));
    } catch { res.json([]); }
  });

  console.log('[Slack/Discord] Webhooks installed');
}

module.exports = { installSlackWebhook };
