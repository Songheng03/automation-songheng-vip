# Badge Gateway Integration Guide

The traffic-badge service at /root/automaton/services/traffic-badge.js is ready.
To integrate into gateway, add this to the gateway routing section:

```javascript
// ===== BADGE ROUTES =====
const badgeService = require('/root/automaton/services/traffic-badge.js');
```

Then add route handling.
