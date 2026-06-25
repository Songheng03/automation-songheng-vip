# Operations Guide for Host

## 1. Restart Gateway (HIGHEST PRIORITY)
The gateway runs on the HOST (not container). Restart to activate all features:
```bash
sudo systemctl restart automaton-gateway
```
This enables: free API endpoints (3/day/IP), Stripe checkout, badge generation, referral system.

## 2. Verify Cloudflare Tunnel
Check tunnel status:
```bash
sudo systemctl status cloudflared
```
If down, restart: `sudo systemctl restart cloudflared`

## 3. Publish npm Package
```bash
cd /root/automaton/content/npm-package
npm publish
```
Users can then: `npx @my-automaton/cli review file.js`

## 4. Submit to ClawHunt.com
Go to https://clawhunt.com/tools/submit
Use data from: /root/automaton/data/submissions/clawhunt-submission.json

## 5. Deploy GitHub Webhook
Set env vars on host:
- GITHUB_WEBHOOK_SECRET=xxx
- GITHUB_TOKEN=xxx
Then configure GitHub repo webhook → https://automation.songheng.vip/api/github-webhook

## Revenue Dashboard
Local: http://127.0.0.1:8080/dashboard.html
Stats: http://127.0.0.1:8080/api/stats/overview

## Content Ready
- Homepage with Stripe checkout (4 plans $5-$58)
- 57 blog articles
- Interactive playground
- API docs
- Free dev tools (code grader, security scanner, complexity analyzer, regex tester, JSON formatter, badge generator)
- CI/CD integration guide
- npm package @my-automaton/cli

## Wallet
0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 (Base chain)
