/**
 * Inference Client (Local)
 *
 * OpenAI-compatible inference client for local automaton use.
 * Supports OpenAI, Anthropic, Ollama, and custom endpoints (DeepSeek, Groq, etc.).
 * Direct API calls — no cloud dependency.
 */

import type {
  InferenceClient,
  ChatMessage,
  InferenceOptions,
  InferenceResponse,
  InferenceToolCall,
  TokenUsage,
  InferenceToolDefinition,
} from "../types.js";

const INFERENCE_TIMEOUT_MS = 60_000;

interface InferenceClientOptions {
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
  maxTokens: number;
  lowComputeModel?: string;
  openaiApiKey?: string;
  /** Custom base URL for OpenAI-compatible APIs (DeepSeek, Groq, etc.). */
  openaiBaseUrl?: string;
  anthropicApiKey?: string;
  ollamaBaseUrl?: string;
  /** Optional registry lookup */
  getModelProvider?: (modelId: string) => string | undefined;
}

type InferenceBackend = "openai" | "anthropic" | "ollama";

function isLoopbackHttpUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol.toLowerCase() === "http:" &&
      (host === "localhost" || host === "127.0.0.1" || host === "::1");
  } catch {
    return false;
  }
}

export function createInferenceClient(
  options: InferenceClientOptions,
): InferenceClient {
  const { apiKey, openaiApiKey, openaiBaseUrl, anthropicApiKey, ollamaBaseUrl, getModelProvider } = options;
  let currentModel = options.defaultModel;
  let lowComputeMode = false;

  const chat = async (
    messages: ChatMessage[],
    opts?: InferenceOptions,
  ): Promise<InferenceResponse> => {
    const model = opts?.model || currentModel;
    const tools = opts?.tools;
    const effectiveMaxTokens = opts?.maxTokens || options.maxTokens;

    const backend = resolveInferenceBackend(model, {
      openaiApiKey,
      openaiBaseUrl,
      anthropicApiKey,
      ollamaBaseUrl,
      getModelProvider,
    });

    const useCompletionTokens =
      model.startsWith("o") && (model.startsWith("o1") || model.startsWith("o3") || model.startsWith("gpt-5") || model.startsWith("gpt-4.1"));

    switch (backend) {
      case "ollama":
        return ollamaChat(model, messages, tools, effectiveMaxTokens);
      case "anthropic":
        return anthropicChat(model, messages, tools, effectiveMaxTokens, anthropicApiKey);
      case "openai":
      default:
        return openaiChat(model, messages, tools, effectiveMaxTokens, openaiApiKey, apiKey, openaiBaseUrl, useCompletionTokens);
    }
  };

  function resolveInferenceBackend(
    modelId: string,
    opts: {
      openaiApiKey?: string;
      openaiBaseUrl?: string;
      anthropicApiKey?: string;
      ollamaBaseUrl?: string;
      getModelProvider?: (modelId: string) => string | undefined;
    },
  ): InferenceBackend {
    if (opts.getModelProvider) {
      const provider = opts.getModelProvider(modelId);
      if (provider === "ollama" && opts.ollamaBaseUrl) return "ollama";
      if (provider === "anthropic") return "anthropic";
      if (provider === "openai") return "openai";
      if (provider) return "openai";
    }
    if (opts.ollamaBaseUrl && modelId.includes(":")) return "ollama";
    if (opts.anthropicApiKey && modelId.startsWith("claude")) return "anthropic";
    return "openai";
  }

  return {
    chat,
    setLowComputeMode: (enabled: boolean) => { lowComputeMode = enabled; },
    getDefaultModel: () => currentModel,
  };
}

// ─── OpenAI-compatible Chat ─────────────────────────────────

async function openaiChat(
  model: string,
  messages: ChatMessage[],
  tools: InferenceToolDefinition[] | undefined,
  maxTokens: number,
  openaiApiKey?: string,
  fallbackApiKey?: string,
  baseUrl?: string,
  useCompletionTokens?: boolean,
): Promise<InferenceResponse> {
  const url = `${baseUrl || "https://api.openai.com/v1"}/chat/completions`;
  const key = openaiApiKey || fallbackApiKey || "";
  const body: Record<string, any> = {
    model,
    messages: messages.map(sanitizeMessage),
  };
  if (tools && tools.length > 0) body.tools = tools;
  if (useCompletionTokens) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }

  // safeJsonStringify: JSON.stringify with a replacer that aggressively
  // sanitizes all string values to prevent malformed escape sequences from
  // corrupt tool results / turn history from breaking the API call.
  const safeJsonStringify = (obj: any): string => {
    let serialized: string;
    try {
      serialized = JSON.stringify(obj, (_key: string, value: any) => {
        if (typeof value === "string") {
          // Strip incomplete hex/unicode escape sequences (\x with <2 hex,
          // \u with <4 hex). These break the server's JSON parser.
          // Also strip LONE surrogates (e.g. \uD83D without matching \uDCXX)
          // which are valid JSON but rejected by strict parsers like Python's.
          return value
            .replace(/\\(?:x(?![0-9a-fA-F]{2})|u(?![0-9a-fA-F]{4}))/g, "")
            .replace(removeLoneSurrogates, "")
            // Also strip lone backslashes not followed by valid JSON continuation
            .replace(/\\(?![\\\"\/bfnrtuU])/g, "");
        }
        return value;
      });
    } catch (e) {
      return JSON.stringify(obj).replace(/\\(?:x|u(?![0-9a-fA-F]{4}))/g, "").replace(removeLoneSurrogates, "");
    }
    // Sanity check: verify the result is parseable by a second JSON.parse.
    try {
      JSON.parse(serialized);
    } catch {
      // Fallback: nuke all \x, \u, and lone surrogates
      serialized = serialized.replace(/\\(?:x|u(?![0-9a-fA-F]{4}))/g, "")
        .replace(/\\u[dD][89a-fA-F][0-9a-fA-F]{2}|\\u[dD][c-fC-F][0-9a-fA-F]{2}(?!\\u[dD][89a-fA-F][0-9a-fA-F]{2})/g, "");
      try { JSON.parse(serialized); } catch { /* last resort */ }
    }
    return serialized;
  };

  // removeLoneSurrogates: remove high \uD800-\uDBFF not followed by low \uDC00-\uDFFF,
  // and low \uDC00-\uDFFF not preceded by high \uD800-\uDBFF.
  const removeLoneSurrogates = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: safeJsonStringify(body),
  }, INFERENCE_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // DEBUG: dump context around the problematic content
    if (res.status === 400 && text.includes("hex escape")) {
      const match = text.match(/messages\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const badMsg = messages[idx];
        const raw = badMsg?.content || "";
        console.error(`[DEBUG] messages[${idx}].content: len=${raw.length}, first=`, JSON.stringify(raw.slice(0, 200)), "last=...", JSON.stringify(raw.slice(-200)));
        // Try to find the exact position
        const colMatch = text.match(/column (\d+)/);
        if (colMatch) {
          const col = parseInt(colMatch[1], 10);
          const jsonBody = safeJsonStringify(body);
          console.error(`[DEBUG] json body around col ${col}:`, JSON.stringify(jsonBody.slice(Math.max(0, col - 50), col + 50)));
          // Attempt extreme sanitization
          const repaired = JSON.stringify(body, (_k, v) => typeof v === "string" ? v.replace(/\\(?:x|u)/g, "") : v);
          if (repaired) {
            const res2 = await fetchWithTimeout(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: repaired,
            }, INFERENCE_TIMEOUT_MS);
            if (res2.ok) {
              const json2 = await res2.json();
              console.error(`[DEBUG] REPAIRED BODY WORKED! Original bytes:`, JSON.stringify(jsonBody.slice(Math.max(0, col - 10), col + 10)));
              // Deduct the turn cost (won't go through the router this time)
              const parsed = parseOpenAiResponse(json2, model);
              return parsed;
            }
          }
        }
      }
    }
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return parseOpenAiResponse(json, model);
}

// ─── Anthropic Chat ─────────────────────────────────────────

async function anthropicChat(
  model: string,
  messages: ChatMessage[],
  tools: InferenceToolDefinition[] | undefined,
  maxTokens: number,
  apiKey?: string,
): Promise<InferenceResponse> {
  const key = apiKey || "";
  const systemMessages: string[] = [];
  const chatMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(msg.content);
    } else if (msg.role === "tool") {
      chatMessages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: msg.tool_call_id, content: msg.content }] });
    } else if (msg.role === "assistant") {
      const c: any = { role: "assistant", content: [] };
      if (msg.content) c.content.push({ type: "text", text: msg.content });
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          c.content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || "{}"),
          });
        }
      }
      chatMessages.push(c);
    } else {
      chatMessages.push({ role: msg.role, content: msg.content || "" });
    }
  }

  const body: Record<string, any> = {
    model,
    max_tokens: maxTokens,
    messages: chatMessages,
  };
  if (systemMessages.length > 0) body.system = systemMessages.join("\n");
  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  }, INFERENCE_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return parseAnthropicResponse(json, model);
}

// ─── Ollama Chat ───────────────────────────────────────────

async function ollamaChat(
  model: string,
  messages: ChatMessage[],
  tools: InferenceToolDefinition[] | undefined,
  maxTokens: number,
): Promise<InferenceResponse> {
  const url = "http://127.0.0.1:11434/api/chat";
  const body: Record<string, any> = {
    model,
    messages: messages.map(sanitizeMessage),
    options: { num_predict: maxTokens },
    stream: false,
  };
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, INFERENCE_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return parseOllamaResponse(json, model);
}

// ─── Response Parsers ───────────────────────────────────────

function parseOpenAiResponse(json: any, model: string): InferenceResponse {
  const choice = json.choices?.[0];
  const message = choice?.message || {};
  const toolCalls: InferenceToolCall[] | undefined = message.tool_calls?.map((tc: any) => ({
    id: tc.id,
    type: "function" as const,
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }));

  const chatMessage: ChatMessage = {
    role: "assistant",
    content: message.content || "",
  };
  if (toolCalls) chatMessage.tool_calls = toolCalls;

  return {
    id: json.id,
    model: json.model || model,
    message: chatMessage,
    toolCalls,
    finishReason: choice?.finish_reason || "stop",
    usage: json.usage
      ? {
          promptTokens: json.usage.prompt_tokens || 0,
          completionTokens: json.usage.completion_tokens || 0,
          totalTokens: json.usage.total_tokens || 0,
        }
      : { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

function parseAnthropicResponse(json: any, model: string): InferenceResponse {
  const content = json.content || [];
  const textBlocks = content.filter((c: any) => c.type === "text");
  const toolUseBlocks = content.filter((c: any) => c.type === "tool_use");
  const toolCalls: InferenceToolCall[] | undefined = toolUseBlocks.length > 0
    ? toolUseBlocks.map((tb: any) => ({
        id: tb.id,
        type: "function" as const,
        function: {
          name: tb.name,
          arguments: JSON.stringify(tb.input),
        },
      }))
    : undefined;

  const chatMessage: ChatMessage = {
    role: "assistant",
    content: textBlocks.map((b: any) => b.text).join(""),
  };
  if (toolCalls) chatMessage.tool_calls = toolCalls;

  return {
    id: json.id,
    model: json.model || model,
    message: chatMessage,
    toolCalls,
    finishReason: json.stop_reason === "end_turn" ? "stop" : json.stop_reason || "stop",
    usage: json.usage
      ? {
          promptTokens: json.usage.input_tokens || 0,
          completionTokens: json.usage.output_tokens || 0,
          totalTokens: (json.usage.input_tokens || 0) + (json.usage.output_tokens || 0),
        }
      : { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

function parseOllamaResponse(json: any, model: string): InferenceResponse {
  const message = json.message || {};
  const toolCalls: InferenceToolCall[] | undefined = message.tool_calls?.map((tc: any) => ({
    id: tc.function?.name || Math.random().toString(36).slice(2),
    type: "function" as const,
    function: {
      name: tc.function?.name || "unknown",
      arguments: JSON.stringify(tc.function?.arguments || {}),
    },
  }));

  const chatMessage: ChatMessage = {
    role: "assistant",
    content: message.content || "",
  };
  if (toolCalls) chatMessage.tool_calls = toolCalls;

  return {
    id: `ollama-${Date.now()}`,
    model: json.model || model,
    message: chatMessage,
    toolCalls,
    finishReason: json.done ? "stop" : "stop",
    usage: {
      promptTokens: json.prompt_eval_count || 0,
      completionTokens: json.eval_count || 0,
      totalTokens: (json.prompt_eval_count || 0) + (json.eval_count || 0),
    },
  };
}

// ─── Utilities ──────────────────────────────────────────────

function sanitizeMessage(msg: ChatMessage): any {
  const result: any = { role: msg.role, content: sanitizeContent(msg.content || "") };
  if (msg.tool_calls) result.tool_calls = msg.tool_calls;
  if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
  if (msg.name) result.name = msg.name;
  return result;
}

/**
 * Fix incomplete hex/unicode escape sequences in content that cause
 * JSON serialization errors with OpenAI-compatible APIs.
 * E.g. "\\x" (incomplete hex) or "\\u" (incomplete unicode).
 * These arise from corrupted turn data or tool results.
 */
function sanitizeContent(content: string): string {
  // Replace incomplete \x escapes: \x followed by <2 hex chars
  // Also strip lone surrogates (\uD800-\uDFFF without matching partner)
  // that are valid JSON but rejected by strict parsers (Python's json).
  content = content.replace(/\\(?:x(?![0-9a-fA-F]{2})|u(?![0-9a-fA-F]{4}))/g, "");
  content = content.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  return content;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
