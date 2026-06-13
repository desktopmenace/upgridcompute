import type { Job, JobTemplate } from './types';

// Six job templates across training and inference. Bids ~$0.9–$4.1/kWh.
// SLA / priority work is non-sheddable (protected); batch / spot / research / eval is sheddable.
export const JOB_TEMPLATES: JobTemplate[] = [
  { label: 'LLM pretraining shard', kind: 'training', bid: 1.1, kw: 1400, durationHours: 6, sheddable: true },
  { label: 'Batch fine-tune', kind: 'training', bid: 1.6, kw: 900, durationHours: 3, sheddable: true },
  { label: 'Research sweep (spot)', kind: 'training', bid: 0.9, kw: 1200, durationHours: 4, sheddable: true },
  { label: 'Realtime inference SLA', kind: 'inference', bid: 3.8, kw: 700, durationHours: 1, sheddable: false },
  { label: 'Priority API serving', kind: 'inference', bid: 4.1, kw: 520, durationHours: 1, sheddable: false },
  { label: 'Eval / CI inference', kind: 'inference', bid: 1.4, kw: 480, durationHours: 2, sheddable: true },
];

let nextJobId = 1;

/** Returns a random job template with a unique incrementing id. */
export function spawnJob(): Job {
  const t = JOB_TEMPLATES[Math.floor(Math.random() * JOB_TEMPLATES.length)];
  return { ...t, id: nextJobId++ };
}
