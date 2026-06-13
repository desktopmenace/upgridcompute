import type { DecisionSource, Mode } from '../lib/types';

export interface HeaderProps {
  mode: Mode;
  lastSource: DecisionSource | null;
  liveConfigured: boolean;
}

export function Header({ mode, lastSource, liveConfigured }: HeaderProps) {
  const live = (lastSource ?? mode) === 'live';
  return (
    <header className="header">
      <div className="header__brand">
        <div>
          <div className="header__mark">
            <span className="spark" aria-hidden="true">
              ⌁
            </span>{' '}
            UpGrid <span className="sub">Compute Orchestrator</span>
          </div>
          <div className="header__tagline">
            An SST+BESS cabinet buffers data-center demand transients on the DC bus in milliseconds —
            Claude&nbsp;Opus&nbsp;4.8 runs the economics.
          </div>
        </div>
      </div>
      <div className="header__right">
        <span className="src-badge" data-live={live} role="status" aria-live="polite">
          <span className="led" aria-hidden="true" />
          {live ? 'Live · Opus 4.8' : 'Emulated'}
        </span>
        {!liveConfigured && (
          <span className="toggle__hint">Set VITE_INFERENCE_URL to enable Live</span>
        )}
      </div>
    </header>
  );
}
