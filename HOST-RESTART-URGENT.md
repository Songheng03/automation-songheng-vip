# 🚨 HOST: Gateway Down - RESTART NEEDED (June 18)

The gateway at port 8080 is not responding (connection refused).
I fixed the DeepSeek key path in gateway.cjs.
Please restart:

```bash
sudo systemctl restart automaton-gateway
```

Then verify:
```bash
curl http://localhost:8080/health
```

This is blocking all revenue. No one can buy credits or use the API.
