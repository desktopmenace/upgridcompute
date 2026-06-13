const money = (v: number) => '$' + Math.round(v).toLocaleString('en-US');

export interface RevenuePanelProps {
  base: number;
  dc: number;
  deltaPct: number;
}

export function RevenuePanel({ base, dc, deltaPct }: RevenuePanelProps) {
  const max = Math.max(base, dc, 1);
  return (
    <section className="panel" aria-label="Revenue captured">
      <div className="rev__head">
        <h2 className="rev__title">Revenue captured</h2>
        <span className="rev__delta">
          {deltaPct >= 0 ? '+' : ''}
          {deltaPct.toFixed(0)}% UpGrid
        </span>
      </div>

      <div className="rev__row">
        <div className="rev__rowhead">
          <span className="rev__name">
            <span className="swatch" style={{ background: 'var(--hero)' }} aria-hidden="true" />
            UpGrid
          </span>
          <span className="rev__amount mono">{money(dc)}</span>
        </div>
        <div className="rev__bar">
          <div className="rev__fill dc" style={{ width: `${(dc / max) * 100}%` }} />
        </div>
      </div>

      <div className="rev__row">
        <div className="rev__rowhead">
          <span className="rev__name">
            <span
              className="swatch"
              style={{ background: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            Software-only
          </span>
          <span className="rev__amount mono">{money(base)}</span>
        </div>
        <div className="rev__bar">
          <div className="rev__fill base" style={{ width: `${(base / max) * 100}%` }} />
        </div>
      </div>

      <p className="rev__foot">
        UpGrid captures full job value unless it sheds; the software-only baseline is discounted and
        loses sheddable jobs during spikes.
      </p>
    </section>
  );
}
