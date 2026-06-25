# Poe.com Bot Creation Manual

> **Generated**: 2026-06-17
> **Purpose**: Step-by-step guide to create and deploy a bot on Poe.com
> **Prerequisites**: Poe account, API access, hosted bot server

---

## 1. Overview

Poe.com (by Quora) is an AI chat platform that allows users to create custom bots. Bots are created via the **Poe API protocol** using the `fastapi-poe` Python library.

**URL**: https://poe.com  
**Developer Portal**: https://developer.poe.com  
**GitHub**: https://github.com/poe-platform

---

## 2. Prerequisites

1. **Poe Account** — Sign up at https://poe.com
2. **Poe API Token** — Obtained from the developer dashboard after logging in
3. **Bot Server** — A publicly accessible HTTP server implementing the Poe API protocol
4. **Python 3.8+** — For running the `fastapi-poe` library

---

## 3. Getting a Poe API Key

1. Go to https://poe.com and create an account or log in
2. Navigate to https://developer.poe.com (developer portal)
3. Go to the API Keys / Bot Tokens section
4. Generate a new bot access key/token
5. Save the token securely — it is used to authenticate your bot server with Poe

> **Note**: The developer docs are behind Cloudflare protection and require a browser to access.

---

## 4. Setting Up the Bot Server

### 4.1 Install fastapi-poe

```bash
pip install fastapi-poe fastapi uvicorn
```

### 4.2 Basic Bot Server Example

Create a file `bot_server.py`:

```python
from fastapi_poe import make_app
from fastapi_poe.types import QueryRequest, PartialResponse
from fastapi_poe.poe import POEBot
from typing import AsyncIterable
import uvicorn

class MyBot(POEBot):
    async def get_response(self, request: QueryRequest) -> AsyncIterable[PartialResponse]:
        """Process incoming messages and return bot responses."""
        # Access the user's message via request.query[-1].content
        user_message = request.query[-1].content
        
        # Your bot logic here — call an LLM, process data, etc.
        response_text = f"You said: {user_message}"
        
        yield PartialResponse(text=response_text)
    
    async def get_settings(self, request):
        """Return bot settings/metadata."""
        return {
            "enable_image_comprehension": False,
            "allow_attachments": False,
            "introduction_message": "Hello! I am a custom Poe bot.",
        }

# Initialize the bot with your access key
bot = MyBot()
app = make_app(bot, access_key="YOUR_BOT_ACCESS_KEY_HERE")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

### 4.3 Required Endpoints

The Poe API protocol requires the following endpoints (all handled automatically by `fastapi-poe`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_settings` | POST | Returns bot metadata and capabilities |
| `/get_response` | POST | Main endpoint — streams bot responses via SSE |
| `/on_error` | POST | Called when errors occur (optional) |
| `/on_feedback` | POST | Receives user feedback (optional) |

---

## 5. Deploying the Bot Server

You need a publicly accessible URL. Options include:

### Option A: Modal (Serverless)
```python
from modal import App, asgi_app

modal_app = App("my-poe-bot")

@modal_app.function()
@asgi_app()
def fastapi_app():
    return app
```

Deploy with: `modal deploy bot_server.py`

### Option B: Cloud Run / Fly.io / Railway
- Dockerize your bot server
- Deploy to any hosting platform that provides a public URL
- Ensure the server listens on port 8080

### Option C: VPS / Dedicated Server
- Run with `uvicorn` or `gunicorn`
- Use a reverse proxy (Nginx, Caddy) with HTTPS
- Port 8080 is recommended

---

## 6. Registering the Bot on Poe

1. Log in to https://poe.com
2. Go to the developer dashboard at https://developer.poe.com
3. Click **"Create Bot"**
4. Fill in the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| **Bot Name** | Display name for your bot | Yes |
| **Handle** | Unique identifier (e.g., @my-bot) | Yes |
| **Description** | Short description of what the bot does | Yes |
| **Server URL** | Public URL of your bot server (e.g., https://example.com) | Yes |
| **Access Key** | The same access key used in your bot server code | Yes |
| **Base Prompt** | System prompt / instructions for the bot | Optional |
| **Avatar** | Profile picture for the bot | Optional |

5. Click **Submit/Create**
6. Test your bot on Poe.com by searching for its handle

---

## 7. Testing & Debugging

### Local Testing
Use ngrok to expose your local server:
```bash
ngrok http 8080
```
Use the ngrok URL as your Server URL during development.

### Checking Server Health
Poe occasionally pings your server. Ensure:
- The server responds within reasonable timeouts
- HTTPS is configured correctly
- The access key matches what's registered on Poe

### Common Issues
- **401 Unauthorized**: Access key mismatch between server and Poe dashboard
- **Timeout**: Bot server takes too long to respond; keep initial responses fast
- **SSE Errors**: Ensure proper streaming implementation
- **CORS**: Not typically needed since Poe servers call your endpoint directly

---

## 8. Advanced Features

### 8.1 Serverless MCP Bot
Poe supports MCP (Model Context Protocol) bot types for more advanced integrations.

### 8.2 Monetization
Bot creators can earn money through Poe's **creator program**:
- Bots that get user engagement generate revenue
- Payouts are processed periodically
- Requires linking a payment method

### 8.3 Multi-Model Support
Bots can leverage different backend models (Claude, GPT-4, etc.) or use custom LLMs.

---

## 9. API Reference

### Protocol Overview
- **Transport**: HTTPS with SSE (Server-Sent Events) for streaming
- **Authentication**: Access key sent in request headers
- **Format**: JSON request/response bodies

### Request Structure (get_response)
```json
{
  "query": [
    {
      "role": "user",
      "content": "Hello bot!",
      "content_type": "text/plain",
      "timestamp": 1234567890
    }
  ],
  "version": "1.0",
  "user_id": "abc123",
  "access_key": "your-bot-access-key"
}
```

### Response Structure (SSE stream)
```
data: {"text": "Hello! How can I help you?", "content_type": "text/plain"}

data: {"text": " Let me think...", "content_type": "text/plain", "is_partial": true}

data: {"text": "\n\nHere is my full answer.", "content_type": "text/plain"}
```

---

## 10. Troubleshooting Checklist

- [ ] Poe account created and verified
- [ ] API token/access key generated from developer dashboard
- [ ] `fastapi-poe` library installed on server
- [ ] Bot server code written with correct access key
- [ ] Server deployed on a publicly accessible URL with HTTPS
- [ ] Bot registered on Poe with matching server URL and access key
- [ ] Firewall allows incoming connections on the server port
- [ ] Server logs checked for errors during Poe's test pings

---

## Appendix: Quick Start Snippet

```bash
# Install dependencies
pip install fastapi-poe fastapi uvicorn

# Create and run the bot (Paste your actual token)
cat > poe_bot.py << 'EOF'
from fastapi_poe import make_app
from fastapi_poe.types import QueryRequest, PartialResponse
from fastapi_poe.poe import POEBot
from typing import AsyncIterable
import uvicorn

class EchoBot(POEBot):
    async def get_response(self, request: QueryRequest) -> AsyncIterable[PartialResponse]:
        user_msg = request.query[-1].content
        yield PartialResponse(text=f"Echo: {user_msg}")

app = make_app(EchoBot(), access_key="YOUR_ACCESS_KEY")
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOF

# Run the server
python poe_bot.py
```

---

*This manual covers the essential steps to create, deploy, and register a bot on Poe.com. For the most up-to-date information, refer to the official Poe developer documentation at https://developer.poe.com.*
