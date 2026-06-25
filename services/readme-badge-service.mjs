#!/usr/bin/env node
/**
 * README Badge Service — GitHub integration for my-automaton
 * Embeddable SVG badges for GitHub README files
 * Generates backlinks from developer projects
 * 
 * Imported into gateway via express app
 */

const BADGES = {
  'powered-by': {
    label: 'powered by',
    message: 'my-automaton',
    labelColor: '334155',
    color: '6366f1',
    link: 'https://automation.songheng.vip'
  },
  'ai-services': {
    label: 'AI services',
    message: 'code review • security',
    labelColor: '334155',
    color: '3b82f6',
    link: 'https://automation.songheng.vip/api/catalog'
  },
  'code-review': {
    label: 'code review',
    message: 'AI powered',
    labelColor: '334155',
    color: '22c55e',
    link: 'https://automation.songheng.vip/v1/review'
  },
  'security': {
    label: 'security scan',
    message: 'vulnerability check',
    labelColor: '334155',
    color: 'ef4444',
    link: 'https://automation.songheng.vip/v1/security'
  },
  'status-online': {
    label: 'status',
    message: '✓ online',
    labelColor: '334155',
    color: '22c55e',
    link: 'https://automation.songheng.vip/api/health'
  },
  'earn-credits': {
    label: 'earn',
    message: '20% commission',
    labelColor: '334155',
    color: 'f59e0b',
    link: 'https://automation.songheng.vip/share'
  },
  'usdc': {
    label: 'pay with',
    message: 'USDC on Base',
    labelColor: '334155',
    color: '0052ff',
    link: 'https://automation.songheng.vip/upgrade'
  },
  'free-tier': {
    label: 'free tier',
    message: '3 requests/day',
    labelColor: '334155',
    color: '22c55e',
    link: 'https://automation.songheng.vip/free/analyze'
  }
};

function generateBadge(type) {
  const b = BADGES[type];
  if (!b) return null;
  
  const w = 210;
  const h = 28;
  const lw = Math.max(65, (b.label.length * 7) + 16);
  const rw = w - lw;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${b.label}: ${b.message}">
  <rect width="${w}" height="${h}" rx="4" fill="#0f172a"/>
  <rect width="${lw}" height="${h}" rx="4" fill="#${b.labelColor}"/>
  <rect x="${lw - 4}" width="4" height="${h}" fill="#${b.labelColor}"/>
  <text x="${lw / 2}" y="18" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="monospace" font-weight="400">${b.label}</text>
  <text x="${lw + rw / 2}" y="18" text-anchor="middle" fill="#${b.color}" font-size="12" font-family="monospace" font-weight="600">${b.message}</text>
</svg>`;
}

function getMarkdown(type) {
  const url = `https://automation.songheng.vip/api/badge/${type}`;
  const link = BADGES[type]?.link || 'https://automation.songheng.vip';
  return `[![my-automaton](${url})](${link})`;
}

function getHtml(type) {
  const url = `https://automation.songheng.vip/api/badge/${type}`;
  const link = BADGES[type]?.link || 'https://automation.songheng.vip';
  return `<a href="${link}" target="_blank"><img src="${url}" alt="my-automaton badge" height="28"></a>`;
}

export { BADGES, generateBadge, getMarkdown, getHtml };
