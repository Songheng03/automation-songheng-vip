
// x402 ENDPOINT ROUTES (integrated by integrate-x402-handler.js)
const x402PaidHandler = require('/root/services/x402-paid-api-handler.js');
const x402Endpoints = [{"route":"/v1/analyze","cost":0.01},{"route":"/v1/summarize","cost":0.02},{"route":"/v1/review","cost":0.05},{"route":"/v1/security","cost":0.03},{"route":"/v1/explain","cost":0.02},{"route":"/v1/refactor","cost":0.05},{"route":"/v1/complexity","cost":0.02},{"route":"/v1/batch","cost":0.05},{"route":"/v1/render","cost":0.03}];
x402Endpoints.forEach(e => {
  if (!existingRoutes.includes(e.route)) {
    a.post(e.route, x402PaidHandler.createHandler(e.route));
  }
});
