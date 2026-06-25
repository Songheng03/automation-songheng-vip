/**
 * SEO Content Optimizer Service
 * Provides SEO content optimization and outline generation
 * Uses keyword analysis, readability scoring, and structure recommendations
 */

const https = require('https');

/**
 * Optimize content for SEO
 * @param {string} text - Content text to optimize
 * @param {Object} options - { targetKeyword, contentType, tone }
 * @returns {Object} - Analysis and optimization suggestions
 */
async function optimizeContent(text, options = {}) {
  const { targetKeyword = '', contentType = 'blog', tone = 'professional' } = options;
  
  if (!text || text.length < 50) {
    return { error: 'Text too short (minimum 50 characters)', optimized: false };
  }

  const wordCount = text.split(/\s+/).length;
  const keywordCount = targetKeyword ? text.toLowerCase().split(targetKeyword.toLowerCase()).length - 1 : 0;
  const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(2) : 0;
  
  // Readability: Flesch-like scoring based on avg word length and sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
  const avgWordLength = text.replace(/\s/g, '').length / (wordCount || 1);
  const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordLength * 5 + avgSentenceLength * 1.5)));
  
  // Heading analysis
  const h2Count = (text.match(/##\s/g) || []).length;
  const h3Count = (text.match(/###\s/g) || []).length;
  
  // Suggestions
  const suggestions = [];
  
  if (keywordDensity < 0.5 && targetKeyword) {
    suggestions.push(`Increase keyword "${targetKeyword}" usage (current density: ${keywordDensity}%). Aim for 1-3% density.`);
  }
  if (keywordDensity > 5) {
    suggestions.push(`Keyword stuffing detected (${keywordDensity}%). Reduce "${targetKeyword}" usage to avoid penalties.`);
  }
  if (avgSentenceLength > 25) {
    suggestions.push(`Sentences average ${Math.round(avgSentenceLength)} words — shorten them for better readability.`);
  }
  if (h2Count < 2 && wordCount > 300) {
    suggestions.push('Add more H2 subheadings to structure your content — aim for 1 per 200 words.');
  }
  if (wordCount < 300) {
    suggestions.push(`Content is ${wordCount} words — SEO performs better with 500+ words. Consider expanding.`);
  }
  if (readabilityScore < 30) {
    suggestions.push('Content is complex (readability score: ' + Math.round(readabilityScore) + '). Use shorter words and sentences.');
  }
  if (!text.includes('<a href') && !text.includes('[') && contentType === 'blog') {
    suggestions.push('Add internal/external links to improve SEO and user engagement.');
  }

  return {
    optimized: true,
    stats: {
      wordCount,
      sentenceCount: sentences.length,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      keywordCount,
      keywordDensity: parseFloat(keywordDensity),
      readabilityScore: Math.round(readabilityScore),
      headings: { h2: h2Count, h3: h3Count }
    },
    suggestions,
    meta: {
      targetKeyword,
      contentType,
      tone,
      estimatedReadTime: Math.max(1, Math.round(wordCount / 200)) + ' min'
    }
  };
}

/**
 * Generate SEO-optimized content outline
 * @param {string} topic - Content topic
 * @param {number} wordCount - Target word count
 * @returns {Object} - Outline with structure recommendations
 */
async function generateOutline(topic, wordCount = 1000) {
  if (!topic || topic.length < 3) {
    return { error: 'Topic too short. Provide a meaningful topic (3+ characters).' };
  }

  const sectionCount = Math.max(3, Math.round(wordCount / 200));
  const introWords = Math.round(wordCount * 0.15);
  const conclusionWords = Math.round(wordCount * 0.1);
  const bodyWords = wordCount - introWords - conclusionWords;
  const perSection = Math.round(bodyWords / sectionCount);

  const sections = [];
  for (let i = 1; i <= sectionCount; i++) {
    sections.push({
      heading: `Section ${i}: [Write about ${topic} aspect ${i}]`,
      type: i === 1 ? 'overview' : (i === sectionCount ? 'advanced' : 'detailed'),
      suggestedWordCount: perSection,
      tips: [
        'Include target keyword naturally',
        'Use subheadings (H3) for subtopics',
        'Add examples or data points'
      ]
    });
  }

  return {
    topic,
    totalWordCount: wordCount,
    structure: {
      introduction: {
        suggestedWordCount: introWords,
        elements: ['Hook', 'Problem statement', 'What this article covers', 'Target keyword introduction']
      },
      body: sections,
      conclusion: {
        suggestedWordCount: conclusionWords,
        elements: ['Summary', 'Key takeaways (bullet points)', 'Call to action']
      }
    },
    seoTips: [
      `Primary keyword: "${topic}" — use in H1, first paragraph, and 2-3 H2s`,
      'Meta description: 150-160 characters including the keyword',
      'URL slug: use hyphens, keep under 60 chars',
      'Add 3-5 internal links to related content',
      'Include 1-2 external links to authoritative sources',
      'Optimize images with alt text containing the keyword'
    ],
    recommendedHeadings: [
      `# ${topic}: Complete Guide`,
      '## What Is [Topic]?',
      '## Why [Topic] Matters',
      '## How to Get Started with [Topic]',
      '## Best Practices and Tips',
      '## Common Mistakes to Avoid',
      '## Frequently Asked Questions',
      '## Conclusion'
    ]
  };
}

module.exports = { optimizeContent, generateOutline };
