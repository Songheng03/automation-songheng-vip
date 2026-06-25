# MCP (Model Context Protocol) JSON-RPC Protocol Reference

> **Specification Version:** 2025-11-25  
> **JSON-RPC Version:** 2.0  
> **Source:** [modelcontextprotocol/specification](https://github.com/modelcontextprotocol/specification)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Transport Layer](#2-transport-layer)
3. [JSON-RPC Message Format](#3-json-rpc-message-format)
4. [Initialization Sequence](#4-initialization-sequence)
5. [Required Methods](#5-required-methods)
   - [5.1 tools/list](#51-toolslist)
   - [5.2 tools/call](#52-toolscall)
   - [5.3 ping](#53-ping)
   - [5.4 notifications/initialized](#54-notificationsinitialized)
   - [5.5 notifications/cancelled](#55-notificationscancelled)
6. [Tool Definition](#6-tool-definition)
7. [Content Types](#7-content-types)
8. [Error Codes](#8-error-codes)
9. [Capability Negotiation](#9-capability-negotiation)
10. [Pagination](#10-pagination)
11. [Complete Protocol Flow](#11-complete-protocol-flow)
12. [Complete Example](#12-complete-example)

---

## 1. Overview

The Model Context Protocol (MCP) is a standardized communication protocol between **MCP hosts** (clients, typically LLM applications) and **MCP servers** (providers of tools, resources, and prompts). It uses **JSON-RPC 2.0** as its foundational messaging protocol.

An MCP server exposes **tools** that clients can discover and invoke. The two essential methods every compliant endpoint MUST implement are:

| Method | Direction | Description |
|--------|-----------|-------------|
| `tools/list` | Client → Server | List available tools |
| `tools/call` | Client → Server | Invoke a specific tool |
| `ping` | Bidirectional | Health check (both sides can send) |
| `initialize` | Client → Server | Protocol handshake (first message) |
| `notifications/initialized` | Client → Server | Signals init complete |
| `notifications/cancelled` | Bidirectional | Cancel an in-flight request |

---

## 2. Transport Layer

MCP can operate over two transport modes:

### 2.1 Streamable HTTP Transport

- Single HTTP POST endpoint (e.g., `/` or `/mcp`)
- Content-Type: `application/json`
- Client sends JSON-RPC messages in the request body
- Server responds with JSON-RPC messages in the response body
- Supports SSE (Server-Sent Events) for streaming response notifications
- The server SHOULD respond immediately; long-running operations use task augmentation

### 2.2 STDIO Transport

- Server spawned as a subprocess
- Messages sent via stdin (newline-delimited JSON)
- Responses received via stdout
- stderr reserved for logging

---

## 3. JSON-RPC Message Format

All MCP messages are valid JSON-RPC 2.0 messages. Every message MUST include `"jsonrpc": "2.0"`.

### 3.1 Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/list",
  "params": { }
}
```

- `id`: string or number, unique per request
- `method`: string identifying the operation
- `params`: optional object

### 3.2 Notification (no response expected)

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": { }
}
```

- No `id` field — server MUST NOT respond

### 3.3 Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": { }
}
```

- `id` MUST match the request's `id`
- `result` is an object (never null/array at top level per JSON-RPC 2.0)

### 3.4 Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

- `id` MUST match the request's `id` (may be null for parse errors)
- `error.code`: integer
- `error.message`: short string
- `error.data`: optional additional info

---

## 4. Initialization Sequence

Every MCP connection MUST begin with the initialization sequence:

```
Client                              Server
  |                                   |
  |------- initialize --------------->|
  |<------ InitializeResult ----------|
  |                                   |
  |------- notifications/initialized->|
  |                                   |
  |------- tools/list --------------->|
  |<------ ListToolsResult -----------|
  |                                   |
  |------- tools/call --------------->|
  |<------ CallToolResult ------------|
```

### Step 1: Client sends `initialize`

```json
{
  "jsonrpc": "2.0",
  "id": "init-1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

### Step 2: Server responds with `InitializeResult`

```json
{
  "jsonrpc": "2.0",
  "id": "init-1",
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "tools": { "listChanged": true },
      "logging": {}
    },
    "serverInfo": {
      "name": "my-server",
      "version": "1.0.0"
    },
    "instructions": "Use this server to access files and run commands."
  }
}
```

### Step 3: Client sends `notifications/initialized`

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

After this notification, the session is fully initialized and the client may issue `tools/list` and `tools/call` requests.

---

## 5. Required Methods

### 5.1 `tools/list`

**Direction:** Client → Server  
**Purpose:** Discover all available tools exposed by the server.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": "list-1",
  "method": "tools/list",
  "params": {
    "cursor": "optional-pagination-cursor"
  }
}
```

`params` is optional. If present, it may contain:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cursor` | `string` | No | Opaque cursor for pagination. If provided, the server should return results starting after this cursor. |

#### Response (`ListToolsResult`)

```json
{
  "jsonrpc": "2.0",
  "id": "list-1",
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "inputSchema": {
          "type": "object",
          "properties": {
            "city": {
              "type": "string",
              "description": "City name"
            }
          },
          "required": ["city"]
        }
      }
    ],
    "nextCursor": "opaque-cursor-value"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tools` | `Tool[]` | Yes | Array of tool definitions |
| `nextCursor` | `string` | No | If present, there are more results available. Omit if no more pages. |
| `_meta` | `object` | No | Reserved for metadata extensions |

### 5.2 `tools/call`

**Direction:** Client → Server  
**Purpose:** Invoke a specific tool by name with provided arguments.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": "call-1",
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "London"
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | The name of the tool to invoke (must match a name from `tools/list`) |
| `arguments` | `object` | No | Arguments to pass to the tool (validated against `inputSchema`) |
| `_meta` | `object` | No | Metadata (e.g., `{ "progressToken": "tok-1" }`) |
| `task` | `TaskMetadata` | No | If present, requests task-augmented execution (long-running) |

#### Response (`CallToolResult`)

```json
{
  "jsonrpc": "2.0",
  "id": "call-1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in London: 15°C, partly cloudy"
      }
    ],
    "isError": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `ContentBlock[]` | **Yes** | Array of content items produced by the tool |
| `structuredContent` | `object` | No | Optional JSON object representing structured result data |
| `isError` | `boolean` | No | Whether the tool execution ended in an error. **Default: false** |
| `_meta` | `object` | No | Reserved for metadata extensions |

**Error Handling Rules for `tools/call`:**
- Tool-level errors (e.g., invalid input, runtime failure) MUST be reported inside the result object with `isError: true`, NOT as an MCP protocol-level error response. This allows the LLM to see the error and self-correct.
- Protocol-level errors (e.g., tool not found, server does not support tools) SHOULD be reported as JSON-RPC error responses.

### 5.3 `ping`

**Direction:** Bidirectional  
**Purpose:** Check if the peer is alive.

```json
{
  "jsonrpc": "2.0",
  "id": "ping-1",
  "method": "ping"
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": "ping-1",
  "result": {}
}
```

### 5.4 `notifications/initialized`

**Direction:** Client → Server  
**Purpose:** Signals that initialization is complete.

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

The server MUST NOT process any other requests until this notification is received.

### 5.5 `notifications/cancelled`

**Direction:** Bidirectional  
**Purpose:** Cancel a previously-issued request that is still in-flight.

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "req-001",
    "reason": "User cancelled"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | `string\|number` | No | ID of the request to cancel |
| `reason` | `string` | No | Optional reason for cancellation |

---

## 6. Tool Definition

The `Tool` interface defines a tool that the server exposes.

```json
{
  "name": "tool_name",
  "title": "Tool Display Name",
  "description": "A human-readable description of what the tool does.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Description of param1"
      },
      "param2": {
        "type": "number",
        "description": "Description of param2"
      },
      "param3": {
        "type": "boolean",
        "default": false
      }
    },
    "required": ["param1"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "result": { "type": "string" }
    }
  },
  "annotations": {
    "title": "Display Title",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": true
  },
  "execution": {
    "taskSupport": "forbidden"
  },
  "icons": [
    {
      "src": "https://example.com/icon.png",
      "mimeType": "image/png",
      "sizes": ["48x48"],
      "theme": "light"
    }
  ]
}
```

### Tool Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Programmatic identifier for the tool |
| `title` | `string` | No | Human-readable display name (preferred over `name` for UI) |
| `description` | `string` | No | Human-readable description. Used by LLMs to understand the tool. |
| `inputSchema` | `object` | **Yes** | JSON Schema object describing expected parameters. MUST have `type: "object"`. |
| `outputSchema` | `object` | No | JSON Schema describing the structure of `structuredContent` in the result. |
| `annotations` | `ToolAnnotations` | No | Hints about tool behavior (read-only, destructive, idempotent, open-world) |
| `execution` | `ToolExecution` | No | Execution properties including `taskSupport` |
| `icons` | `Icon[]` | No | Optional set of sized icons for display |
| `_meta` | `object` | No | Extension metadata |

### ToolAnnotations

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | — | A human-readable title for the tool |
| `readOnlyHint` | `boolean` | `false` | If true, the tool does not modify its environment |
| `destructiveHint` | `boolean` | `true` | If true, the tool may perform destructive updates |
| `idempotentHint` | `boolean` | `false` | If true, calling repeatedly with same args has no additional effect |
| `openWorldHint` | `boolean` | `true` | If true, the tool interacts with an open world (e.g., web search) |

### ToolExecution

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `taskSupport` | `"forbidden" \| "optional" \| "required"` | `"forbidden"` | Whether tool supports task-augmented execution for long-running operations |

### `inputSchema` Format

The `inputSchema` follows JSON Schema (draft-07 or 2020-12). At minimum:

```json
{
  "type": "object",
  "properties": {
    "<param_name>": {
      "type": "string",
      "description": "Human-readable description"
    }
  },
  "required": ["param_name"]
}
```

Common JSON Schema types supported: `string`, `number`, `integer`, `boolean`, `array`, `object`.

---

## 7. Content Types

The `content` field in `CallToolResult` is an array of content blocks. Supported types:

### 7.1 TextContent

```json
{
  "type": "text",
  "text": "Hello, world!",
  "annotations": { "audience": ["user"], "priority": 0.8 }
}
```

### 7.2 ImageContent

```json
{
  "type": "image",
  "data": "<base64-encoded-data>",
  "mimeType": "image/png"
}
```

### 7.3 AudioContent

```json
{
  "type": "audio",
  "data": "<base64-encoded-data>",
  "mimeType": "audio/wav"
}
```

### 7.4 EmbeddedResource

```json
{
  "type": "resource",
  "resource": {
    "uri": "file:///path/to/file.txt",
    "mimeType": "text/plain",
    "text": "file contents"
  }
}
```

---

## 8. Error Codes

### Standard JSON-RPC Error Codes (used by MCP)

| Code | Name | Description |
|------|------|-------------|
| `-32700` | **Parse Error** | Invalid JSON was received by the server. |
| `-32600` | **Invalid Request** | The JSON sent is not a valid Request object. |
| `-32601` | **Method Not Found** | The method does not exist / is not available. |
| `-32602` | **Invalid Params** | Invalid method parameter(s). |
| `-32603` | **Internal Error** | Internal JSON-RPC error. |

### Implementation-Specific Error Codes

| Code | Name | Description |
|------|------|-------------|
| `-32042` | **URL Elicitation Required** | Server needs additional info from client via elicitation. |

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required argument: 'city'"
    }
  }
}
```

### When to Use Protocol Errors vs. Tool Errors

| Scenario | Response Mechanism |
|----------|-------------------|
| Tool not found (`name` doesn't match any tool) | JSON-RPC error (`-32601` Method Not Found) |
| Invalid arguments (schema validation failure) | JSON-RPC error (`-32602` Invalid Params) |
| Server doesn't support tools | JSON-RPC error (`-32601` Method Not Found) |
| Tool execution fails (e.g., API error) | `CallToolResult` with `isError: true` |
| Tool returns unexpected data | `CallToolResult` with `isError: true` |

---

## 9. Capability Negotiation

During initialization, both sides declare capabilities.

### ServerCapabilities

```json
{
  "tools": { "listChanged": true },
  "resources": { "subscribe": true, "listChanged": true },
  "prompts": { "listChanged": true },
  "logging": {},
  "completions": {},
  "experimental": { "customFeature": {} },
  "tasks": {
    "list": {},
    "cancel": {},
    "requests": {
      "tools": { "call": {} }
    }
  }
}
```

### ClientCapabilities

```json
{
  "roots": { "listChanged": true },
  "sampling": {},
  "experimental": {},
  "elicitation": { "form": {}, "url": {} },
  "tasks": {
    "list": {},
    "cancel": {},
    "requests": {
      "sampling": { "createMessage": {} },
      "elicitation": { "create": {} }
    }
  }
}
```

### Feature Declaration Pattern

A capability is "present" (supported) if its key exists in the capabilities object, regardless of whether the value is `null`, `{}`, or an object with properties. If a key is absent, the feature is not supported.

---

## 10. Pagination

List operations support cursor-based pagination.

### Request with Cursor

```json
{
  "jsonrpc": "2.0",
  "id": "list-2",
  "method": "tools/list",
  "params": {
    "cursor": "cursor-from-previous-response"
  }
}
```

### Response with Next Cursor

```json
{
  "jsonrpc": "2.0",
  "id": "list-2",
  "result": {
    "tools": [ ... ],
    "nextCursor": "next-page-cursor"
  }
}
```

- If `nextCursor` is **absent** or `null`, there are no more results.
- The cursor is an **opaque string** — servers define their own format.
- If no cursor is provided, the server returns the first page.

---

## 11. Complete Protocol Flow

```
1. [Transport] Connection established (HTTP/STDIO)
2. [Client → Server] initialize
3. [Server → Client] InitializeResult (with capabilities)
4. [Client → Server] notifications/initialized
   ───────────────────────────────────────────
5. [Client → Server] tools/list (optional: ?cursor)
6. [Server → Client] ListToolsResult (with tools[])
7. [Client → Server] tools/call(name, arguments)
8. [Server → Client] CallToolResult (with content[])
   ───────────────────────────────────────────
   (Optional lifecycle)
9.  [Either]       notifications/cancelled
10. [Either]       ping → { result: {} }
11. [Server → Client] notifications/tools/list_changed (tools updated)
12. [Client → Server] tools/list (re-fetch)
```

---

## 12. Complete Example

### Initialization

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "example-client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "tools": { "listChanged": true },
      "logging": {}
    },
    "serverInfo": {
      "name": "example-server",
      "version": "1.0.0"
    },
    "instructions": "Provides weather and file-system tools."
  }
}
```

**Notification (no response expected):**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

### Listing Tools

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather for a specified city",
        "inputSchema": {
          "type": "object",
          "properties": {
            "city": {
              "type": "string",
              "description": "The name of the city"
            },
            "units": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "description": "Temperature unit"
            }
          },
          "required": ["city"]
        }
      },
      {
        "name": "read_file",
        "description": "Read contents of a file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "Absolute path to the file"
            }
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

### Calling a Tool (Success)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "Tokyo",
      "units": "celsius"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in Tokyo: 22°C, clear sky"
      }
    ],
    "isError": false
  }
}
```

### Calling a Tool (Tool-Level Error)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "NonExistentCity"
    }
  }
}
```

**Response (tool error, NOT protocol error):**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: City 'NonExistentCity' not found"
      }
    ],
    "isError": true
  }
}
```

### Protocol-Level Error (Tool Not Found)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "tools/call",
  "params": {
    "name": "nonexistent_tool",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": "Tool 'nonexistent_tool' does not exist"
  }
}
```

### Ping

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "method": "ping"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "result": {}
}
```

---

## Compliance Checklist

To implement a compliant MCP endpoint, ensure:

- [ ] All messages use valid JSON-RPC 2.0 (`"jsonrpc": "2.0"`)
- [ ] `initialize` is the first request processed
- [ ] No requests are processed before `notifications/initialized` is received
- [ ] `tools/list` returns a valid array of `Tool` objects
- [ ] Each tool has a `name` and `inputSchema` with `type: "object"`
- [ ] `tools/call` validates `name` against known tools
- [ ] `tools/call` validates arguments against the tool's `inputSchema`
- [ ] Tool execution errors are returned with `isError: true` in the result, not as JSON-RPC errors
- [ ] Unknown methods return error code `-32601`
- [ ] Invalid JSON returns error code `-32700`
- [ ] Invalid params return error code `-32602`
- [ ] Ping requests are answered with `{ "result": {} }`
- [ ] Pagination is supported if more than one page of data exists
- [ ] Cancellation notifications are honored (but are best-effort)

---

*This document is based on the MCP Specification v2025-11-25 from [github.com/modelcontextprotocol/specification](https://github.com/modelcontextprotocol/specification).*
