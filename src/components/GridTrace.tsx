// GridTrace — one SCADA-style instrument plot. Both charts share ONE scale function so the
// 5.2 MW envelope sits at the identical y-pixel on each, making the breach-vs-flat comparison
// honest. The breach signal is encoded on multiple non-color channels: a diagonal red hatch
// exclusion band above the envelope, the trace crossing the shared datum, a quantified callout,
// and (in the panel) a glyph+word status pill.

const W = 520;
const H = 230;
const PAD = { l: 12, r: 12, t: 16, b: 18 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

// Shared vertical domain (kW). Identical for both charts → shared datum.
const Y_MIN = 3200;
const Y_MAX = 7000;

const xOf = (i: number, n: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
const yOf = (kw: number) => {
  const c = Math.max(Y_MIN, Math.min(Y_MAX, kw));
  return PAD.t + (1 - (c - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
};

export interface GridTraceProps {
  variant: 'baseline' | 'upgrid';
  trace: number[];
  envelopeKw: number;
  breach: boolean;
  overKw: number;
  bufferedKw: number;
  headroomKw: number;
}

export function GridTrace({
  variant,
  trace,
  envelopeKw,
  breach,
  overKw,
  bufferedKw,
  headroomKw,
}: GridTraceProps) {
  const isBaseline = variant === 'baseline';
  const hatchId = `hatch-${variant}`;
  const n = trace.length;
  const envY = yOf(envelopeKw);
  const points = trace.map((kw, i) => `${xOf(i, n).toFixed(1)},${yOf(kw).toFixed(1)}`).join(' ');
  const last = trace[n - 1] ?? Y_MIN;
  const headX = xOf(n - 1, n);
  const headY = yOf(last);
  const traceColor = isBaseline ? 'var(--breach)' : 'var(--within)';
  const strokeW = isBaseline && breach ? 3 : 2.2;

  // Vertical sweep gridlines (oscilloscope feel) + a couple of horizontal rules.
  const vLines = Array.from({ length: 9 }, (_, k) => PAD.l + (k / 8) * PLOT_W);
  const hKw = [4000, 4800, 5600, 6400];

  const overMw = (overKw / 1000).toFixed(1);
  const bufferedMw = (bufferedKw / 1000).toFixed(1);
  const desc = isBaseline
    ? breach
      ? `Software-only baseline breaches the 5.2 MW envelope by about ${overMw} MW during the spike.`
      : `Software-only baseline is currently within the 5.2 MW envelope.`
    : `UpGrid stays flat under the 5.2 MW envelope; about ${bufferedMw} MW of transient is buffered on the DC bus.`;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc}>
        <title>{isBaseline ? 'Baseline grid trace' : 'UpGrid grid trace'}</title>
        <desc>{desc}</desc>

        <defs>
          <pattern
            id={hatchId}
            patternUnits="userSpaceOnUse"
            width={8}
            height={8}
            patternTransform="rotate(45)"
          >
            <rect width={8} height={8} fill="var(--breach-hatch-wash)" />
            <line x1={0} y1={0} x2={0} y2={8} stroke="var(--breach-hatch-line)" strokeWidth={1.4} />
          </pattern>
        </defs>

        {/* gridlines */}
        {vLines.map((x, k) => (
          <line
            key={`v${k}`}
            x1={x}
            y1={PAD.t}
            x2={x}
            y2={H - PAD.b}
            stroke="var(--plot-grid-minor)"
            strokeWidth={1}
          />
        ))}
        {hKw.map((kw) => (
          <line
            key={`h${kw}`}
            x1={PAD.l}
            y1={yOf(kw)}
            x2={W - PAD.r}
            y2={yOf(kw)}
            stroke="var(--plot-grid)"
            strokeWidth={1}
          />
        ))}

        {/* Baseline: red no-go exclusion band above the envelope (grayscale/print-safe). */}
        {isBaseline && (
          <rect
            x={PAD.l}
            y={PAD.t}
            width={PLOT_W}
            height={envY - PAD.t}
            fill={`url(#${hatchId})`}
          />
        )}
        {/* UpGrid: faint held-margin wash just below the envelope. */}
        {!isBaseline && (
          <rect
            x={PAD.l}
            y={envY}
            width={PLOT_W}
            height={yOf(envelopeKw - 1300) - envY}
            fill="var(--headroom-wash)"
          />
        )}

        {/* Shared 5.2 MW envelope datum (dashed), colored to panel state. */}
        <line
          x1={PAD.l}
          y1={envY}
          x2={W - PAD.r}
          y2={envY}
          stroke={isBaseline ? 'var(--breach)' : 'var(--within)'}
          strokeWidth={1.4}
          strokeDasharray="7 5"
        />
        <text
          x={W - PAD.r}
          y={envY - 5}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill={isBaseline ? 'var(--breach)' : 'var(--within)'}
        >
          5.2 MW ENVELOPE
        </text>

        {/* The trace itself (raw, unsmoothed). */}
        <polyline
          points={points}
          fill="none"
          stroke={traceColor}
          strokeWidth={strokeW}
          strokeLinejoin="round"
          strokeLinecap="butt"
        />

        {/* Live-cursor head dot (hidden under prefers-reduced-motion). */}
        <circle className="live-cursor" cx={headX} cy={headY} r={3.5} fill={traceColor} />

        {/* Quantified callout — same screen position, opposite verdict. */}
        {isBaseline && breach && (
          <text
            x={PAD.l + 8}
            y={PAD.t + 14}
            className="mono"
            fontSize={11}
            fontWeight={600}
            fill="var(--breach)"
          >
            +{overMw} MW OVER
          </text>
        )}
        {!isBaseline && (
          <text
            x={PAD.l + 8}
            y={envY + 16}
            className="mono"
            fontSize={11}
            fontWeight={600}
            fill="var(--within)"
          >
            {bufferedKw > 200
              ? `▲ ${bufferedMw} MW BUFFERED`
              : `✓ ${Math.round(headroomKw)} kW HEADROOM`}
          </text>
        )}
      </svg>
    </div>
  );
}
