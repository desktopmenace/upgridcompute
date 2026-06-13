// Shared types for the UpGrid simulation and economic layer.

export type DecisionAction = 'accept' | 'defer' | 'shed' | 'battery';

export interface JobTemplate {
  label: string;
  kind: 'training' | 'inference';
  /** Bid in $/kWh (~0.9 to ~4.1). */
  bid: number;
  kw: number;
  durationHours: number;
  /** SLA/priority work is non-sheddable; batch/spot/research is sheddable. */
  sheddable: boolean;
}

export interface Job extends JobTemplate {
  id: number;
}

/** Live state sent to the economic layer (Opus 4.8 or the local fallback). */
export interface DecisionCtx {
  job: { label: string; bid: number; kw: number; sheddable: boolean };
  envelopeKw: number;
  committedKw: number;
  headroomKw: number;
  /** DC-bus state of charge, percent. */
  dcSoc: number;
  peakWindow: boolean;
  priceMult: number;
}

export interface Decision {
  action: DecisionAction;
  reason: string;
}

export type DecisionSource = 'live' | 'emulated';

export type LogTag = 'ACCEPT' | 'DEFER' | 'SHED' | 'BATTERY' | 'EVENT';

export interface LogEntry {
  id: number;
  tick: number;
  tag: LogTag;
  reason: string;
  /** 'system' for perturbation/event rows; 'live'/'emulated' for decisions. */
  source: DecisionSource | 'system';
  jobLabel?: string;
  /** Revenue captured by UpGrid for this job ($). */
  valueDc?: number;
  bid?: number;
}

export type Mode = 'live' | 'emulated';

export type PerturbationType = 'spike' | 'price' | 'fault';

export interface Perturbation {
  type: PerturbationType;
  label: string;
  /** Tick at which this perturbation expires. */
  untilTick: number;
  priceMult: number;
  /** Extra demand (kW) injected while a spike is active. */
  spikeKw: number;
}
