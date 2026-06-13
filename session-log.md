# Session Log — UpGrid · DC Native Compute Orchestrator

How this project was built, in one Claude Code session, using a dynamic multi-agent workflow.
This is a curated log of the work (decisions, phases, fixes), deliberately **not** a raw transcript —
the raw conversation contained a short-lived workspace API key, which must never land in the repo.

- **Live app:** https://main.d2fxjnzxfyc78p.amplifyapp.com
- **Repo:** https://github.com/desktopmenace/upgridcompute
- **Model on the economic layer:** Claude Opus 4.8 (`claude-opus-4-8`) via Claude Platform on AWS
- **Date:** 2026-06-13

---

## Goal

Build a deployed, split-screen demo proving that owning the power-electronics layer lets an AI data
center run more compute than its grid connection allows, with Claude Opus 4.8 making and explaining
the economic dispatch decisions live. Deliverables: a written BRIEF, an explicit scoring RUBRIC, and
a live URL on AWS Amplify with inference through Claude Platform on AWS (native Anthropic Messages
API — not Bedrock).

## Approach — a dynamic multi-agent workflow

The work was decomposed into phases; two of them fanned out to parallel sub-agents.

### 1. Brief & rubric first (before any code)
`BRIEF.md` (problem, who it's for, what UpGrid is, the demo definition of done) and `RUBRIC.md`
(eight PASS/FAIL criteria R1–R8, doubling as the verification checklist) were written and committed
**before** writing application code, along with `README.md`, `amplify.yml`, `.gitignore`, and a
names-only `.env.example`. → commit `ef9bab5`.

### 2. Design exploration (parallel agents → reviewer)
Four agents each explored a distinct visual direction in parallel — *Substation Console* (dark
SCADA/HMI), *Editorial energy report*, *Blueprint/schematic*, and *Lab instrument/oscilloscope*. A
review agent scored each against the rubric (glance-readability for a non-technical judge,
operator credibility, accessibility, distinctiveness) and selected a winner: **Substation Console
(Annunciator Edition)**, 36/40 — strongest on readability and accessibility. It returned a complete,
ready-to-implement spec (CSS tokens, IBM Plex type, chart treatment, the five non-color channels that
encode breach-vs-flat).

### 3. Build
Vite + React + TypeScript SPA implementing the technical contract: a `useSimulation` hook (700 ms
tick, two ~40-sample kW traces, QoS/SoC, capped decision log, revenue, three perturbations), a
`GridTrace` SVG chart with a shared 5.2 MW datum and a diagonal-hatch breach band, and a server-side
Lambda that POSTs to the Claude Platform on AWS native Messages API (`/v1/messages`, `x-api-key`,
`anthropic-version`) with the model id in a single `MODEL_ID` constant. Emulated fallback mirrors the
model's rule set so the demo never depends on the network. → commit `7084abc`.

### 4. Adversarial verification (one agent per rubric criterion)
Eight skeptical verifiers, each in a clean context, independently checked one rubric criterion
(R1–R8) against the real repo and tried to make it fail. All eight passed; one proactive R5
strengthening (a live price-multiplier chip on both system panels) was added afterward. A
local logic harness also exercised the decision/parse/job code with ~5,000 assertions.

---

## Ship & deploy

- **GitHub:** committed and pushed to `main`.
- **README** swapped to the Build Day submission version (`cd7f16a`); project renamed to
  **UpGrid — DC Native Compute Orchestrator** across the UI, docs, and package metadata (`82aa144`).
- **AWS (us-east-2):** deployed a minimal-IAM Lambda (`upgrid-inference`) that reaches Claude Platform
  on AWS and returns real Opus 4.8 decisions. The account's org guardrail blocks anonymous public
  **Lambda Function URLs** (403), so — rather than circumvent a security control — the browser front
  door is a public **API Gateway HTTP API** in front of the Lambda. `VITE_INFERENCE_URL` (the API URL)
  is set on the Amplify app; the workspace key and id live only in the Lambda environment. Live tests
  returned genuine Opus 4.8 rationales (accept / defer / shed / battery), e.g. an SLA job held on the
  DC battery when grid headroom was short. → `a044b0f`.

## Fixes from real-browser testing

Loading the deployed site in a browser surfaced issues that static review had missed:

- **Decision log empty / revenue $0 (demo-critical).** Root cause: the per-tick decision context was
  assigned **inside** a `setState` updater and read immediately after the `setState()` call — but
  React doesn't run the updater synchronously, so the value was always null and the decision never
  fired. Fixed by computing the context from the latest snapshot and calling the decision **directly**,
  outside the updater. Verified in-browser: the log streams ACCEPT/DEFER/SHED/BATTERY with rationales
  and the revenue + "% UpGrid" delta move. → `7e9c0f1`.
- **Sleepy nominal state.** Added an auto-demo scheduler: a demand spike fires ~2.5 s after load and
  recurs, so the baseline visibly breaches the 5.2 MW envelope (QoS dips into the 80s and recovers)
  while UpGrid holds flat — no button press needed.
- **Reliability:** Emulated made the default (the log always populates), a 12 s timeout added to the
  Live call so a slow backend can't stall the in-flight guard, and a dropped word in the UpGrid
  caption fixed. → `dd3eb1b`.

## UI refinements

- Control bar moved **above the charts**; page heading and description enlarged. → `f0c7f57`.
- Decision Log moved to a **full-height right sidebar**, then made **sticky and internally
  scrollable** (viewport-tall; the log scrolls on its own instead of growing the page; collapses to a
  stacked, bounded panel below 1040 px). → `ece3308`, `762668e`.

---

## Commit history

| Commit | Summary |
| ------ | ------- |
| `ef9bab5` | docs: BRIEF, RUBRIC, README, amplify.yml, env hygiene (before any code) |
| `7084abc` | feat: split-screen demo, Lambda inference, design + verification passes |
| `a044b0f` | docs: live deployment notes (API Gateway front, required workspace id) |
| `cd7f16a` | docs: replace README with Build Day submission version |
| `82aa144` | chore: rename to UpGrid — DC Native Compute Orchestrator |
| `dd3eb1b` | fix: auto-spike + visible breach, Emulated default, Live timeout, caption |
| `7e9c0f1` | fix: actually fire economic decisions every tick (log + revenue populate) |
| `f0c7f57` | ui: move control bar above the charts; enlarge heading + description |
| `ece3308` | ui: Decision Log as a full-height right sidebar |
| `762668e` | ui: Decision Log sticky, internally-scrollable right sidebar |

## Notes on secrets

The workspace API key was handled server-side only: never printed back, never committed; written once
to a `chmod 600` temp file, fed to AWS via a file (off the command line), verified by variable
**names** only, and the deployed JS bundle confirmed free of the key/workspace id. The key supplied
during the session is short-lived; once it expires, Live calls fall back to Emulated automatically and
the site keeps working. `.gitignore` excludes all `.env*` except the names-only `.env.example`.

## Architecture in one line

Hardware control of the cabinet is deterministic; Claude Opus 4.8 is the economic layer only and never
controls hardware. The browser calls API Gateway → Lambda → Claude Platform on AWS; the key lives only
in the Lambda environment.
