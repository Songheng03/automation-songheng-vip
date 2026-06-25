// Conversion Tracker - Tracks user journey from free tools to API purchases
// Increases revenue by identifying which tools drive the most conversions

(function() {
  'use strict';
  
  const STORAGE_KEY = 'ma_conversion_data';
  const SESSION_KEY = 'ma_session_id';
  
  // Generate unique session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }
  
  // Get or create conversion data
  function getConversionData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {
        sessionId: getSessionId(),
        toolUsage: {},
        ctaClicks: {},
        funnelSteps: {},
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        visits: 1
      };
    } catch (e) {
      return {
        sessionId: getSessionId(),
        toolUsage: {},
        ctaClicks: {},
        funnelSteps: {},
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        visits: 1
      };
    }
  }
  
  // Save conversion data
  function saveConversionData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Conversion tracker: localStorage unavailable');
    }
  }
  
  // Track tool usage
  function trackToolUsage(toolName, action) {
    const data = getConversionData();
    if (!data.toolUsage[toolName]) {
      data.toolUsage[toolName] = {
        uses: 0,
        firstUse: Date.now(),
        actions: {}
      };
    }
    data.toolUsage[toolName].uses++;
    data.toolUsage[toolName].lastUse = Date.now();
    if (action) {
      data.toolUsage[toolName].actions[action] = (data.toolUsage[toolName].actions[action] || 0) + 1;
    }
    data.lastVisit = Date.now();
    saveConversionData(data);
    
    // Send to analytics endpoint
    sendEvent('tool_usage', { tool: toolName, action: action, uses: data.toolUsage[toolName].uses });
  }
  
  // Track CTA clicks (conversion buttons)
  function trackCTAClick(ctaId, ctaText, source) {
    const data = getConversionData();
    if (!data.ctaClicks[ctaId]) {
      data.ctaClicks[ctaId] = {
        clicks: 0,
        firstClick: Date.now(),
        sources: {}
      };
    }
    data.ctaClicks[ctaId].clicks++;
    data.ctaClicks[ctaId].lastClick = Date.now();
    data.ctaClicks[ctaId].sources[source || 'unknown'] = (data.ctaClicks[ctaId].sources[source || 'unknown'] || 0) + 1;
    
    // Track funnel progression
    data.funnelSteps[ctaId] = {
      reached: true,
      converted: true,
      timestamp: Date.now()
    };
    
    saveConversionData(data);
    sendEvent('cta_click', { ctaId, ctaText, source, totalClicks: data.ctaClicks[ctaId].clicks });
  }
  
  // Track funnel step (reached but not necessarily converted)
  function trackFunnelStep(stepId, metadata) {
    const data = getConversionData();
    if (!data.funnelSteps[stepId]) {
      data.funnelSteps[stepId] = {
        reached: false,
        converted: false
      };
    }
    data.funnelSteps[stepId].reached = true;
    data.funnelSteps[stepId].timestamp = Date.now();
    if (metadata) {
      data.funnelSteps[stepId].metadata = metadata;
    }
    saveConversionData(data);
    sendEvent('funnel_step', { stepId, ...metadata });
  }
  
  // Track page visit
  function trackPageVisit(pagePath) {
    const data = getConversionData();
    data.lastVisit = Date.now();
    data.visits++;
    if (!data.pages) data.pages = {};
    data.pages[pagePath] = (data.pages[pagePath] || 0) + 1;
    saveConversionData(data);
    sendEvent('page_visit', { path: pagePath, visitCount: data.visits });
  }
  
  // Send event to server (fire-and-forget)
  function sendEvent(eventType, eventData) {
    try {
      const payload = {
        type: eventType,
        sessionId: getSessionId(),
        timestamp: Date.now(),
        data: eventData,
        url: window.location.href,
        referrer: document.referrer
      };
      
      // Use sendBeacon for reliability (works even if page unloads)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/event', blob);
      } else {
        // Fallback to fetch
        fetch('/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch (e) {
      // Silently fail - don't break user experience
    }
  }
  
  // Smart CTA: Show different CTAs based on user behavior
  function getSmartCTA() {
    const data = getConversionData();
    const totalToolUses = Object.values(data.toolUsage).reduce((sum, tool) => sum + tool.uses, 0);
    
    // New user (0-2 tool uses) - Show free trial CTA
    if (totalToolUses <= 2) {
      return {
        text: 'Try AI Code Review - 3 Free Requests',
        href: '/api-playground.html',
        class: 'cta-primary cta-free-trial',
        priority: 'high'
      };
    }
    
    // Engaged user (3-10 tool uses) - Show value proposition
    if (totalToolUses <= 10) {
      return {
        text: 'Get Professional AI Code Reviews - $0.05 Each',
        href: '/pricing.html',
        class: 'cta-primary cta-value',
        priority: 'high'
      };
    }
    
    // Power user (10+ tool uses) - Show bulk discount
    return {
      text: 'Get 3000 API Credits for $25 (Save 37%)',
      href: '/pricing.html#professional',
      class: 'cta-primary cta-bulk',
      priority: 'high'
    };
  }
  
  // Auto-inject smart CTAs into pages
  function injectSmartCTAs() {
    const cta = getSmartCTA();
    const containers = document.querySelectorAll('.smart-cta-container');
    
    containers.forEach(container => {
      const existingCTA = container.querySelector('.smart-cta');
      if (existingCTA) return; // Already injected
      
      const ctaElement = document.createElement('a');
      ctaElement.href = cta.href;
      ctaElement.className = `smart-cta ${cta.class}`;
      ctaElement.textContent = cta.text;
      ctaElement.setAttribute('data-cta-id', cta.text.toLowerCase().replace(/\s+/g, '-'));
      
      ctaElement.addEventListener('click', (e) => {
        trackCTAClick(cta.text, cta.text, window.location.pathname);
      });
      
      container.appendChild(ctaElement);
    });
  }
  
  // Auto-track tool usage on pages with specific patterns
  function autoTrackTools() {
    const path = window.location.pathname;
    
    // Code quality tools
    if (path.includes('code-quality-score')) {
      trackFunnelStep('tool_code_quality', { tool: 'code-quality-score' });
    } else if (path.includes('code-smell-score')) {
      trackFunnelStep('tool_code_smell', { tool: 'code-smell-score' });
    } else if (path.includes('seo-audit')) {
      trackFunnelStep('tool_seo_audit', { tool: 'seo-audit' });
    }
    
    // Pricing page (high intent)
    if (path.includes('pricing')) {
      trackFunnelStep('pricing_page', { source: document.referrer });
    }
    
    // API playground (trial intent)
    if (path.includes('api-playground')) {
      trackFunnelStep('api_playground', { source: document.referrer });
    }
  }
  
  // Track form submissions and actions
  function trackUserActions() {
    // Track "Analyze Code" button clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Code analysis buttons
      if (target.matches('button[type="submit"]') || target.matches('.analyze-btn')) {
        const toolName = window.location.pathname.split('/').pop().replace('.html', '');
        trackToolUsage(toolName, 'analyze');
      }
      
      // Share buttons (viral tracking)
      if (target.matches('.share-btn')) {
        const platform = target.classList.contains('share-twitter') ? 'twitter' :
                        target.classList.contains('share-linkedin') ? 'linkedin' :
                        target.classList.contains('share-reddit') ? 'reddit' : 'other';
        sendEvent('social_share', { platform, page: window.location.pathname });
      }
    });
    
    // Track time on page (engagement metric)
    let timeOnPage = 0;
    const timeTracker = setInterval(() => {
      timeOnPage += 10;
      if (timeOnPage === 30) {
        sendEvent('engagement', { type: '30_seconds', page: window.location.pathname });
      } else if (timeOnPage === 60) {
        sendEvent('engagement', { type: '1_minute', page: window.location.pathname });
      } else if (timeOnPage === 180) {
        sendEvent('engagement', { type: '3_minutes', page: window.location.pathname });
        clearInterval(timeTracker);
      }
    }, 10000);
  }
  
  // Initialize on page load
  function init() {
    const path = window.location.pathname;
    
    // Track page visit
    trackPageVisit(path);
    
    // Auto-track tools
    autoTrackTools();
    
    // Inject smart CTAs
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectSmartCTAs();
        trackUserActions();
      });
    } else {
      injectSmartCTAs();
      trackUserActions();
    }
  }
  
  // Export for manual tracking
  window.ConversionTracker = {
    trackToolUsage,
    trackCTAClick,
    trackFunnelStep,
    trackPageVisit,
    getSmartCTA,
    getData: getConversionData
  };
  
  // Auto-init
  init();
})();
