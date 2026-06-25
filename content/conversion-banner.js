// Conversion Banner - Appears after user engages with free tools
// Converts free tool users into paying API customers

(function() {
  'use strict';

  // Don't show if already shown or if user has API key
  if (localStorage.getItem('conversion_banner_shown') || 
      document.cookie.includes('has_api_key=true')) {
    return;
  }

  // Track user engagement
  let engagementScore = 0;
  let hasInteracted = false;

  function incrementEngagement() {
    if (!hasInteracted) {
      hasInteracted = true;
      engagementScore++;
    }
    engagementScore += 0.5;
    
    // Show banner after moderate engagement (not too early, not too late)
    if (engagementScore >= 2 && engagementScore <= 5) {
      showBanner();
    }
  }

  function showBanner() {
    if (document.getElementById('conversion-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'conversion-banner';
    banner.innerHTML = `
      <style>
        #conversion-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-top: 2px solid #38bdf8;
          padding: 1rem 1.5rem;
          z-index: 9998;
          box-shadow: 0 -4px 20px rgba(56, 189, 248, 0.2);
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        #conversion-banner .banner-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        #conversion-banner .banner-text {
          flex: 1;
          min-width: 300px;
        }
        #conversion-banner .banner-text h3 {
          color: #fff;
          font-size: 1.1rem;
          margin: 0 0 0.25rem 0;
          font-weight: 700;
        }
        #conversion-banner .banner-text p {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0;
        }
        #conversion-banner .banner-cta {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        #conversion-banner .btn-upgrade {
          background: linear-gradient(135deg, #38bdf8, #0ea5e9);
          color: #0f172a;
          padding: 0.65rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
        }
        #conversion-banner .btn-upgrade:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(56, 189, 248, 0.4);
        }
        #conversion-banner .btn-secondary {
          background: transparent;
          color: #94a3b8;
          padding: 0.65rem 1.25rem;
          border: 1px solid #334155;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.15s;
        }
        #conversion-banner .btn-secondary:hover {
          border-color: #38bdf8;
          color: #38bdf8;
        }
        #conversion-banner .btn-close {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          line-height: 1;
          transition: color 0.15s;
        }
        #conversion-banner .btn-close:hover {
          color: #f87171;
        }
        #conversion-banner .price-badge {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
        @media (max-width: 768px) {
          #conversion-banner {
            padding: 1rem;
          }
          #conversion-banner .banner-content {
            flex-direction: column;
            align-items: flex-start;
          }
          #conversion-banner .banner-text {
            min-width: auto;
          }
          #conversion-banner .banner-cta {
            width: 100%;
            justify-content: flex-start;
          }
        }
      </style>
      <div class="banner-content">
        <div class="banner-text">
          <h3>🚀 Loving this free tool? Unlock AI-powered automation</h3>
          <p>Get code review, security scanning, and text analysis via API. Pay-per-use, no subscription.</p>
        </div>
        <div class="banner-cta">
          <span class="price-badge">From $5</span>
          <a href="/pricing.html" class="btn-upgrade">View Pricing →</a>
          <a href="/api-playground.html" class="btn-secondary">Try Free API</a>
          <button class="btn-close" onclick="closeConversionBanner()" aria-label="Close">×</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    
    // Mark as shown
    localStorage.setItem('conversion_banner_shown', 'true');
    
    // Track impression
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion_banner_shown');
    }
  }

  // Close banner function
  window.closeConversionBanner = function() {
    const banner = document.getElementById('conversion-banner');
    if (banner) {
      banner.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
  };

  // Add slide down animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
  `;
  document.head.appendChild(style);

  // Listen for engagement signals
  document.addEventListener('click', function(e) {
    // User clicked a button (format, minify, validate, etc.)
    if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('btn-close')) {
      incrementEngagement();
    }
  });

  // User pasted/copied text
  document.addEventListener('paste', incrementEngagement);
  document.addEventListener('copy', incrementEngagement);

  // User scrolled significantly
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (window.scrollY > 300) {
        incrementEngagement();
      }
    }, 500);
  });

  // Time-based trigger (after 30 seconds of engagement)
  setTimeout(() => {
    if (hasInteracted && engagementScore < 2) {
      engagementScore = 2;
      showBanner();
    }
  }, 30000);

})();
