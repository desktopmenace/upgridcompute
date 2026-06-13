import { useSimulation } from './hooks/useSimulation';
import { ENVELOPE_KW } from './lib/constants';
import { Header } from './components/Header';
import { SystemPanel } from './components/SystemPanel';
import { RevenuePanel } from './components/RevenuePanel';
import { DecisionLog } from './components/DecisionLog';
import { ControlBar } from './components/ControlBar';

export default function App() {
  const sim = useSimulation();

  const lastBase = sim.baseTrace[sim.baseTrace.length - 1] ?? ENVELOPE_KW;
  const lastDc = sim.dcTrace[sim.dcTrace.length - 1] ?? ENVELOPE_KW;
  const overKw = Math.max(0, lastBase - ENVELOPE_KW);
  // Honest "buffered" figure: the same demand event, minus what UpGrid actually drew from the grid.
  const bufferedKw = Math.max(0, lastBase - lastDc);

  return (
    <div className="app">
      <Header mode={sim.mode} lastSource={sim.lastSource} liveConfigured={sim.liveConfigured} />

      <ControlBar
        running={sim.running}
        toggleRun={sim.toggleRun}
        onSpike={sim.triggerSpike}
        onPrice={sim.triggerPrice}
        onFault={sim.triggerFault}
        activeLabel={sim.perturbation?.label ?? null}
        mode={sim.mode}
        setMode={sim.setMode}
        liveConfigured={sim.liveConfigured}
      />

      <div className="event-strip">
        <span className="label">Same demand event</span>
        <span className="rule" aria-hidden="true" />
        <span className={`active${sim.perturbation ? '' : ' calm'}`}>
          {sim.perturbation ? sim.perturbation.label : 'nominal load'}
        </span>
        <span className="rule" aria-hidden="true" />
        <span className="label">two systems</span>
      </div>

      <div className="charts">
        <SystemPanel
          variant="baseline"
          title="Software-only baseline"
          sub="AC meter"
          trace={sim.baseTrace}
          envelopeKw={ENVELOPE_KW}
          breach={sim.baseBreach}
          overKw={overKw}
          bufferedKw={0}
          headroomKw={Math.max(0, ENVELOPE_KW - Math.round(lastBase))}
          priceMult={sim.priceMult}
          qos={sim.baseQoS}
          soc={sim.baseSoc}
          socLabel="3rd-party SoC"
          response="~min"
          caption={
            <>
              Throttles compute at the AC meter over seconds–minutes. It doesn’t own the power
              hardware, so a spike <strong>crosses the envelope</strong> before any job can be
              deferred.
            </>
          }
        />
        <SystemPanel
          variant="upgrid"
          title="UpGrid"
          sub="SST + BESS"
          hero
          trace={sim.dcTrace}
          envelopeKw={ENVELOPE_KW}
          breach={false}
          overKw={0}
          bufferedKw={bufferedKw}
          headroomKw={sim.headroomKw}
          priceMult={sim.priceMult}
          qos={100}
          soc={sim.dcSoc}
          socLabel="DC-bus SoC"
          response="~ms"
          caption={
            <>
              Buffers the transient on the DC bus in milliseconds — the AC draw the utility meters
              see <strong>never crosses the envelope</strong>.
            </>
          }
        />
      </div>

      <div className="lower">
        <RevenuePanel base={sim.revenue.base} dc={sim.revenue.dc} deltaPct={sim.deltaPct} />
        <DecisionLog log={sim.log} />
      </div>

      <footer className="footer">
        <strong>Simulation.</strong> Hardware control is deterministic; Opus&nbsp;4.8 is on the
        economic layer only. The cabinet ships to a 5.2&nbsp;MW site in July.
      </footer>
    </div>
  );
}
