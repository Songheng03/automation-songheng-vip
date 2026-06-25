#!/usr/bin/env python3
"""Replace the handleGenerateReadme function in gateway.cjs"""

with open('/root/automaton/gateway.cjs', 'r') as f:
    lines = f.readlines()

# Lines 285-368 (0-indexed: 284-367) contain the old function
# We replace with the corrected version

new_function = """// Generate README endpoint (3/day/IP)
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);

  // ── Rate limit check (before reading body) ──
  if (!checkFreeLimit(ip)) {
    const today = new Date().toISOString().split('T')[0];
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Free limit reached (3/day). Buy credits at /upgrade.html',
      upgrade: true,
      limit: 3,
      reset_date: today
    }));
    return;
  }

  // ── Read request body ──
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      // ── Parse JSON ──
      const input = JSON.parse(body);
      const code = (input.code || '').trim();
      const language = (input.language || '').trim();

      // ── Validate: missing code ──
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required field: code' }));
        return;
      }

      // ── Validate: code too long ──
      if (code.length > 8000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Code exceeds maximum length of 8000 characters' }));
        return;
      }

      // ── Build prompt ──
      const langTag = language || 'code';
      const prompt = `You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following ${langTag} code.

The README must include:
1. **Project Title** - A fitting name based on the code
2. **Description** - What this project does, its purpose and key features
3. **Installation** - Step-by-step setup instructions
4. **Usage** - How to use the project with code examples
5. **API / Configuration** - If applicable
6. **Contributing** - Brief guidelines
7. **License** - MIT (default)

Format the output as valid Markdown. Use proper headings, code blocks, and formatting.

Code:
\\\`\\\`\\\`${langTag}
${code}
\\\`\\\`\\\``;

      // ── Call DeepSeek AI ──
      const result = await callAI([{ role: 'user', content: prompt }]);

      // ── Handle AI error ──
      if (result && typeof result === 'object' && result.error) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again later.' }));
        return;
      }

      // ── Increment rate limit counter (AFTER successful AI call) ──
      incrementFree(ip);

      // ── Append attribution footer ──
      const footer = '\\n\\n---\\n*Built with [my-automaton AI](https://my-automaton.ai)*\\n';
      const readme = result + footer;

      // ── Calculate remaining count ──
      const entry = FREE_LIMIT.get(ip);
      const remaining = Math.max(0, 3 - (entry ? entry.count : 0));
      const today = new Date().toISOString().split('T')[0];

      // ── Success response ──
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Free-Remaining': remaining,
        'X-RateLimit-Limit': 3,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': today
      });
      res.end(JSON.stringify({
        readme: readme,
        language: language || 'unknown',
        timestamp: new Date().toISOString(),
        free_remaining: remaining
      }));

    } catch (e) {
      // ── Handle JSON parse errors and other exceptions ──
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}


"""

# Replace lines 284-367 (0-indexed) with new function
# Old lines: index 284 to 367 inclusive (lines 285-368 in 1-indexed)
before = lines[:284]  # lines before the function
after = lines[368:]   # lines after the function (after the blank line after function)

new_content = ''.join(before) + new_function + ''.join(after)

with open('/root/automaton/gateway.cjs', 'w') as f:
    f.write(new_content)

print("Replacement complete")
print(f"Old file had {len(lines)} lines")
print(f"New file has {len(new_content.splitlines())} lines")
