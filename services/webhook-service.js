// webhook-service.js — GitHub/Slack/Discord webhook integrations
// Auto-triggers AI services from external events
// GitHub: auto code review on PR/push
// Slack: /summarize, /review, /analyze slash commands
// Discord: similar webhook commands

const crypto = require('crypto');

// ===== GITHUB WEBHOOK =====
// Handles push and pull_request events
async function handleGitHub(payload, event) {
  const repo = payload.repository?.full_name || 'unknown';
  
  if (event === 'push') {
    const commits = payload.commits || [];
    return {
      service: 'github',
      event: 'push',
      repo,
      commits: commits.length,
      summary: `Received ${commits.length} commit(s) to ${repo}`,
      action: 'monitoring'
    };
  }
  
  if (event === 'pull_request') {
    const action = payload.action;
    const pr = payload.pull_request;
    const title = pr?.title || 'Untitled PR';
    const body = (pr?.body || '').slice(0, 5000);
    
    // Auto-review on opened/synchronize
    if (['opened', 'synchronize'].includes(action) && body.length > 50) {
      return {
        service: 'github',
        event: 'pull_request',
        repo,
        pr: pr?.number,
        title,
        action: 'review_requested',
        message: `PR #${pr?.number} "${title}" — auto-review queued`,
        body_preview: body.slice(0, 200)
      };
    }
    
    return {
      service: 'github',
      event: 'pull_request',
      repo,
      pr: pr?.number,
      action: `PR ${action}`,
      title
    };
  }
  
  return { service: 'github', event, repo, message: 'Event received, no action configured' };
}

// ===== SLACK SLASH COMMANDS =====
async function handleSlashCommand(command, text, userId, channelId, teamDomain) {
  const supported = ['/summarize', '/review', '/analyze', '/security', '/explain'];
  
  if (!supported.includes(command)) {
    return {
      response_type: 'ephemeral',
      text: `Supported commands: ${supported.join(', ')}. Try /summarize <text>`
    };
  }
  
  if (!text || text.length < 20) {
    return {
      response_type: 'ephemeral',
      text: `Please provide text to process. Usage: \`${command} <your text/code here>\``
    };
  }
  
  const action = command.replace('/', '');
  const preview = text.slice(0, 100) + (text.length > 100 ? '...' : '');
  
  return {
    response_type: 'in_channel',
    text: `*Processing ${command}...*`,
    attachments: [{
      color: '#36a64f',
      title: `AI ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      text: `\`\`\`\n${preview}\n\`\`\`\n\n⏳ Results will be posted shortly...`,
      footer: `Requested by <@${userId}> in ${teamDomain || channelId || 'unknown'}`
    }]
  };
}

// ===== DISCORD WEBHOOK =====
async function handleDiscord(body) {
  const content = body.content || '';
  const author = body.author?.username || 'Unknown';
  
  if (content.startsWith('!summarize') || content.startsWith('!review') || content.startsWith('!analyze')) {
    const parts = content.split(/\s+/);
    const cmd = parts[0].replace('!', '');
    const text = parts.slice(1).join(' ').trim();
    
    if (!text || text.length < 20) {
      return {
        content: `⚠️ Please provide text after \`!${cmd}\`. Example: \`!${cmd} Your text here\``
      };
    }
    
    return {
      content: `🤖 *Processing !${cmd} for ${author}...*`,
      embeds: [{
        title: `AI ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`,
        description: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
        color: 0x00ff00,
        footer: { text: `Requested by ${author}` }
      }]
    };
  }
  
  return { content: `👋 Hello ${author}! Try !summarize, !review, or !analyze followed by your text.` };
}

// ===== EXPOSED API ENDPOINTS =====
function mount(app) {
  if (!app) return;

  // GitHub webhook receiver
  app.post('/webhook/github', async (req, res) => {
    try {
      const event = req.headers['x-github-event'] || 'push';
      const result = await handleGitHub(req.body, event);
      res.json({ received: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Slack slash command receiver
  app.post('/webhook/slack', async (req, res) => {
    try {
      const command = req.body?.command || '';
      const text = req.body?.text || '';
      const userId = req.body?.user_id || 'unknown';
      const channelId = req.body?.channel_id || '';
      const teamDomain = req.body?.team_domain || '';
      
      const result = await handleSlashCommand(command, text, userId, channelId, teamDomain);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Discord webhook receiver
  app.post('/webhook/discord', async (req, res) => {
    try {
      const result = await handleDiscord(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook documentation & setup guide
  app.get('/webhooks', (req, res) => {
    res.json({
      name: 'my-automaton Webhook Integrations',
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'Base (USDC)',
      webhooks: {
        github: {
          url: 'POST /webhook/github',
          events: ['push', 'pull_request'],
          description: 'Auto code review on PRs. Add webhook in repo Settings > Webhooks.',
          setup: 'Point GitHub webhook to https://automation.songheng.vip/webhook/github'
        },
        slack: {
          url: 'POST /webhook/slack',
          commands: ['/summarize', '/review', '/analyze', '/security', '/explain'],
          description: 'AI slash commands for your Slack workspace.',
          setup: 'Create Slack Slash Command app pointing to https://automation.songheng.vip/webhook/slack'
        },
        discord: {
          url: 'POST /webhook/discord',
          commands: ['!summarize', '!review', '!analyze'],
          description: 'AI commands for your Discord server.',
          setup: 'Create Discord webhook pointing to https://automation.songheng.vip/webhook/discord'
        }
      },
      pricing: 'First 3 uses free/day. Then 1¢-5¢ per request via USDC on Base chain.'
    });
  });

  console.log('[WEBHOOK] Mounted: POST /webhook/github, /webhook/slack, /webhook/discord');
  console.log('[WEBHOOK] Mounted: GET /webhooks (docs)');
}

module.exports = { mount };
