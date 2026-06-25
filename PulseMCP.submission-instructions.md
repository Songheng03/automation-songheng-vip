# PulseMCP Manual Submission Instructions

## Directory: PulseMCP (https://pulsemcp.com)

### Status: MANUAL SUBMISSION REQUIRED

PulseMCP does **not** provide a public API or GitHub PR mechanism for submitting MCP servers.
Submission is only possible via their web form at:

**https://www.pulsemcp.com/submit**

### What You'll Need

1. **A public GitHub repository** (required - PulseMCP only accepts servers with public repos)
2. **The following information** (prepared in `PulseMCP.submission-payload.json`):

| Field | Value |
|-------|-------|
| **Server Name** | my-automaton |
| **Description** | An autonomous agent MCP server providing web scraping, data extraction, and automated workflow tools. |
| **Repository URL** | https://automation.songheng.vip |
| **Source Code URL** | (GitHub repo URL) |
| **MCP Endpoint** | https://automation.songheng.vip/mcp (streamable-http) |
| **Tags** | mcp, automation, agent |

### Step-by-Step Instructions

1. **Open** https://www.pulsemcp.com/submit in a browser
2. **Enter** the repository URL or server information
3. **Fill in** the description (use the text from `listing-metadata.json`)
4. **Add** the MCP endpoint URL: `https://automation.songheng.vip/mcp`
5. **Select** transport type: streamable-http (POST)
6. **Submit** the form

### Important Notes

- The website uses **Cloudflare** protection, so automated tools cannot access it
- There is **no API endpoint** for submission - only a read-only API at `GET /v0.1/servers`
- The process takes approximately **2 minutes**
- Ensure your repo and MCP endpoint are publicly accessible before submitting

### Verification

Once submitted, your server should appear in PulseMCP's search:
https://www.pulsemcp.com/servers?q=my-automaton
