import type { Decision, DecisionCtx } from './types';
import { PEAK_PRICE_THRESHOLD } from './constants';

/**
 * Local deterministic economic decision — the Emulated fallback. Mirrors the rule set the
 * Lambda hands to Claude Opus 4.8, so Live and Emulated behave the same:
 *   - Non-sheddable SLA work is protected: accept if it fits, else hold on battery (never shed).
 *   - Sheddable work: accept if it fits and clears the peak threshold (off-peak always clears);
 *     otherwise defer to reserve battery for premium work.
 *   - Shed only when there is no headroom AND SoC is below the 35% reserve floor.
 */
export function decideLocal(ctx: DecisionCtx): Decision {
  const { job, headroomKw, dcSoc, peakWindow, priceMult } = ctx;
  const effective = job.bid * priceMult;
  const fits = headroomKw >= job.kw;
  const eff = effective.toFixed(2);
  const soc = Math.round(dcSoc);
  const hr = Math.round(headroomKw);

  if (!job.sheddable) {
    if (fits) {
      return {
        action: 'accept',
        reason: `Accepted SLA ${job.label}: ${job.kw} kW fits the ${hr} kW headroom at $${eff}/kWh effective — no buffering needed.`,
      };
    }
    return {
      action: 'battery',
      reason: `Held SLA ${job.label} on the DC battery: only ${hr} kW grid headroom for ${job.kw} kW, so the ${soc}% SoC covers the deficit and protects the contract.`,
    };
  }

  if (!fits && dcSoc < 35) {
    return {
      action: 'shed',
      reason: `Shed ${job.label}: no headroom (${hr} kW) and SoC ${soc}% is below the 35% reserve floor — drop the spot job to protect premium load.`,
    };
  }

  if (fits && (!peakWindow || effective >= PEAK_PRICE_THRESHOLD)) {
    return {
      action: 'accept',
      reason: `Accepted ${job.label}: ${job.kw} kW fits the ${hr} kW headroom and clears $${eff}/kWh ${peakWindow ? 'in the peak window' : 'off-peak'}.`,
    };
  }

  return {
    action: 'defer',
    reason: `Deferred ${job.label}: $${eff}/kWh is under the $${PEAK_PRICE_THRESHOLD.toFixed(2)} peak threshold — reserve the ${hr} kW headroom and ${soc}% SoC for premium work.`,
  };
}
