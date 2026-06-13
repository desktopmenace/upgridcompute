# UpGrid — Compute Orchestrator · RUBRIC

> The scoring criteria for this hackathon submission. This file is **also the adversarial
> verification checklist**: each criterion below is verified independently, in a clean context, by a
> separate reviewer, and any failure is fixed before the build is considered done.

Each criterion is PASS / FAIL. A criterion only passes if a reviewer who did not write the code can
confirm it from the repository and the running app.

---

### R1 — Builds clean & valid Amplify config
The app builds cleanly with Vite and runs with no console errors. `amplify.yml` is valid for AWS
Amplify Hosting, with the artifact `baseDirectory` set to `dist`.

- [ ] `npm ci && npm run build` succeeds with no errors.
- [ ] No runtime console errors on load or during the simulation.
- [ ] `amplify.yml` exists, is valid YAML, runs the Vite build, and declares `artifacts.baseDirectory: dist`.

### R2 — Split screen & visible divergence
The split screen renders. During a demand spike the **baseline breaches the 5.2 MW envelope** while
**UpGrid stays flat**. The divergence is instantly readable to a non-technical judge.

- [ ] Two grid-trace charts render side by side.
- [ ] A dashed line marks the 5.2 MW (5200 kW) envelope on each chart.
- [ ] On a demand spike, the baseline trace crosses above the envelope and shows an "ENVELOPE BREACH" state.
- [ ] On the same spike, the UpGrid trace stays at/below the envelope ("WITHIN ENVELOPE").

### R3 — Real Opus 4.8 via Lambda → Claude Platform on AWS
Real Claude Opus 4.8 calls succeed through the Lambda → Claude Platform on AWS **native Messages
API** (`/v1/messages`, **not** Amazon Bedrock, **not** `InvokeModel`). The rationale shown in the UI
is the model's own output. The key lives **only** in the Lambda environment
(`ANTHROPIC_AWS_API_KEY`) — never in the browser, never in the repo.

- [ ] The browser calls the Lambda only; it never calls the Anthropic endpoint and never holds the key.
- [ ] The Lambda POSTs to `https://aws-external-anthropic.<region>.api.aws/v1/messages` with the `x-api-key` and `anthropic-version` headers.
- [ ] The model id is a single clearly-commented `MODEL_ID` constant defaulting to `claude-opus-4-8`.
- [ ] In Live mode, the rationale text displayed is the model's returned `reason`.
- [ ] No secret is hardcoded, printed, or committed.

### R4 — Emulated fallback & toggle
An Emulated fallback works with no backend and no key. The Live / Emulated toggle switches cleanly,
and the per-decision badge reflects the actual source.

- [ ] With no `VITE_INFERENCE_URL` configured, the app runs fully in Emulated mode.
- [ ] If a Live call errors, the app falls back to a local deterministic decision for that tick and labels it Emulated.
- [ ] A visible toggle switches Live / Emulated; the badge reads "Live · Opus 4.8" or "Emulated".

### R5 — Perturbations affect both panels; non-blocking async
All three perturbations (demand spike, price window, battery fault) visibly change **both** panels.
At most one model call is in flight at a time, and the simulation keeps running during async calls.

- [ ] Demand spike: baseline breaches; UpGrid stays flat; both traces respond.
- [ ] Price window: price multiplier rises; revenue and decisions change in both panels.
- [ ] Battery fault: UpGrid DC-bus SoC drops sharply; a fault event is logged.
- [ ] An in-flight guard ensures only one decision call runs at a time; the trace keeps advancing during calls.

### R6 — Numeric safety & lifecycle
Revenue never goes negative, state-of-charge clamps to its bounds, the decision log caps its length,
and the simulation interval is cleaned up on unmount.

- [ ] Revenue for both systems is always ≥ 0.
- [ ] DC-bus SoC clamps (≈6%–95%); baseline third-party SoC clamps; QoS clamps to ≤100%.
- [ ] The decision log is capped (≈40 entries).
- [ ] The `setInterval` is cleared on unmount / pause (no leaked timers).

### R7 — Accessible & responsive
Visible keyboard focus, `prefers-reduced-motion` support, and a layout that holds up at narrow
widths.

- [ ] Interactive controls show a visible keyboard focus indicator.
- [ ] `prefers-reduced-motion: reduce` disables non-essential animation/transitions.
- [ ] The layout reflows to a single column and remains usable at narrow (mobile) widths.

### R8 — Repo & secret hygiene
The GitHub repo contains `BRIEF.md`, `RUBRIC.md`, `README.md`, `amplify.yml`, and the Lambda,
committed and pushed to `main`. No secrets are committed: a `.gitignore` excludes env files and a
`.env.example` lists variable **names only**.

- [ ] `BRIEF.md`, `RUBRIC.md`, `README.md`, `amplify.yml`, and `lambda/` are all committed on `main`.
- [ ] `.gitignore` excludes `.env*` (except `.env.example`) and `node_modules`/`dist`.
- [ ] `.env.example` lists only variable names — no values.
- [ ] `git grep` for the key variable finds no secret value anywhere in the tree.
