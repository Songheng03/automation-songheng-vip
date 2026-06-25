# Toolbase Submission Research

## Overview

There are two primary "Toolbase" platforms relevant to AI agent/gateway submissions:

1. **toolbase-ai.com** — "The Registry for AI Agent Tools" (Open source, community-focused)
2. **gettoolbase.ai** — "Manage any MCP connector" (Commercial MCP platform)

This document focuses primarily on **toolbase-ai.com** as the open registry for publishing AI agent tools/toolkits, and also covers gettoolbase.ai.

---

## Submission Method

### Toolbase AI (toolbase-ai.com) — CLI-Based Publishing

Submissions are done entirely via a CLI tool. The workflow is:

1. **Install the CLI**: `pip install toolbase` (requires Python 3.12+)
2. **Scaffold a toolkit**: `toolbase init my-toolkit`
3. **Define tools**: Write Python functions using the `@define_tool` decorator from the Orchestral AI library
4. **Export tools**: List them in `tools/__init__.py` with `__all__`
5. **Fill in metadata**: Edit `toolkit.yaml` with name, version, category, description, etc.
6. **Validate**: `toolbase validate` — checks for structural correctness
7. **Authenticate**: `toolbase login` (browser-based OAuth flow, or `--token` for non-interactive)
8. **Publish**: `toolbase publish` — packages into a tarball, uploads, and registers the version

The toolkit goes through **manual review** before appearing on the public registry.

### Gettoolbase AI (gettoolbase.ai) — Managed MCP Platform

This is a commercial SaaS platform for managing MCP connectors. It offers a desktop app and web interface. Submission is likely via their web dashboard after signing up for an account (requires authentication via Clerk). The exact submission API is not publicly documented.

---

## API Details

### Toolbase AI

- **Registry**: `https://toolbase-ai.com`
- **CLI Package**: `pip install toolbase` (PyPI package)
- **API Endpoints**: Available through the CLI tool (not publicly documented REST API)
- **MCP Protocol**: Toolkits are served via MCP (Model Context Protocol) — `toolbase serve` starts an MCP server
- **Python SDK**: `from toolbase import load_toolkit` for direct integration
- **Authentication**: OAuth browser flow via CLI; token-based auth for CI/agents
- **Versioning**: Semantic versioning (X.Y.Z); versions cannot be re-uploaded after publish

### Gettoolbase AI

- **Website**: `https://gettoolbase.ai`
- **Auth**: Clerk-powered authentication (session tokens)
- **Analytics**: Fathom Analytics
- **Pricing**: Listed as free (USD $0) per schema.org metadata
- **Stack**: React (Remix), Mantine UI, tRPC

---

## Web Form Details

### Toolbase AI

There is **no web form** for submitting toolkits. All publishing is done through the command-line interface (CLI):

- `toolbase init` — scaffold a new toolkit
- `toolbase login` — authenticate
- `toolbase publish` — submit to registry

The web interface at [toolbase-ai.com/browse](https://toolbase-ai.com/browse) allows browsing existing toolkits, but submissions are CLI-only.

### Gettoolbase AI

The web interface at [gettoolbase.ai](https://gettoolbase.ai) appears to have a "Get Started" flow for signing up and connecting MCP connectors. A web dashboard is likely used for managing connectors, but exact submission form details are behind authentication.

---

## Account Requirements

### Toolbase AI

- **Account**: Required for publishing (via `toolbase login`)
- **Auth Method**: OAuth browser flow (GitHub-based or similar) or CLI token for non-interactive mode
- **Token**: Per-user token works across all owned/collaborated toolkits
- **Collaboration**: Multiple users can collaborate on the same toolkit
- **CI Support**: Non-interactive token mode available (`toolbase login --token <token>`)
- **Contact**: `toolbase.dev@gmail.com` for support
- **License**: Open source (MIT-style based on toolkit.yaml template)

### Gettoolbase AI

- **Account**: Required (Clerk authentication)
- **Sign-up**: Via the "Get Started" button on the homepage
- **Pricing**: Currently listed as free

---

## Notes

### Toolbase AI — Key Details

- **Toolkit Structure**: A directory with `toolkit.yaml`, `tools/`, `skills/`, `requirements.txt`, `README.md`, and optionally `setup.py`
- **Categories**: astro, hep, quantum, neutrino, bio, chem, materials, utils, other
- **Environment Isolation**: Toolkits run in isolated virtualenv, conda, or Docker environments
- **Agent Compatibility**: Works with Claude Code, Codex, custom agents (Orchestral AI)
- **Review Process**: Manual review before public listing (1-2 days for first review)
- **Scaffolding with AI**: A feature exists to scaffold toolkits using coding agents (Claude Code, Codex, Cursor) — 15-30 minutes, mostly hands-off
- **MCP Support**: Toolkits are served via MCP protocol; can be configured for Claude Code automatically (`toolbase configure claude-code`)
- **Open Source**: GitHub repo at `github.com/Toolbase-AI/toolbase` (desktop app) and `github.com/toolbase/toolbase` (CLI)
- **Contact**: Open issues on GitHub or email `toolbase.dev@gmail.com`
- **Skills**: Optional markdown files in `skills/` directory that teach AI agents how to use tools

### Gettoolbase AI — Key Details

- **Focus**: Enterprise MCP connector management
- **Integration**: Connects MCP connectors to Claude, ChatGPT, OpenAI, Anthropic, and other AI platforms
- **Customers**: Includes companies like Feathr, JetBrains, Michelin, Shopee, Chainguard, MyAnimeList, Clerk
- **Desktop App**: Available for local management of MCP connectors
- **VS Code & Cursor**: Listed as integrations

### What This Means for Submitting an AI Agent/Gateway

To submit an AI agent or gateway (like the one on port 8080) to Toolbase:

1. The **Toolbase AI** (toolbase-ai.com) registry is the appropriate platform for open-source AI agent tools
2. Create a Python-based toolkit wrapping the agent's functionality using `@define_tool` decorators
3. Publish via the CLI pipeline (`toolbase init` → define tools → `toolbase publish`)
4. The toolkit will undergo manual review before appearing publicly
5. Alternatively, **Gettoolbase AI** could be used if the agent exposes MCP connectors that need enterprise management
