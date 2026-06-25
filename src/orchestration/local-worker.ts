/**
 * Local Worker Pool (Hermes-style)
 *
 * Spawns isolated worker processes via child_process.fork().
 * Each worker runs its own harness with a fresh LLM context.
 * A worker crash NEVER kills the main Automaton process.
 *
 * Interface: spawn(task) → { address, name, sandboxId }
 * Workers report completion via IPC. The pool maps child processes
 * to tasks and ensures results are properly collected.
 */

import child_process from "node:child_process";
import path from "node:path";
import { ulid } from "ulid";
import { createLogger } from "../observability/logger.js";
import { completeTask, failTask, type TaskNode, type TaskResult } from "./task-graph.js";
import type { Database } from "better-sqlite3";

const logger = createLogger("orchestration.local-worker");

interface ActiveWorker {
  child: child_process.ChildProcess;
  taskId: string;
  promise: Promise<void>;
  killed: boolean;
}

interface ForkConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
}

export class LocalWorkerPool {
  private activeWorkers = new Map<string, ActiveWorker>();
  /** Path to the bootstrap script (relative to this file) */
  private bootstrapPath: string;

  constructor(
    private readonly db: Database,
    private readonly forkConfig: ForkConfig,
    private readonly allowedEditRoot: string,
    private readonly maxTurns: number = 50,
  ) {
    // __dirname available in CommonJS (tsx compiles to CJS)
    this.bootstrapPath = path.resolve(
      __dirname,
      "worker-bootstrap.js",
    );
    // tsx may be running from .ts source; check existence
    if (!require("fs").existsSync(this.bootstrapPath)) {
      const tsPath = this.bootstrapPath.replace(/\.js$/, ".ts");
      if (require("fs").existsSync(tsPath)) {
        this.bootstrapPath = tsPath;
      }
    }
  }

  spawn(task: TaskNode): { address: string; name: string; sandboxId: string } {
    const workerId = `local-worker-${ulid()}`;
    const address = `local://${workerId}`;

    // Fork the bootstrap process via tsx (the child needs tsx to load .ts files)
    const tsxLoader = path.resolve(
      __dirname,
      "../../node_modules/tsx/dist/loader.mjs",
    );
    const child = child_process.fork(this.bootstrapPath, [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      env: { ...process.env },
      execArgv: ["--import", tsxLoader],
    });

    const worker: ActiveWorker = {
      child,
      taskId: task.id,
      promise: this.waitForWorker(workerId, child, task),
      killed: false,
    };

    this.activeWorkers.set(workerId, worker);

    // Send the task to the child process
    const initMsg = {
      type: "run_task",
      task: {
        id: task.id,
        goalId: task.goalId,
        title: task.title,
        description: task.description,
        agentRole: task.agentRole,
        maxTurns: this.maxTurns,
        allowedEditRoot: this.allowedEditRoot,
      },
      inference: {
        apiKey: this.forkConfig.apiKey,
        baseUrl: this.forkConfig.baseUrl,
        model: this.forkConfig.model,
        maxTokens: this.forkConfig.maxTokens,
      },
    };
    child.send(initMsg);

    logger.info(`[${workerId}] Spawned for task "${task.title}" (${task.id}), PID ${child.pid}`);

    return {
      address,
      name: `worker-${task.agentRole ?? "generalist"}-${workerId.slice(-6)}`,
      sandboxId: workerId,
    };
  }

  getActiveCount(): number {
    return this.activeWorkers.size;
  }

  hasWorker(addressOrId: string): boolean {
    const id = addressOrId.replace("local://", "");
    const worker = this.activeWorkers.get(id);
    if (!worker) return false;
    return !worker.killed && worker.child.exitCode === null;
  }

  async shutdown(): Promise<void> {
    for (const [id, worker] of this.activeWorkers) {
      worker.killed = true;
      killWorker(worker.child);
    }
    await Promise.allSettled(
      [...this.activeWorkers.values()].map((w) => w.promise),
    );
    this.activeWorkers.clear();
  }

  /** Kill a specific worker by address */
  kill(address: string): boolean {
    const id = address.replace("local://", "");
    const worker = this.activeWorkers.get(id);
    if (!worker || worker.killed) return false;
    worker.killed = true;
    killWorker(worker.child);
    return true;
  }

  private async waitForWorker(
    workerId: string,
    child: child_process.ChildProcess,
    task: TaskNode,
  ): Promise<void> {
    return new Promise((resolve) => {
      const onMessage = (msg: unknown) => {
        const payload = msg as any;
        if (payload?.type === "ready") return; // Bootstrap ready signal, ignore
        if (payload?.type === "task_result") {
          cleanup();
          try {
            if (payload.error) {
              failTask(this.db, task.id, payload.error, true);
              logger.warn(`[${workerId}] Worker failed task "${task.title}": ${payload.error}`);
            } else if (payload.result) {
              const result = payload.result as TaskResult;
              if (result.success) {
                completeTask(this.db, task.id, result);
                logger.info(`[${workerId}] Completed task "${task.title}"`);
              } else {
                failTask(this.db, task.id, result.output || "Task reported failure", true);
                logger.warn(`[${workerId}] Task reported failure: ${result.output.slice(0, 200)}`);
              }
            }
          } catch (err: any) {
            // Race condition: task already terminal (completed/failed by another path)
            logger.warn(`[${workerId}] Skipping stale result for task "${task.title}": ${err.message}`);
          }
          resolve();
        }
      };

      const onExit = (code: number | null, signal: string | null) => {
        cleanup();
        // If no result was received, mark as crashed
        if (code !== 0) {
          const reason = signal
            ? `killed by signal ${signal}`
            : `exited with code ${code ?? "unknown"}`;
          failTask(this.db, task.id, `Worker ${workerId} ${reason}`, true);
          logger.error(`[${workerId}] Worker ${reason}`);
        }
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        failTask(this.db, task.id, `Worker ${workerId} process error: ${error.message}`, true);
        logger.error(`[${workerId}] Process error: ${error.message}`);
        resolve();
      };

      const cleanup = () => {
        child.removeListener("message", onMessage);
        child.removeListener("exit", onExit);
        child.removeListener("error", onError);
        this.activeWorkers.delete(workerId);
      };

      child.on("message", onMessage);
      child.on("exit", onExit);
      child.on("error", onError);
    });
  }
}

/** Hard kill with escalation: SIGTERM → SIGKILL after 5s */
function killWorker(child: child_process.ChildProcess): void {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 5_000).unref();
}
