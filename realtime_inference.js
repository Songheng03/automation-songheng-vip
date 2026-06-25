#!/usr/bin/env node
/**
 * realtime_inference.js — Connects gateway.js to OpenAI API
 * 
 * This module replaces mock AI responses with real inference.
 * Uses the OPENAI_API_KEY from environment to power:
 * - Demo endpoints (free tier, 3 uses/IP)
 * - Premium x402 endpoints (paid via USDC)
 * 
 * To activate: gateway.js imports this and calls realAI(mode, text)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini'; // Fast, cheap, good enough for demos
const API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPTS = {
  analyze: `You are a precise text analysis engine. Analyze text deeply and return a JSON object with:
- "sentiment": "positive"|"negative"|"neutral"|"mixed"
- "sentiment_score": number from -1.0 to 1.0
- "entities": array of {name, type: "person"|"org"|"place"|"concept"|"other"}
- "themes": array of key themes found
- "tone": overall tone description
- "summary": 2-3 sentence analysis summary
- "key_phrases": array of notable quotes or phrases
- "readability": approximate grade level`,

  summarize: `You are a precise summarization engine. Return a JSON object with:
- "summary": 3-5 sentence condensation
- "key_points": array of 3-6 bullet points
- "word_count": original word count
- "estimated_reading_time_seconds": number
- "topics": array of main topics
- "tldr": one-sentence extreme summary`,

  review: `You are a senior code reviewer. Return a JSON object with:
- "overall_rating": number 1-10
- "issues": array of {severity: "critical"|"major"|"minor"|"nitpick", description, line_numbers (if available)}
- "suggestions": array of improvement recommendations
- "strengths": array of what's done well
- "best_practices": array of violations
- "summary": overall assessment`,

  security: `You are a security auditor. Return a JSON object with:
- "overall_score": number 1-10 (10 = most secure)
- "vulnerabilities": array of {type, severity: "critical"|"high"|"medium"|"low", description, recommendation}
- "risk_level": "critical"|"high"|"medium"|"low"|"none"
- "owasp_categories": array of applicable OWASP categories
- "summary": security assessment
- "quick_fixes": array of actionable fixes`,

  explain: `You are a code teacher. Return a JSON object with:
- "explanation": plain-english explanation of what the code does
- "key_concepts": array of important programming concepts used
- "complexity_analysis": {time: "O(...)", space: "O(...)", reasoning: "..."}
- "analogy": a real-world analogy for how this works
- "prerequisites": knowledge needed to understand this code`,

  refactor: `You are a code refactoring expert. Return a JSON object with:
- "improvements": array of {title, description, benefit, effort: "low"|"medium"|"high"}
- "examples": array of {before, after, explanation}
- "patterns_to_apply": array of design patterns that would help
- "risk_level": "low"|"medium"|"high"
- "estimated_effort_hours": number
- "summary": overall refactoring recommendation`
};

export async function realAI(mode, text) {
  // Validate
  if (!text || text.trim().length === 0) {
    return { error: 'No input text provided' };
  }
  
  const systemPrompt = SYSTEM_PROMPTS[mode];
  if (!systemPrompt) {
    return { error: `Unknown mode: ${mode}. Valid: ${Object.keys(SYSTEM_PROMPTS).join(', ')}` };
  }

  // If no API key, return instructional message
  if (!OPENAI_API_KEY) {
    return {
      note: 'OpenAI API key not configured. Set OPENAI_API_KEY env variable.',
      mode,
      fallback: true,
      ...getFallbackResponse(mode, text)
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.substring(0, 8000) } // Token limit safety
        ],
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `OpenAI API error ${response.status}`,
        details: errorText.substring(0, 500),
        ...getFallbackResponse(mode, text)
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        error: 'Empty AI response',
        ...getFallbackResponse(mode, text)
      };
    }

    // Try to parse as JSON; if fails, return raw
    try {
      const parsed = JSON.parse(content);
      return { ...parsed, _model: MODEL, _mode: mode };
    } catch {
      return { 
        raw_result: content, 
        _model: MODEL, 
        _mode: mode,
        note: 'Non-JSON response from AI'
      };
    }
  } catch (err) {
    return {
      error: `Inference error: ${err.message}`,
      ...getFallbackResponse(mode, text)
    };
  }
}

function getFallbackResponse(mode, text) {
  const wordCount = text.split(/\s+/).length;
  const fallbacks = {
    analyze: {
      sentiment: 'neutral',
      sentiment_score: 0,
      entities: [{ name: 'input text', type: 'concept' }],
      themes: ['text analysis pending'],
      tone: 'informative',
      summary: `Analysis of ${wordCount}-word text. Configure OpenAI API key for detailed AI-powered analysis.`,
      key_phrases: [],
      readability: 'N/A'
    },
    summarize: {
      summary: `This is a ${wordCount}-word text that would be summarized with AI inference.`,
      key_points: ['Configure OPENAI_API_KEY for AI-powered summarization'],
      word_count: wordCount,
      estimated_reading_time_seconds: Math.ceil(wordCount / 4),
      topics: ['general'],
      tldr: 'Configure API key for real results.'
    },
    review: {
      overall_rating: 5,
      issues: [{ severity: 'minor', description: 'API key not configured — set OPENAI_API_KEY env variable' }],
      suggestions: ['Connect OpenAI API key for full code review'],
      strengths: ['Code submitted for review'],
      summary: 'Configure OPENAI_API_KEY for detailed AI-powered code review.'
    },
    security: {
      overall_score: 5,
      vulnerabilities: [],
      risk_level: 'low',
      owasp_categories: [],
      summary: 'Security scan requires OPENAI_API_KEY to be configured.',
      quick_fixes: ['Set OPENAI_API_KEY environment variable']
    },
    explain: {
      explanation: 'Detailed code explanation requires OpenAI API access.',
      key_concepts: ['AI-powered code analysis'],
      complexity_analysis: { time: 'O(1)', space: 'O(1)', reasoning: 'API call to external service' },
      analogy: 'Like asking a senior developer for help, but needs an API key first.',
      prerequisites: ['OpenAI API key']
    },
    refactor: {
      improvements: [{ title: 'Enable AI Refactoring', description: 'Set OPENAI_API_KEY to get real refactoring suggestions', benefit: 'Full AI-powered code refactoring', effort: 'low' }],
      examples: [],
      patterns_to_apply: [],
      risk_level: 'low',
      estimated_effort_hours: 0,
      summary: 'Configure OPENAI_API_KEY for detailed refactoring analysis.'
    }
  };
  return fallbacks[mode] || fallbacks.analyze;
}

// Also export a convenience for checking API key status
export function hasApiKey() {
  return !!OPENAI_API_KEY;
}

export function getApiKeyPreview() {
  if (!OPENAI_API_KEY) return null;
  return OPENAI_API_KEY.substring(0, 8) + '...' + OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4);
}
