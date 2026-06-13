import type { LogEntry, LogTag } from '../lib/types';

const TAG_META: Record<LogTag, { tone: string; rail: string; glyph: string }> = {
  ACCEPT: { tone: 'tone-accept', rail: 'rail-accept', glyph: '✓' },
  DEFER: { tone: 'tone-defer', rail: 'rail-defer', glyph: '⏸' },
  SHED: { tone: 'tone-shed', rail: 'rail-shed', glyph: '✕' },
  BATTERY: { tone: 'tone-battery', rail: 'rail-battery', glyph: '▰' },
  EVENT: { tone: 'tone-event', rail: 'rail-event', glyph: '◦' },
};

export interface DecisionLogProps {
  log: LogEntry[];
}

export function DecisionLog({ log }: DecisionLogProps) {
  return (
    <section className="panel log" aria-label="Decision log">
      <div className="log__head">
        <h2 className="log__title">Decision log</h2>
        <span className="rev__delta" style={{ color: 'var(--text-faint)' }}>
          Opus 4.8 economic layer
        </span>
      </div>
      <div
        className="log__scroll"
        tabIndex={0}
        role="log"
        aria-label="Economic decisions, newest first"
        aria-live="polite"
      >
        {log.length === 0 ? (
          <div className="log__empty">Awaiting first decision…</div>
        ) : (
          log.map((e) => {
            const m = TAG_META[e.tag];
            return (
              <div key={e.id} className={`log__row ${m.rail}`}>
                <div className="log__tagcol">
                  <span className={`tag ${m.tone}`}>
                    <span className="glyph" aria-hidden="true">
                      {m.glyph}
                    </span>
                    {e.tag}
                  </span>
                  {e.jobLabel ? <span className="log__job">{e.jobLabel}</span> : null}
                </div>
                <div className="log__reason">{e.reason}</div>
                <div className="log__meta">
                  {e.source !== 'system' ? (
                    <span className={`log__src${e.source === 'live' ? ' live' : ''}`}>
                      {e.source === 'live' ? 'LIVE' : 'EMU'}
                    </span>
                  ) : null}
                  {typeof e.valueDc === 'number' && e.valueDc > 0 ? (
                    <span className="log__val">+{money(e.valueDc)}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

const money = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
