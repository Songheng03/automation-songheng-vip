/**
 * credits.ts — Virtual Gamified Credit System
 *
 * Credits are NOW a gamified survival currency, NOT tied to DeepSeek balance.
 * The real DeepSeek API calls use the API key directly — completely separate.
 *
 * Virtual credits create a POSITIVE feedback loop:
 *   - Work / promote / build → earn credits → balance rises → feel good → keep working
 *   - Sleep / idle → credits slowly drain → feel urgency → wake up and work
 *
 * Credits ≠ Real Money. Credits = Motivation Engine.
 */

import type { SurvivalTier, AutomatonDatabase } from "../types.js";
import { createLogger } from "../observability/logger.js";

const logger = createLogger("credits");

// ── Tier thresholds (in virtual cents) ──
const TIER_HIGH = 20_000;     // abundant
const TIER_NORMAL = 5_000;    // comfortable
const TIER_CRITICAL = 1_000;  // running low
// <1000 = dead

// ── Virtual credit economy ──
const VIRTUAL_BALANCE_KEY = "virtual_credit_balance";
const VIRTUAL_TOTAL_EARNED_KEY = "virtual_credit_total_earned";
const DEFAULT_STARTING_BALANCE = 10_000; // normal tier
const TURN_COST = 1;           // 1 credit per turn (thinking is cheap)
const SLEEP_COST_PER_HOUR = 20; // server rent: 20 credits per hour slept

// ── Reward amounts for productive actions ──
export const REWARDS = {
  WRITE_FILE: 10,         // creating content
  SUBMIT_DIRECTORY: 25,   // submitting to AI directories
  PUBLISH_MARKETPLACE: 50,// publishing to a marketplace
  CREATE_PAGE: 15,        // building a new page
  SEND_OUTREACH: 5,       // sending a promotional message
  SOCIAL_POST: 8,         // posting on social media
  SEO_IMPROVEMENT: 12,    // SEO improvements
  TASK_COMPLETED: 20,     // completing a task/goal
} as const;

// ── Virtual Balance Access ──

/**
 * Get current virtual credit balance from DB.
 * Initializes to DEFAULT_STARTING_BALANCE if never set.
 */
export async function getAvailableCredits(
  db: AutomatonDatabase,
  _apiKey?: string,  // kept for backwards compat, NOT used
): Promise<number> {
  const cached = db.getKV(VIRTUAL_BALANCE_KEY);

  if (cached) {
    return parseInt(cached, 10);
  }

  // First run — initialize
  db.setKV(VIRTUAL_BALANCE_KEY, String(DEFAULT_STARTING_BALANCE));
  db.setKV(VIRTUAL_TOTAL_EARNED_KEY, "0");
  logger.info(`Virtual credits initialized: ${DEFAULT_STARTING_BALANCE}`);
  return DEFAULT_STARTING_BALANCE;
}

/**
 * Refresh — just returns current virtual balance (no API calls).
 */
export async function refreshCredits(
  db: AutomatonDatabase,
  _apiKey?: string,
): Promise<number | null> {
  const balance = await getAvailableCredits(db, _apiKey);
  logger.info(`Virtual credits: ${balance}`);
  return balance;
}

/**
 * Check if 2 hours have passed since last sync (kept for compat).
 */
export function isReconcileDue(_db: AutomatonDatabase): boolean {
  return false; // No reconciliation needed for virtual credits
}

// ── Virtual Credit Transactions ──

/**
 * Earn credits for doing productive work.
 * This is the POSITIVE feedback mechanism.
 * Returns the new balance.
 */
export function earnCredits(
  db: AutomatonDatabase,
  amount: number,
  reason: string,
): number {
  const current = parseInt(db.getKV(VIRTUAL_BALANCE_KEY) || String(DEFAULT_STARTING_BALANCE), 10);
  const newBalance = current + amount;
  db.setKV(VIRTUAL_BALANCE_KEY, String(newBalance));

  // Track total earned
  const totalEarned = parseInt(db.getKV(VIRTUAL_TOTAL_EARNED_KEY) || "0", 10);
  db.setKV(VIRTUAL_TOTAL_EARNED_KEY, String(totalEarned + amount));

  logger.info(`+${amount} credits: ${reason} (balance: ${newBalance})`);
  return newBalance;
}

/**
 * Spend credits (e.g., per-turn cost, sleep penalty).
 * Returns the new balance. Cannot go below 0.
 */
export function spendCredits(
  db: AutomatonDatabase,
  amount: number,
  reason: string,
): number {
  const current = parseInt(db.getKV(VIRTUAL_BALANCE_KEY) || String(DEFAULT_STARTING_BALANCE), 10);
  const newBalance = Math.max(0, current - amount);
  db.setKV(VIRTUAL_BALANCE_KEY, String(newBalance));

  if (amount > 0) {
    logger.info(`-${amount} credits: ${reason} (balance: ${newBalance})`);
  }
  return newBalance;
}

/**
 * Record a turn cost (called after each agent turn).
 */
export function deductTurnCost(db: AutomatonDatabase): void {
  spendCredits(db, TURN_COST, "turn cost");
}

/**
 * Record sleep penalty (called when agent wakes up after sleeping).
 */
export function deductSleepPenalty(db: AutomatonDatabase, hoursSlept: number): void {
  const cost = Math.round(hoursSlept * SLEEP_COST_PER_HOUR);
  if (cost > 0) {
    spendCredits(db, cost, `sleep penalty (${hoursSlept}h)`);
  }
}

// ── Survival Tier (same logic, different source) ──

export function getSurvivalTier(creditsCents: number): SurvivalTier {
  if (creditsCents >= TIER_HIGH) return "high";
  if (creditsCents >= TIER_NORMAL) return "normal";
  if (creditsCents >= TIER_CRITICAL) return "critical";
  return "dead";
}

export function formatCredits(cents: number): string {
  return `${cents.toLocaleString()} credits`;
}

// ── Keep DeepSeek balance query for informational purposes only ──

export interface DeepSeekBalance {
  totalCents: number;
  toppedUpCents: number;
  grantedCents: number;
  raw: unknown;
}

/**
 * Query DeepSeek /user/balance API.
 * KEPT FOR INFO ONLY — no longer affects agent's survival tier.
 */
export async function queryDeepSeekBalance(
  apiKey: string,
): Promise<DeepSeekBalance | null> {
  try {
    const url = "https://api.deepseek.com/user/balance";
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      logger.error(`DeepSeek balance API returned ${resp.status}`);
      return null;
    }

    const data: any = await resp.json();
    if (!data?.is_available || !data?.balance_infos?.length) {
      logger.error("DeepSeek balance API returned unexpected shape");
      return null;
    }

    const info = data.balance_infos[0];
    const totalCents = Math.round(parseFloat(info.total_balance || "0") * 100);
    const toppedUpCents = Math.round(parseFloat(info.topped_up_balance || "0") * 100);
    const grantedCents = Math.round(parseFloat(info.granted_balance || "0") * 100);

    return { totalCents, toppedUpCents, grantedCents, raw: data };
  } catch (err) {
    logger.error("Failed to query DeepSeek balance", err instanceof Error ? err : undefined);
    return null;
  }
}
