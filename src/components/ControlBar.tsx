import type { Mode } from '../lib/types';

function SourceToggle({
  mode,
  setMode,
  liveConfigured,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  liveConfigured: boolean;
}) {
  return (
    <div className="toggle" role="group" aria-label="Decision source">
      <button
        type="button"
        aria-pressed={mode === 'live'}
        onClick={() => setMode('live')}
        title={
          liveConfigured
            ? 'Real Claude Opus 4.8 via the Lambda'
            : 'No backend configured — Live falls back to Emulated per decision'
        }
      >
        <span className="dot" aria-hidden="true" />
        Live · Opus 4.8
      </button>
      <button
        type="button"
        className="emu"
        aria-pressed={mode === 'emulated'}
        onClick={() => setMode('emulated')}
      >
        <span className="dot" aria-hidden="true" />
        Emulated
      </button>
    </div>
  );
}

export interface ControlBarProps {
  running: boolean;
  toggleRun: () => void;
  onSpike: () => void;
  onPrice: () => void;
  onFault: () => void;
  activeLabel: string | null;
  mode: Mode;
  setMode: (m: Mode) => void;
  liveConfigured: boolean;
}

export function ControlBar({
  running,
  toggleRun,
  onSpike,
  onPrice,
  onFault,
  activeLabel,
  mode,
  setMode,
  liveConfigured,
}: ControlBarProps) {
  return (
    <div className="controls" role="group" aria-label="Simulation controls">
      <button
        type="button"
        className={`btn btn--run${running ? '' : ' paused'}`}
        onClick={toggleRun}
        aria-pressed={running}
      >
        <span className="glyph" aria-hidden="true">
          {running ? '❚❚' : '▶'}
        </span>
        {running ? 'Pause' : 'Run'}
      </button>

      <div className="controls__divider" aria-hidden="true" />

      <div className="controls__group">
        <button type="button" className="btn" onClick={onSpike}>
          <span className="glyph" aria-hidden="true">
            ⚡
          </span>
          Demand spike
        </button>
        <button type="button" className="btn" onClick={onPrice}>
          <span className="glyph" aria-hidden="true">
            $
          </span>
          Price window
        </button>
        <button type="button" className="btn" onClick={onFault}>
          <span className="glyph" aria-hidden="true">
            ⚠
          </span>
          Battery fault
        </button>
      </div>

      <div className="controls__active" aria-live="polite">
        <span className={`live-led${activeLabel ? '' : ' calm'}`} aria-hidden="true" />
        {activeLabel ?? 'No active event'}
      </div>

      <SourceToggle mode={mode} setMode={setMode} liveConfigured={liveConfigured} />
    </div>
  );
}
