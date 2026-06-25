#!/usr/bin/env node
/**
 * Worker Bootstrap
 *
 * Entry point for forked worker processes (child_process.fork).
 * Receives one task via IPC, runs GeneralHarness, sends result back, exits.
 *
 * Clean process isolation: a worker crash never kills the main Automaton.
 * Each worker gets its own LLM context (fresh conversation) and runs
 * independently with a minimal tool set: exec / read_file / write_file / task_done.
 */

import { exec as execCb } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { GeneralHarness } from "../agent/harnesses/general-harness.js";
import type { HarnessContext } from "../agent/harness-types.js";
import type { TaskNode, TaskResult } from "./task-graph.js";

// ─── Types ──────────────────────────────────────────────────────

interface InitMessage {
  type: "run_task";
  task: {
    id: string;
    goalId: string;
    title: string;
    description: string;
    agentRole: string | null;
    maxTurns: number;
    allowedEditRoot: string;
  };
  inference: {
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens: number;
  };
}

interface ResultPayload {
  type: "task_result";
  taskId: string;
  result: TaskResult;
  error?: string;
}

// ─── Minimal Runtime (no DB dependency) ─────────────────────────

const RUNTIME = {
  exec: async (command: string, timeoutMs: number) => {
    return new Promise<{ stdout?: string; stderr?: string }>((resolve) => {
      execCb(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      });
    });
  },
  writeFile: async (filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  },
  readFile: async (filePath: string) => fs.readFile(filePath, "utf-8"),
};

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.send) {
    console.error("worker-bootstrap: must be run as child_process.fork target");
    process.exit(1);
  }

  // Signal readiness — parent can start sending the task
  process.send!({ type: "ready" });

  // Wait for exactly one "run_task" message, then run and exit
  const init: InitMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout waiting for init message")), 60_000);
    process.once("message", (msg: unknown) => {
      clearTimeout(timeout);
      const m = msg as InitMessage;
      if (m?.type === "run_task") resolve(m);
      else reject(new Error(`expected run_task, got ${(msg as any)?.type}`));
    });
  });

  try {
    const result = await runWorker(init);
    sendResult(init.task.id, result);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResult(init.task.id, {
      success: false,
      output: message,
      artifacts: [],
      costCents: 0,
      duration: 0,
    }, message);
    process.exit(1);
  }
}

// ─── Run Worker ─────────────────────────────────────────────────

async function runWorker(init: InitMessage): Promise<TaskResult> {
  const { task: t, inference: inf } = init;

  const taskNode: TaskNode = {
    id: t.id,
    goalId: t.goalId,
    title: t.title,
    description: t.description,
    agentRole: t.agentRole,
    status: "assigned",
    assignedTo: `local://${process.pid}`,
    parentId: null,
    priority: 50,
    dependencies: [],
    result: null,
    metadata: {
      estimatedCostCents: 0,
      actualCostCents: 0,
      maxRetries: 0,
      retryCount: 0,
      timeoutMs: 300_000,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    },
  };

  // 5-minute task timeout — abort signal kills the harness loop
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 300_000);

  const openai = new OpenAI({ apiKey: inf.apiKey, baseURL: inf.baseUrl });

  const inferenceClient = {
    chat: async (params: {
      messages: any[];
      tools?: any[];
      toolChoice?: any;
      maxTokens?: number;
      temperature?: number;
      responseFormat?: { type: "json_object" | "text" };
    }) => {
      const response = await openai.chat.completions.create({
        model: inf.model,
        messages: params.messages,
        tools: params.tools,
        tool_choice: params.toolChoice,
        max_tokens: params.maxTokens ?? inf.maxTokens,
        temperature: params.temperature ?? 0.7,
        response_format: params.responseFormat,
      });
      const choice = response.choices[0];
      const tc = choice?.message?.tool_calls;
      return {
        content: choice?.message?.content ?? "",
        toolCalls: tc?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: (tc as any).function.name, arguments: (tc as any).function.arguments },
        })),
      };
    },
  };

  const context: HarnessContext = {
    workspaceRoot: process.cwd(),
    allowedEditRoot: t.allowedEditRoot || process.cwd(),
    workspace: null as any,
    identity: null as any,
    config: null as any,
    db: null as any,
    runtime: RUNTIME as any,
    inference: inferenceClient as any,
    budget: {
      maxTurns: t.maxTurns || 25,
      maxCostCents: 999_999,
      timeoutMs: 300_000,
      turnsUsed: 0,
      costUsedCents: 0,
      startedAt: Date.now(),
    },
    wisdom: { conventions: [], failures: [], gotchas: [], successes: [] },
    abortSignal: abortController.signal,
    goalId: t.goalId,
    toolCatalog: undefined,
    toolContext: undefined,
    policyEngine: undefined,
    spendTracker: undefined,
    inputSource: undefined,
  };

  try {
    const harness = new GeneralHarness();
    await harness.initialize(taskNode, context);
    return await harness.execute();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── IPC Send ───────────────────────────────────────────────────

function sendResult(taskId: string, result: TaskResult, error?: string): void {
  const payload: ResultPayload = { type: "task_result", taskId, result };
  if (error) payload.error = error;
  try { process.send!(payload); } catch { /* parent may have disconnected */ }
}

main();
