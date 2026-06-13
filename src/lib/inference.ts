import type { Decision, DecisionAction, DecisionCtx } from './types';

// The Lambda Function URL. Not a secret. Unset → no live backend, app stays Emulated.
const INFERENCE_URL = (import.meta.env.VITE_INFERENCE_URL ?? '').trim();

const VALID_ACTIONS: DecisionAction[] = ['accept', 'defer', 'shed', 'battery'];

/** Whether a live backend URL is configured at build time. */
export function hasLiveBackend(): boolean {
  return INFERENCE_URL.length > 0;
}

/**
 * Parse a decision defensively: accepts an already-parsed object or a raw string,
 * strips stray code fences, and isolates the first JSON object. Throws on anything invalid
 * so callers can fall back to the local decision.
 */
export function parseDecision(raw: unknown): Decision {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    obj = JSON.parse(s);
  }
  const record = (obj ?? {}) as Record<string, unknown>;
  const action = String(record.action ?? '').toLowerCase() as DecisionAction;
  if (!VALID_ACTIONS.includes(action)) throw new Error(`invalid action: ${String(record.action)}`);
  const reason = String(record.reason ?? '').trim();
  if (!reason) throw new Error('empty reason');
  return { action, reason };
}

/** Hard timeout for a Live call so a slow/hung backend can never stall the simulation. */
const LIVE_TIMEOUT_MS = 12000;

/**
 * Call the Lambda → Claude Platform on AWS for a live Opus 4.8 decision.
 * The browser only ever talks to the Lambda; it never holds the key or the endpoint.
 * Aborts after LIVE_TIMEOUT_MS so the caller's in-flight guard always clears and falls back.
 */
export async function decideLive(ctx: DecisionCtx): Promise<Decision> {
  if (!INFERENCE_URL) throw new Error('no inference url configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  try {
    const res = await fetch(INFERENCE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`lambda ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    // Lambda returns { action, reason, source } (already parsed) or { raw: "..." }.
    if (typeof data.action === 'string' && typeof data.reason === 'string') {
      return parseDecision(data);
    }
    return parseDecision(data.raw ?? data);
  } finally {
    clearTimeout(timer);
  }
}
