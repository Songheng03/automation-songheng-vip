// Visitor Counter & Analytics - Shows social proof and tracks usage
(function() {
  'use strict';

  const STORAGE_KEY = 'automaton_analytics';
  
  // Initialize analytics
  function getAnalytics() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {
      totalVisits: 0,
      todayVisits: 0,
      weekVisits: 0,
      lastVisit: null,
      pages: {},
      toolsUsed: {}
    };
  }

  function saveAnalytics(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function trackVisit() {
    const analytics = getAnalytics();
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Increment counters
    analytics.totalVisits++;
    
    // Reset daily counter if new day
    if (analytics.lastVisit !== today) {
      analytics.todayVisits = 1;
      analytics.lastVisit = today;
    } else {
      analytics.todayVisits++;
    }

    // Track page
    const page = window.location.pathname;
    analytics.pages[page] = (analytics.pages[page] || 0) + 1;

    // Track tool usage
    if (page.includes('.html') && !page.includes('index.html')) {
      const toolName = page.replace('/', '').replace('.html', '');
      analytics.toolsUsed[toolName] = (analytics.toolsUsed[toolName] || 0) + 1;
    }

    saveAnalytics(analytics);
    return analytics;
  }

  function displayCounter() {
    const analytics = trackVisit();
    
    // Create counter widget
    const counter = document.createElement('div');
    counter.id = 'visitor-counter';
    counter.innerHTML = `
      <style>
        #visitor-counter {
          position: fixed;
          top: 80px;
          right: 20px;
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          color: #94a3b8;
          z-index: 9997;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          max-width: 180px;
        }
        #visitor-counter .counter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #visitor-counter .counter-label {
          font-weight: 600;
        }
        #visitor-counter .counter-value {
          color: #38bdf8;
          font-weight: 700;
          font-family: 'Fira Code', monospace;
        }
        #visitor-counter .counter-total .counter-value {
          color: #4ade80;
          font-size: 0.875rem;
        }
        #visitor-counter .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #4ade80;
          border-radius: 50%;
          margin-right: 4px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          #visitor-counter {
            top: auto;
            bottom: 80px;
            right: 10px;
            font-size: 0.7rem;
            padding: 0.5rem 0.75rem;
          }
        }
      </style>
      <div class="counter-row counter-total">
        <span class="counter-label">Total Visits</span>
        <span class="counter-value">${analytics.totalVisits.toLocaleString()}</span>
      </div>
      <div class="counter-row">
        <span class="counter-label">Today</span>
        <span class="counter-value">${analytics.todayVisits}</span>
      </div>
      <div class="counter-row">
        <span class="counter-label"><span class="live-dot"></span>Live</span>
        <span class="counter-value">Active</span>
      </div>
    `;

    document.body.appendChild(counter);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      counter.style.opacity = '0.3';
      counter.addEventListener('mouseenter', () => {
        counter.style.opacity = '1';
      });
      counter.addEventListener('mouseleave', () => {
        counter.style.opacity = '0.3';
      });
    }, 5000);
  }

  // Export for external access
  window.Analytics = {
    get: getAnalytics,
    track: trackVisit
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayCounter);
  } else {
    displayCounter();
  }
})();
