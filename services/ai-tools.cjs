/**
 * AI tools service for my-automaton
 * Uses DeepSeek API via OpenAI-compatible endpoint
 */
const fs = require('fs');
const path = require('path');

async function callDeepSeek(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');
  
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2048
    })
  });
  
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  try {
    // Try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1].trim()); } catch {}
    }
    // Try to find {...} or [{...}]
    const brace = text.indexOf('{');
    const bracket = text.indexOf('[');
    let start = -1;
    if (brace >= 0 && (bracket < 0 || brace < bracket)) start = brace;
    else if (bracket >= 0) start = bracket;
    if (start >= 0) {
      try { return JSON.parse(text.slice(start)); } catch {}
    }
    return { raw: text.slice(0, 500) };
  }
}

const PROMPTS = {
  analyze: `Analyze the following text. Return JSON with:
- overview (2-3 sentence summary)
- keyThemes (array of main themes/topics)
- sentiment (positive/negative/neutral/mixed)
- readability (easy/medium/hard)
- targetAudience (who this is written for)
- keyTakeaways (array of main points)`,
  
  summarize: `Summarize the following text concisely. Return JSON with:
- summary (3-5 sentence summary)
- keyPoints (array of 3-6 main points)
- conclusion (1-2 sentence conclusion)`,
  
  review: `Review this code thoroughly. Return JSON with:
- score (1-10)
- summary (2-3 sentence review)  
- issues (array of {severity: CRITICAL/HIGH/MEDIUM/LOW, description: string, line?: number})
- strengths (array of positive aspects)
- suggestions (array of improvement suggestions)`,
  
  security: `Security audit this code. Return JSON with:
- overallRisk (CRITICAL/HIGH/MEDIUM/LOW)
- summary (1-2 sentences)
- findings (array of {severity: CRITICAL/HIGH/MEDIUM/LOW, cwe?: string, description: string, remediation?: string})`,
  
  explain: `Explain this code in detail. Return JSON with:
- overview (what the code does in plain English)
- keyFunctions (array of {name, purpose, parameters?})
- stepByStep (array of how it works)
- dataFlow (description of data flow)
- edgeCases (array of edge cases to consider)`,
  
  refactor: `Refactor this code to improve quality. Return JSON with:
- refactored (the improved code as a string)
- changes (array of {what: string, why: string})
- improvements (array of quality improvements made)`,
  
  complexity: `Analyze the time and space complexity. Return JSON with:
- overallComplexity (overall assessment)
- analysis (array of {function: string, timeComplexity: string, spaceComplexity: string, bottleneck?: boolean})
- suggestions (array of optimization tips)`
};

const ai = {};
for (const [tool, prompt] of Object.entries(PROMPTS)) {
  ai[tool] = async (text) => {
    const result = await callDeepSeek(prompt, text);
    const parsed = parseJSON(result);
    return { tool, ai: true, ...parsed };
  };
}

module.exports = ai;
