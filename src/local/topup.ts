/**
 * topup.ts — Local-only stub (no local mode).
 * Auto-topup is not supported in local mode.
 */

import type { LocalRuntime } from "../types.js";

export async function topupForSandbox(_params: {
  sandboxId?: string;
  apiUrl?: string;
  account?: { address: string };
  chainType?: string;
  error?: string;
  creditsCents?: number;
  minCreditsCents?: number;
  targetCreditsCents?: number;
  walletAddress?: string;
  note?: string;
  runtime?: LocalRuntime;
}): Promise<{ success: boolean; amountUsd: number; creditsCentsAdded?: number; error?: string }> {
  return { success: false, error: "Local mode: topup not available", amountUsd: 0, creditsCentsAdded: 0 };
}

export async function bootstrapTopup(_options: {
  walletAddress?: string;
  apiUrl?: string;
  account?: { address: string };
  chainType?: string;
  error?: string;
  creditsCents?: number;
  minCreditsCents?: number;
  targetCreditsCents?: number;
  note?: string;
}): Promise<{ success: boolean; amountUsd: number; creditsCentsAdded?: number; error?: string }> {
  return { success: false, error: "Local mode: topup not available", amountUsd: 0, creditsCentsAdded: 0 };
}
