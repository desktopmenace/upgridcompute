import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BASE_CAPTURE,
  BASE_SOC_FLOOR,
  DC_SOC_CAP,
  DC_SOC_FLOOR,
  DECISION_EVERY,
  ENVELOPE_KW,
  LOG_CAP,
  TICK_MS,
  TRACE_LEN,
} from '../lib/constants';
import { spawnJob } from '../lib/jobs';
import { decideLocal } from '../lib/decision';
import { decideLive, hasLiveBackend } from '../lib/inference';
import type {
  Decision,
  DecisionCtx,
  DecisionSource,
  Job,
  LogEntry,
  LogTag,
  Mode,
  Perturbation,
} from '../lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const tagFor = (a: Decision['action']): LogTag => a.toUpperCase() as LogTag;

export interface SimState {
  running: boolean;
  tick: number;
  baseTrace: number[];
  dcTrace: number[];
  baseQoS: number;
  baseSoc: number;
  dcSoc: number;
  log: LogEntry[];
  revenue: { base: number; dc: number };
  perturbation: Perturbation | null;
  mode: Mode;
  lastSource: DecisionSource | null;
  baseBreach: boolean;
  dcBreach: boolean;
  committedKw: number;
  headroomKw: number;
  priceMult: number;
}

// Centered base load (kW); sits comfortably under the envelope so spikes are what breach it.
const BASE_CENTER = 4350;

function seedTrace(jitter: boolean): number[] {
  const arr: number[] = [];
  for (let i = 0; i < TRACE_LEN; i++) {
    const sine = 320 * Math.sin((i - TRACE_LEN) / 6);
    arr.push(jitter ? BASE_CENTER + sine + (Math.random() - 0.5) * 180 : BASE_CENTER + sine);
  }
  return arr;
}

function initialState(): SimState {
  return {
    running: true,
    tick: 0,
    baseTrace: seedTrace(true),
    dcTrace: seedTrace(false),
    baseQoS: 100,
    baseSoc: 82,
    dcSoc: 88,
    log: [],
    revenue: { base: 0, dc: 0 },
    perturbation: null,
    // Default to Live when a backend is configured; otherwise Emulated.
    mode: hasLiveBackend() ? 'live' : 'emulated',
    lastSource: null,
    baseBreach: false,
    dcBreach: false,
    committedKw: BASE_CENTER,
    headroomKw: ENVELOPE_KW - BASE_CENTER,
    priceMult: 1,
  };
}

export interface Simulation extends SimState {
  liveConfigured: boolean;
  deltaPct: number;
  toggleRun: () => void;
  setMode: (m: Mode) => void;
  triggerSpike: () => void;
  triggerPrice: () => void;
  triggerFault: () => void;
  reset: () => void;
}

export function useSimulation(): Simulation {
  const [state, setState] = useState<SimState>(initialState);

  // Refs the interval/async closures read so they always see current values.
  const stateRef = useRef(state);
  stateRef.current = state;
  const modeRef = useRef(state.mode);
  modeRef.current = state.mode;
  const inFlightRef = useRef(false);
  const logIdRef = useRef(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Resolve one job decision asynchronously. One call in flight at a time; never blocks the UI.
  const runDecision = useCallback(async (job: Job, ctx: DecisionCtx, contended: boolean) => {
    inFlightRef.current = true;
    let decision: Decision;
    let source: DecisionSource;
    try {
      if (modeRef.current === 'live') {
        decision = await decideLive(ctx);
        source = 'live';
      } else {
        decision = decideLocal(ctx);
        source = 'emulated';
      }
    } catch {
      // Live failed or no key configured → fall back to the local decision for this tick.
      decision = decideLocal(ctx);
      source = 'emulated';
    }

    // Revenue. UpGrid captures full value unless it sheds. Baseline is discounted and loses
    // sheddable jobs entirely while the grid is contended. Never negative.
    const jobValue = Math.max(0, job.bid * ctx.priceMult * (job.kw / 1000) * job.durationHours);
    const dcValue = decision.action === 'shed' ? 0 : jobValue;
    const baseValue = contended && job.sheddable ? 0 : jobValue * BASE_CAPTURE;

    if (!mountedRef.current) {
      inFlightRef.current = false;
      return;
    }
    setState((prev) => {
      const entry: LogEntry = {
        id: logIdRef.current++,
        tick: prev.tick,
        tag: tagFor(decision.action),
        reason: decision.reason,
        source,
        jobLabel: job.label,
        valueDc: dcValue,
        bid: job.bid,
      };
      return {
        ...prev,
        log: [entry, ...prev.log].slice(0, LOG_CAP),
        revenue: {
          base: Math.max(0, prev.revenue.base + baseValue),
          dc: Math.max(0, prev.revenue.dc + dcValue),
        },
        lastSource: source,
      };
    });
    inFlightRef.current = false;
  }, []);

  // Advance one tick. Impure inputs (noise, job spawn) are computed once outside the updater so
  // the updater stays pure; async-updated fields (log, revenue) are preserved via `...prev`.
  const doTick = useCallback(() => {
    const noise = (Math.random() - 0.5) * 220; // ±110 kW
    const willDecide = (stateRef.current.tick + 1) % DECISION_EVERY === 0 && !inFlightRef.current;
    const job = willDecide ? spawnJob() : null;

    let captured: { job: Job; ctx: DecisionCtx; contended: boolean } | null = null;

    setState((prev) => {
      const nextTick = prev.tick + 1;

      let perturbation = prev.perturbation;
      if (perturbation && nextTick >= perturbation.untilTick) perturbation = null;
      const priceMult = perturbation?.priceMult ?? 1;
      const spikeKw = perturbation?.type === 'spike' ? perturbation.spikeKw : 0;
      const spikeActive = spikeKw > 0;
      const peakWindow = priceMult > 1;

      const sine = 320 * Math.sin(nextTick / 6);

      // Baseline (software-only): AC draw = full demand incl. spike → overshoots envelope.
      const baseAc = Math.max(2600, BASE_CENTER + sine + noise + spikeKw);
      const baseBreach = baseAc > ENVELOPE_KW;

      // UpGrid (DC-native): transient buffered on the DC bus → AC clamped at/below envelope, flat.
      const dcAc = spikeActive ? ENVELOPE_KW - 30 : Math.min(BASE_CENTER + sine, ENVELOPE_KW - 30);

      const baseQoS = baseBreach
        ? clamp(prev.baseQoS - 5, 70, 100)
        : clamp(prev.baseQoS + 1.6, 70, 100);
      const baseSoc = baseBreach
        ? clamp(prev.baseSoc - 1.2, BASE_SOC_FLOOR, 100)
        : clamp(prev.baseSoc + 0.5, BASE_SOC_FLOOR, 100);
      const dcSoc = spikeActive
        ? clamp(prev.dcSoc - 3.0, DC_SOC_FLOOR, DC_SOC_CAP)
        : clamp(prev.dcSoc + 1.2, DC_SOC_FLOOR, DC_SOC_CAP);

      const committedKw = Math.round(dcAc);
      const headroomKw = Math.max(0, ENVELOPE_KW - committedKw);

      if (willDecide && job) {
        captured = {
          job,
          ctx: {
            job: { label: job.label, bid: job.bid, kw: job.kw, sheddable: job.sheddable },
            envelopeKw: ENVELOPE_KW,
            committedKw,
            headroomKw,
            dcSoc: Math.round(dcSoc),
            peakWindow,
            priceMult,
          },
          contended: spikeActive || baseBreach,
        };
      }

      return {
        ...prev,
        tick: nextTick,
        perturbation,
        priceMult,
        baseTrace: [...prev.baseTrace, baseAc].slice(-TRACE_LEN),
        dcTrace: [...prev.dcTrace, dcAc].slice(-TRACE_LEN),
        baseQoS,
        baseSoc,
        dcSoc,
        baseBreach,
        dcBreach: false,
        committedKw,
        headroomKw,
      };
    });

    if (captured) {
      const c = captured as { job: Job; ctx: DecisionCtx; contended: boolean };
      runDecision(c.job, c.ctx, c.contended);
    }
  }, [runDecision]);

  // The simulation loop. Cleared on pause/unmount — no leaked timers.
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(doTick, TICK_MS);
    return () => clearInterval(id);
  }, [state.running, doTick]);

  const pushEvent = useCallback((reason: string, mutate: (prev: SimState) => Partial<SimState>) => {
    setState((prev) => {
      const entry: LogEntry = {
        id: logIdRef.current++,
        tick: prev.tick,
        tag: 'EVENT',
        reason,
        source: 'system',
      };
      return { ...prev, ...mutate(prev), log: [entry, ...prev.log].slice(0, LOG_CAP) };
    });
  }, []);

  const toggleRun = useCallback(() => setState((p) => ({ ...p, running: !p.running })), []);
  const setMode = useCallback((m: Mode) => setState((p) => ({ ...p, mode: m })), []);

  const triggerSpike = useCallback(() => {
    pushEvent(
      'Demand spike armed: +1.8 MW transient for ~12 ticks. Watch the baseline cross the 5.2 MW envelope while UpGrid holds flat.',
      (prev) => ({
        perturbation: {
          type: 'spike',
          label: 'Demand spike · +1.8 MW',
          untilTick: prev.tick + 12,
          priceMult: 1,
          spikeKw: 1800,
        },
      }),
    );
  }, [pushEvent]);

  const triggerPrice = useCallback(() => {
    pushEvent(
      'Price window opened: 2.0× energy price for ~14 ticks. The economic layer now holds out for premium work before committing headroom.',
      (prev) => ({
        perturbation: {
          type: 'price',
          label: 'Price window · 2.0×',
          untilTick: prev.tick + 14,
          priceMult: 2.0,
          spikeKw: 0,
        },
      }),
    );
  }, [pushEvent]);

  const triggerFault = useCallback(() => {
    pushEvent(
      'Battery fault injected: DC-bus SoC dropped 40 points. UpGrid defends premium load with less buffer; the baseline’s leased storage takes a hit too.',
      (prev) => ({
        dcSoc: clamp(prev.dcSoc - 40, DC_SOC_FLOOR, DC_SOC_CAP),
        // The shared fault also dents the baseline's third-party storage and QoS, so both panels move.
        baseSoc: clamp(prev.baseSoc - 20, BASE_SOC_FLOOR, 100),
        baseQoS: clamp(prev.baseQoS - 3, 70, 100),
        perturbation: {
          type: 'fault',
          label: 'Battery fault · −40% SoC',
          untilTick: prev.tick + 6,
          priceMult: 1,
          spikeKw: 0,
        },
      }),
    );
  }, [pushEvent]);

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setState(initialState());
  }, []);

  const deltaPct =
    state.revenue.base > 0
      ? ((state.revenue.dc - state.revenue.base) / state.revenue.base) * 100
      : state.revenue.dc > 0
        ? 100
        : 0;

  return {
    ...state,
    liveConfigured: hasLiveBackend(),
    deltaPct,
    toggleRun,
    setMode,
    triggerSpike,
    triggerPrice,
    triggerFault,
    reset,
  };
}
