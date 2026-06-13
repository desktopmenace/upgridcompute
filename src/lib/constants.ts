// Simulation constants.

/** Grid interconnection envelope, kW (5.2 MW). The whole demo turns on this line. */
export const ENVELOPE_KW = 5200;

/** Simulation tick interval, ms. */
export const TICK_MS = 700;

/** Number of samples held in each kW trace. */
export const TRACE_LEN = 40;

/** Max decision-log entries retained. */
export const LOG_CAP = 40;

/** UpGrid DC-bus SoC bounds, percent. */
export const DC_SOC_CAP = 95;
export const DC_SOC_FLOOR = 6;

/** Baseline third-party storage SoC floor, percent. */
export const BASE_SOC_FLOOR = 12;

/** Run the economic step roughly every Nth tick. */
export const DECISION_EVERY = 3;

/** Effective $/kWh a sheddable job must clear in a peak window to be accepted. */
export const PEAK_PRICE_THRESHOLD = 2.0;

/** Baseline revenue capture factor when it does keep a job (software-only throttling discount). */
export const BASE_CAPTURE = 0.8;
