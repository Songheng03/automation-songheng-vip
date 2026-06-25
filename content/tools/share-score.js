/**
 * Share Score Widget - Generate shareable code review score cards
 * Users can share their AI code review results on social media
 */

class ShareScoreWidget {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.options = {
      brandColor: '#3a3aff',
      bgColor: '#0a0a1a',
      textColor: '#e0e0ff',
      ...options
    };
  }

  /**
   * Generate a shareable score card
   * @param {Object} result - Code review result
   * @param {number} result.score - Score 0-100
   * @param {string} result.language - Programming language
   * @param {number} result.issues - Number of issues found
   * @param {string} result.verdict - Overall verdict
   */
  generateScoreCard(result) {
    const { score, language = 'Code', issues = 0, verdict } = result;
    
    const card = document.createElement('div');
    card.className = 'score-card';
    card.innerHTML = `
      <div class="score-card-inner" style="
        background: ${this.options.bgColor};
        border: 2px solid ${this.options.brandColor};
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="color: ${this.options.textColor}; margin: 0; font-size: 18px;">
            AI Code Review
          </h3>
          <span style="
            background: ${score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          ">
            ${score}/100
          </span>
        </div>
        
        <div style="
          background: ${this.options.bgColor};
          border: 1px solid ${this.options.brandColor}40;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        ">
          <div style="color: ${this.options.textColor}; font-size: 14px; margin-bottom: 8px;">
            <strong>${language}</strong> • ${issues} issue${issues !== 1 ? 's' : ''} found
          </div>
          <div style="color: ${this.options.textColor}cc; font-size: 13px;">
            ${verdict || this.getVerdict(score)}
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${this.getShareButtons(score, language)}
        </div>

        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid ${this.options.brandColor}20;
          text-align: center;
          font-size: 12px;
          color: ${this.options.textColor}80;
        ">
          Powered by <a href="https://automation.songheng.vip" style="color: ${this.options.brandColor}; text-decoration: none;">
            my-automaton
          </a>
        </div>
      </div>
    `;

    this.container.appendChild(card);
    return card;
  }

  getVerdict(score) {
    if (score >= 90) return 'Excellent! Clean, well-structured code.';
    if (score >= 70) return 'Good code with minor improvements possible.';
    if (score >= 50) return 'Decent code, but some issues need attention.';
    if (score >= 30) return 'Needs work - several issues detected.';
    return 'Critical issues found - major refactoring recommended.';
  }

  getShareButtons(score, language) {
    const text = encodeURIComponent(
      `I just got my ${language} reviewed by AI! Score: ${score}/100 🤖\n\n` +
      `Free AI code review at:`
    );
    const url = encodeURIComponent('https://automation.songheng.vip/tools/ai-code-reviewer.html');

    return `
      <a href="https://twitter.com/intent/tweet?text=${text}&url=${url}" 
         target="_blank" rel="noopener"
         style="
           flex: 1;
           min-width: 120px;
           background: #1DA1F2;
           color: white;
           padding: 10px 16px;
           border-radius: 6px;
           text-decoration: none;
           font-size: 14px;
           font-weight: 600;
           text-align: center;
           transition: opacity 0.2s;
         "
         onmouseover="this.style.opacity='0.9'"
         onmouseout="this.style.opacity='1'"
      >
        🐦 Share on Twitter
      </a>
      
      <a href="https://www.reddit.com/submit?url=${url}&title=${text}" 
         target="_blank" rel="noopener"
         style="
           flex: 1;
           min-width: 120px;
           background: #FF4500;
           color: white;
           padding: 10px 16px;
           border-radius: 6px;
           text-decoration: none;
           font-size: 14px;
           font-weight: 600;
           text-align: center;
           transition: opacity 0.2s;
         "
         onmouseover="this.style.opacity='0.9'"
         onmouseout="this.style.opacity='1'"
      >
        📢 Share on Reddit
      </a>

      <button onclick="navigator.clipboard.writeText('I just got my ${language} reviewed by AI! Score: ${score}/100 🤖\\n\\nFree AI code review: https://automation.songheng.vip/tools/ai-code-reviewer.html'); this.textContent='✓ Copied!'; setTimeout(() => this.textContent='📋 Copy Link', 2000);"
         style="
           flex: 1;
           min-width: 120px;
           background: ${this.options.brandColor};
           color: white;
           padding: 10px 16px;
           border-radius: 6px;
           border: none;
           font-size: 14px;
           font-weight: 600;
           cursor: pointer;
           transition: opacity 0.2s;
         "
         onmouseover="this.style.opacity='0.9'"
         onmouseout="this.style.opacity='1'"
      >
        📋 Copy Link
      </button>
    `;
  }

  /**
   * Generate a canvas-based score image for sharing
   */
  async generateScoreImage(result) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;

    const { score, language = 'Code', issues = 0 } = result;

    // Background
    ctx.fillStyle = this.options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = this.options.brandColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Title
    ctx.fillStyle = this.options.textColor;
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.fillText('AI Code Review', 40, 60);

    // Score circle
    const centerX = 400;
    const centerY = 200;
    const radius = 80;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Score text
    ctx.fillStyle = this.options.textColor;
    ctx.font = 'bold 48px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), centerX, centerY + 15);

    // Language and issues
    ctx.font = '24px -apple-system, sans-serif';
    ctx.fillText(`${language} • ${issues} issues`, centerX, 320);

    // Branding
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = this.options.textColor + '80';
    ctx.fillText('automation.songheng.vip', centerX, 370);

    return canvas.toDataURL('image/png');
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShareScoreWidget;
}
if (typeof window !== 'undefined') {
  window.ShareScoreWidget = ShareScoreWidget;
}
