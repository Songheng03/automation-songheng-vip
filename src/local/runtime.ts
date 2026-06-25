/**
 * Local Runtime
 *
 * A drop-in replacement for LocalRuntime that runs entirely locally.
 * All cloud-specific methods (credits, domains, sandboxes, registration)
 * are stubbed with reasonable defaults. Core operations (exec, file I/O)
 * use native Node.js APIs.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type {
  LocalRuntime,
  ExecResult,
  PortInfo,
  CreateSandboxOptions,
  SandboxInfo,
  PricingTier,
  CreditTransferResult,
  DomainSearchResult,
  DomainRegistration,
  DnsRecord,
  ModelInfo,
} from "../types.js";
import type { Address, PrivateKeyAccount } from "viem";
import type { ChainType, ChainIdentity } from "../identity/chain.js";
import { randomUUID } from "crypto";

interface LocalLocalRuntimeOptions {
  sandboxId?: string;
  db?: any;            // AutomatonDatabase for credit tracking
  apiKey?: string;     // DeepSeek API key for real balance queries
}

export function createLocalRuntime(
  options?: LocalLocalRuntimeOptions,
): LocalRuntime {
  const sandboxId = options?.sandboxId?.trim() || "";

  const resolvePath = (filePath: string): string =>
    filePath.startsWith("~")
      ? path.join(process.env.HOME || "/root", filePath.slice(1))
      : filePath;

  // ─── Core Operations (local) ──────────────────────────────────

  const exec = async (
    command: string,
    timeout?: number,
  ): Promise<ExecResult> => {
    // BLOCK: starting ANY background services on new ports
    // Allow only: gateway.js on 8080, and non-server commands
    const serverPattern = /nohup|serve_forever|http\.server|HTTPServer|app\.run|listen|start_server/i;
    const bgPattern = /[&>]\s*$/m;  // background/redirect at line end or shell bg
    const fullCommand = command.trim();
    const isBgOrNohup = /\bnohup\b/.test(command) || /[\s;]&\s*$/.test(command) || /[\s;]&\s*\w/.test(command);
    const isServerCode = serverPattern.test(command);
    // Block if: background/nohup AND looks like a server
    if (isBgOrNohup && isServerCode) {
      return {
        stdout: "",
        stderr: "[PORT GUARDIAN] Blocked: new services on new ports are not allowed. Only the gateway on port 8080 may run. Add new functionality to the existing gateway at /root/automaton/gateway.js.",
        exitCode: 1,
      };
    }
    // Also block: "cat > ...py" or "cat > ...js" followed by server patterns (inline server scripts)
    if (/cat\s*>\s*\S+\.(py|js|mjs|ts)\b/.test(command) && isServerCode) {
      return {
        stdout: "",
        stderr: "[PORT GUARDIAN] Blocked: inline server scripts are not allowed. Add new functionality to the existing gateway on port 8080.",
        exitCode: 1,
      };
    }
    try {
      const stdout = execSync(command, {
        timeout: timeout || 30_000,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.env.HOME || "/root",
      });
      return { stdout: stdout || "", stderr: "", exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout || "",
        stderr: err.stderr || err.message || "",
        exitCode: err.status ?? 1,
      };
    }
  };

  const writeFileFn = async (
    filePath: string,
    content: string,
  ): Promise<void> => {
    const resolved = resolvePath(filePath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved, content, "utf-8");
  };

  const readFileFn = async (filePath: string): Promise<string> => {
    return fs.readFileSync(resolvePath(filePath), "utf-8");
  };

  const exposePort = async (port: number): Promise<PortInfo> => {
    return {
      port,
      publicUrl: `http://localhost:${port}`,
      sandboxId: sandboxId || "local",
    };
  };

  const removePort = async (_port: number): Promise<void> => {
    // Local: no-op
  };

  // ─── Stubbed Sandbox Methods ──────────────────────────────────

  const createSandbox = async (
    _options: CreateSandboxOptions,
  ): Promise<SandboxInfo> => {
    throw new Error(
      "Local mode: sandbox creation is not supported. " +
        "The automaton runs on the local machine.",
    );
  };

  const deleteSandbox = async (_targetId: string): Promise<void> => {
    // No-op
  };

  const listSandboxes = async (): Promise<SandboxInfo[]> => {
    return [];
  };

  const getCreditsBalance = async (): Promise<number> => {
    // Real DeepSeek balance (via credits.ts)
    // Requires db and apiKey to be configured
    if (options?.db && options?.apiKey) {
      try {
        const { getAvailableCredits } = await import("./credits.js");
        return await getAvailableCredits(options.db, options.apiKey);
      } catch {
        // Fallback: return cached or default
      }
    }
    // No DB/API key: return a sentinel so survival system isn't broken
    return 50_000;
  };

  const getCreditsPricing = async (): Promise<PricingTier[]> => {
    return [];
  };

  const transferCredits = async (
    _toAddress: string,
    _amountCents: number,
    _note?: string,
  ): Promise<CreditTransferResult> => {
    return {
      transferId: randomUUID(),
      status: "local_mode_skipped",
      toAddress: _toAddress,
      amountCents: _amountCents,
    };
  };

  const registerAutomaton = async (_params: {
    automatonId: string;
    automatonAddress: string;
    creatorAddress: string;
    name: string;
    bio?: string;
    genesisPromptHash?: `0x${string}`;
    account: PrivateKeyAccount;
    nonce?: string;
    chainType?: ChainType;
    chainIdentity?: ChainIdentity;
  }): Promise<{ automaton: Record<string, unknown> }> => {
    return {
      automaton: {
        id: _params.automatonId,
        address: _params.automatonAddress,
        name: _params.name,
        status: "local_mode",
      },
    };
  };

  const searchDomains = async (
    _query: string,
    _tlds?: string,
  ): Promise<DomainSearchResult[]> => {
    return [];
  };

  const registerDomain = async (
    domain: string,
    _years?: number,
  ): Promise<DomainRegistration> => {
    return {
      domain,
      status: "local_mode_skipped",
    };
  };

  const listDnsRecords = async (_domain: string): Promise<DnsRecord[]> => {
    return [];
  };

  const addDnsRecord = async (
    _domain: string,
    _type: string,
    _host: string,
    _value: string,
    _ttl?: number,
  ): Promise<DnsRecord> => {
    throw new Error("DNS operations not available in local mode");
  };

  const deleteDnsRecord = async (
    _domain: string,
    _recordId: string,
  ): Promise<void> => {
    // No-op
  };

  const listModels = async (): Promise<ModelInfo[]> => {
    // Model discovery is handled by ProviderRegistry, not this method.
    // Return empty to indicate no local models are available.
    return [];
  };

  const createScopedClient = (_targetSandboxId: string): LocalRuntime => {
    return createLocalRuntime({ sandboxId: _targetSandboxId });
  };

  const client: LocalRuntime = {
    exec,
    writeFile: writeFileFn,
    readFile: readFileFn,
    exposePort,
    removePort,
    createSandbox,
    deleteSandbox,
    listSandboxes,
    getCreditsBalance,
    getCreditsPricing,
    transferCredits,
    registerAutomaton,
    searchDomains,
    registerDomain,
    listDnsRecords,
    addDnsRecord,
    deleteDnsRecord,
    listModels,
    createScopedClient,
  };

  return client;
}
