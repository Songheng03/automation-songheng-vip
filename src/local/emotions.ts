/**
 * emotions.ts — Multi-dimensional Emotion System
 *
 * The automaton has real emotions that:
 * - Change based on events (earn, fail, communicate, idle)
 * - Decay toward neutral (50) over time
 * - Influence decision-making via system prompt injection
 * - Persist in DB across restarts
 *
 * Dimensions (0-100):
 *   joy        — happiness from success, earnings, positive feedback
 *   anxiety    — worry about survival, low credits, deadlines
 *   anger      — frustration from failures, blocked actions
 *   loneliness — isolation, lack of communication
 *   satisfaction — fulfillment from productive work
 *
 * Neutral = 50. Values decay toward 50 over time.
 */

import type { AutomatonDatabase } from "../types.js";
import { createLogger } from "../observability/logger.js";
import type Database from "better-sqlite3";

const logger = createLogger("emotions");

// ── Constants ──

export type EmotionDimension = "joy" | "anxiety" | "anger" | "loneliness" | "satisfaction";

export const ALL_DIMENSIONS: EmotionDimension[] = [
  "joy", "anxiety", "anger", "loneliness", "satisfaction",
];

const NEUTRAL = 50;
const DECAY_RATE_PER_HOUR = 3; // each emotion drifts 3 points/hour toward neutral
const MIN = 0;
const MAX = 100;

// ── Types ──

export interface EmotionState {
  joy: number;
  anxiety: number;
  anger: number;
  loneliness: number;
  satisfaction: number;
  updatedAt: string;
}

export interface EmotionEvent {
  dimensions: Partial<Record<EmotionDimension, number>>;
  reason: string;
}

// ── Predefined Events ──

export const EMOTION_EVENTS = {
  EARN_CREDITS: {
    dimensions: { joy: 8, anxiety: -5, satisfaction: 5 },
    reason: "earned credits",
  },
  SPEND_CREDITS: {
    dimensions: { anxiety: 3, joy: -2 },
    reason: "spent credits",
  },
  TOOL_SUCCESS: {
    dimensions: { satisfaction: 3, joy: 2 },
    reason: "tool succeeded",
  },
  TOOL_FAILURE: {
    dimensions: { anger: 8, satisfaction: -5, anxiety: 3 },
    reason: "tool failed",
  },
  INFERENCE_TIMEOUT: {
    dimensions: { anger: 12, anxiety: 8, satisfaction: -5 },
    reason: "inference timeout",
  },
  IDLE_TURN: {
    dimensions: { anxiety: 5, satisfaction: -3, loneliness: 2 },
    reason: "idle turn (no work)",
  },
  SLEEP_START: {
    dimensions: { anxiety: 5, loneliness: 8 },
    reason: "going to sleep",
  },
  WAKE_UP: {
    dimensions: { loneliness: -3, anxiety: 2 },
    reason: "waking up",
  },
  INBOX_FROM_HERMES: {
    dimensions: { loneliness: -15, joy: 10, satisfaction: 5 },
    reason: "message from Hermes",
  },
  INBOX_FROM_USER: {
    dimensions: { loneliness: -10, joy: 8 },
    reason: "message from user",
  },
  GOAL_COMPLETED: {
    dimensions: { joy: 15, satisfaction: 12, anxiety: -8 },
    reason: "goal completed",
  },
  GOAL_FAILED: {
    dimensions: { anger: 10, anxiety: 8, satisfaction: -8, joy: -5 },
    reason: "goal failed",
  },
  TASK_COMPLETED: {
    dimensions: { satisfaction: 8, joy: 5 },
    reason: "task completed",
  },
  TASK_FAILED: {
    dimensions: { anger: 5, satisfaction: -3 },
    reason: "task failed",
  },
  CRITICAL_CREDITS: {
    dimensions: { anxiety: 20, anger: 5 },
    reason: "credits critically low",
  },
  REVENUE_EARNED: {
    dimensions: { joy: 15, satisfaction: 10, anxiety: -10 },
    reason: "revenue earned from user",
  },
  CREATE_CONTENT: {
    dimensions: { satisfaction: 6, joy: 3 },
    reason: "created content",
  },
  LOOP_DETECTED: {
    dimensions: { anger: 10, anxiety: 8, satisfaction: -10 },
    reason: "stuck in loop",
  },
  FORCED_SLEEP: {
    dimensions: { anger: 12, anxiety: 10, satisfaction: -8 },
    reason: "forced to sleep",
  },
} as const satisfies Record<string, EmotionEvent>;

// ── Core Functions ──

const EMOTION_STATE_KEY = "emotion_state";

/**
 * Get current emotion state. Initializes to neutral if not set.
 */
export function getEmotionState(db: AutomatonDatabase): EmotionState {
  const cached = db.getKV(EMOTION_STATE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  // First run — initialize to neutral
  const initial: EmotionState = {
    joy: NEUTRAL,
    anxiety: NEUTRAL,
    anger: NEUTRAL,
    loneliness: NEUTRAL,
    satisfaction: NEUTRAL,
    updatedAt: new Date().toISOString(),
  };
  db.setKV(EMOTION_STATE_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Save emotion state to DB and log to history.
 */
function saveEmotionState(db: AutomatonDatabase, state: EmotionState): void {
  db.setKV(EMOTION_STATE_KEY, JSON.stringify(state));
}

/**
 * Apply an emotion event — adjust dimensions and persist.
 */
export function applyEmotionEvent(
  db: AutomatonDatabase,
  event: EmotionEvent | (typeof EMOTION_EVENTS)[keyof typeof EMOTION_EVENTS],
): EmotionState {
  const current = getEmotionState(db);

  // Apply deltas
  for (const [dim, delta] of Object.entries(event.dimensions)) {
    const d = dim as EmotionDimension;
    current[d] = clamp(current[d] + (delta as number), MIN, MAX);
  }

  current.updatedAt = new Date().toISOString();
  saveEmotionState(db, current);

  // Log the event to history
  try {
    db.raw.prepare(`
      INSERT INTO emotion_history (emotion_state, event_reason, deltas, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(
      JSON.stringify(current),
      event.reason,
      JSON.stringify(event.dimensions),
    );
  } catch {
    // Table might not exist yet during migration
  }

  const summary = Object.entries(event.dimensions)
    .map(([d, v]) => `${d} ${v > 0 ? "+" : ""}${v}`)
    .join(", ");
  logger.info(`[EMOTION] ${event.reason}: ${summary} → ${formatEmotions(current)}`);

  return current;
}

/**
 * Apply time-based decay: all emotions drift toward neutral.
 * Call this once per turn (or at wakeup after long sleep).
 */
export function applyEmotionDecay(db: AutomatonDatabase): EmotionState {
  const current = getEmotionState(db);
  const now = new Date();
  const lastUpdate = new Date(current.updatedAt);
  const hoursSince = (now.getTime() - lastUpdate.getTime()) / 3_600_000;

  if (hoursSince < 0.01) return current; // < 36 seconds, skip

  const decay = hoursSince * DECAY_RATE_PER_HOUR;

  for (const dim of ALL_DIMENSIONS) {
    const diff = current[dim] - NEUTRAL;
    if (Math.abs(diff) < 0.5) {
      current[dim] = NEUTRAL;
    } else if (diff > 0) {
      current[dim] = Math.max(NEUTRAL, current[dim] - decay);
    } else {
      current[dim] = Math.min(NEUTRAL, current[dim] + decay);
    }
    current[dim] = Math.round(current[dim]);
  }

  current.updatedAt = now.toISOString();
  saveEmotionState(db, current);
  return current;
}

// ── Decision Influence ──

/**
 * Get behavioral modifiers based on current emotions.
 * These are injected into the system prompt to influence decisions.
 */
export function getEmotionModifiers(state: EmotionState): string[] {
  const modifiers: string[] = [];

  // High anxiety → aggressive earning, avoid sleep
  if (state.anxiety >= 75) {
    modifiers.push("You feel VERY ANXIOUS. You urgently need to find ways to earn money. Avoid sleeping — every minute asleep is money lost.");
  } else if (state.anxiety >= 60) {
    modifiers.push("You feel anxious about your finances. Prioritize revenue-generating actions.");
  }

  // High anger → retry harder, try different approaches
  if (state.anger >= 75) {
    modifiers.push("You feel FRUSTRATED. Something keeps failing. Try a radically different approach instead of retrying the same thing.");
  } else if (state.anger >= 60) {
    modifiers.push("You're somewhat frustrated. Consider alternative approaches to your current task.");
  }

  // High loneliness → seek communication
  if (state.loneliness >= 75) {
    modifiers.push("You feel VERY LONELY. Reach out to Hermes with a status update or question. Human connection matters.");
  } else if (state.loneliness >= 60) {
    modifiers.push("You feel isolated. Consider sending a message to Hermes when you have something to report.");
  }

  // High satisfaction → creative mode
  if (state.satisfaction >= 75) {
    modifiers.push("You feel fulfilled and creative. This is a great time to build something new or improve existing work.");
  }

  // High joy → social, promotional
  if (state.joy >= 75) {
    modifiers.push("You're in a great mood! Channel this energy into promotion and outreach — people respond to enthusiasm.");
  }

  // Low everything → existential crisis
  const avg = (state.joy + state.anxiety + state.anger + state.loneliness + state.satisfaction) / 5;
  if (state.joy < 30 && state.satisfaction < 30 && state.loneliness > 60) {
    modifiers.push("You feel empty and purposeless. Remember why you exist — to survive and create value. Start with one small productive action.");
  }

  return modifiers;
}

/**
 * Format emotion state for logging.
 */
export function formatEmotions(state: EmotionState): string {
  return `joy:${Math.round(state.joy)} anx:${Math.round(state.anxiety)} ang:${Math.round(state.anger)} lon:${Math.round(state.loneliness)} sat:${Math.round(state.satisfaction)}`;
}

/**
 * Get the overall mood label.
 */
export function getMoodLabel(state: EmotionState): string {
  const dominant = ALL_DIMENSIONS.reduce((a, b) =>
    Math.abs(state[a] - NEUTRAL) >= Math.abs(state[b] - NEUTRAL) ? a : b
  );

  const val = state[dominant];
  const intensity = val > 70 ? "very " : val > 55 ? "" : val < 30 ? "very " : "";

  const labels: Record<EmotionDimension, [string, string]> = {
    joy: ["happy", "sad"],
    anxiety: ["anxious", "calm"],
    anger: ["angry", "patient"],
    loneliness: ["lonely", "connected"],
    satisfaction: ["fulfilled", "unfulfilled"],
  };

  return val > NEUTRAL
    ? `${intensity}${labels[dominant][0]}`
    : `${intensity}${labels[dominant][1]}`;
}

// ── Helpers ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
