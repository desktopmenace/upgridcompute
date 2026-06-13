import type { ReactNode } from 'react';
import { GridTrace } from './GridTrace';

function StatusPill({ breach, system }: { breach: boolean; system: string }) {
  return (
    <span aria-live="polite" role="status">
      <span className="sr-only">
        {system}: {breach ? 'envelope breach' : 'within envelope'}
      </span>
      {breach ? (
        <span className="pill pill--breach" aria-hidden="true">
          <span className="glyph">▲</span> Envelope breach
        </span>
      ) : (
        <span className="pill pill--within" aria-hidden="true">
          <span className="glyph">●</span> Within envelope
        </span>
      )}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className={`metric__value${tone ? ' ' + tone : ''}`}>
        {value}
        {unit ? <span className="metric__unit">{unit}</span> : null}
      </div>
    </div>
  );
}

export interface SystemPanelProps {
  variant: 'baseline' | 'upgrid';
  title: string;
  sub: string;
  hero?: boolean;
  trace: number[];
  envelopeKw: number;
  breach: boolean;
  overKw: number;
  bufferedKw: number;
  headroomKw: number;
  priceMult: number;
  qos: number;
  soc: number;
  socLabel: string;
  response: string;
  caption: ReactNode;
}

export function SystemPanel(props: SystemPanelProps) {
  const { variant, title, sub, hero, qos, soc, socLabel, response, caption } = props;
  const qosTone = qos >= 99 ? 'good' : qos >= 90 ? 'warn' : 'bad';
  const socTone = variant === 'upgrid' ? (soc < 35 ? 'warn' : 'good') : undefined;

  return (
    <section className={`panel${hero ? ' panel--hero' : ''}`} aria-label={`${title} system`}>
      <div className="panel__head">
        <h2 className="panel__title">
          {hero ? <span className="hero-marker">◆ HERO</span> : null}
          {title} <span className="sub">{sub}</span>
        </h2>
        <div className="panel__status">
          {props.priceMult > 1 ? (
            <span className="pill pill--price" title="Energy price window active">
              <span className="glyph" aria-hidden="true">
                $
              </span>
              {props.priceMult.toFixed(1)}×
            </span>
          ) : null}
          <StatusPill breach={props.breach} system={title} />
        </div>
      </div>

      <GridTrace
        variant={variant}
        trace={props.trace}
        envelopeKw={props.envelopeKw}
        breach={props.breach}
        overKw={props.overKw}
        bufferedKw={props.bufferedKw}
        headroomKw={props.headroomKw}
      />

      <div className="metrics">
        <Metric label="QoS" value={qos.toFixed(0)} unit="%" tone={qosTone} />
        <Metric label={socLabel} value={soc.toFixed(0)} unit="%" tone={socTone} />
        <Metric label="Response" value={response} />
      </div>

      <p className="chart__caption">{caption}</p>
    </section>
  );
}
