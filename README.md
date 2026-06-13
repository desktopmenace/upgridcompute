# UpGrid — Compute Orchestrator

A deployed, split-screen demo: the **same demand event** hits a software-only baseline and an
**UpGrid** SST+BESS cabinet. The baseline breaches the 5.2 MW grid envelope; UpGrid stays flat. And
**Claude Opus 4.8** narrates the economic accept / defer / shed / battery decisions live, citing the
real bid, headroom, state-of-charge, and price multiplier on every job.

Read [BRIEF.md](BRIEF.md) for the problem and product, and [RUBRIC.md](RUBRIC.md) for the scoring
criteria (which double as the verification checklist).

> **Architecture in one line:** Hardware control of the cabinet is *deterministic*; Claude Opus 4.8
> is the *economic layer only* and never controls hardware. The browser calls a server-side Lambda;
> the Lambda calls Claude Platform on AWS. The API key lives only in the Lambda's environment.

---

## Stack

| Layer       | Choice                                                                              |
| ----------- | ----------------------------------------------------------------------------------- |
| Frontend    | Vite + React + TypeScript, single-page app                                          |
| Hosting     | AWS Amplify Hosting, building from GitHub (`amplify.yml`, artifact `dist`)           |
| Inference   | AWS Lambda (Function URL) → **Claude Platform on AWS** native Messages API           |
| Model       | Claude **Opus 4.8** (`claude-opus-4-8`) — one-line constant `MODEL_ID` in the Lambda |

**Claude Platform on AWS is not Amazon Bedrock.** This calls the *native* Anthropic Messages API
shape (`POST /v1/messages`) at the regional endpoint `https://aws-external-anthropic.<region>.api.aws`,
authenticated with the workspace key in the `x-api-key` header. It is **not** Bedrock and **not**
`InvokeModel`, and the model id carries **no** `anthropic.` prefix.

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173  — runs in Emulated mode out of the box
```

```bash
npm run build    # production build → dist/
npm run preview  # serve the built dist/ locally
npm run typecheck # tsc --noEmit (optional; the production build does not gate on types)
```

With no `VITE_INFERENCE_URL` set, the app runs entirely in **Emulated** mode — a local deterministic
decision function with the same rule set as the model. No backend or key is required to see the full
demo. Flip the **Live / Emulated** toggle to Live once a Lambda URL is wired up (below).

---

## The Lambda + Claude Platform on AWS

Source: [`lambda/index.mjs`](lambda/index.mjs). Node.js 20+ runtime (uses the built-in global
`fetch`), zero npm dependencies. The browser POSTs the live simulation state to the Lambda; the
Lambda forwards a Messages API request to Claude Platform on AWS and returns the parsed
`{ action, reason }` decision. The browser never sees the endpoint or the key.

**What it does:**

1. Accepts a JSON body: `{ job, envelopeKw, committedKw, headroomKw, dcSoc, peakWindow, priceMult }`.
2. Builds a Messages API request for `MODEL_ID` (`claude-opus-4-8`) with a system prompt encoding the
   economic decision rule, and `max_tokens: 4096`.
3. POSTs to `https://aws-external-anthropic.${region}/v1/messages` with headers `x-api-key`,
   `anthropic-version: 2023-06-01`, `content-type: application/json`.
4. Parses the model's raw-JSON reply defensively and returns `{ action, reason, source: "live" }`.
5. Handles CORS preflight so the browser Function URL call works.

The model id is a single, clearly-commented constant at the top of the file:

```js
// === MODEL: one-line change. Confirm this id is in your workspace's model list. ===
const MODEL_ID = "claude-opus-4-8"; // Claude Opus 4.8
```

> **Confirm the exact id** is available in your workspace via the Models API
> (`GET /v1/models`) or the Console model list before going live. If your workspace pins a different
> Opus 4.8 string, change this one line.

### Deploy the Lambda (Function URL)

You can deploy the function any way you like (console, SAM, CDK). Minimal console path:

1. **Lambda → Create function** → Author from scratch → Runtime **Node.js 20.x** (or later).
2. Paste the contents of `lambda/index.mjs` as the handler (`index.mjs`, handler `index.handler`).
3. **Configuration → Function URL → Create** → Auth type **NONE** (the function holds no secret the
   caller could abuse beyond the model call; restrict via CORS / throttling as needed).
4. **Configuration → Environment variables** → set the variables in the table below.
5. Copy the Function URL — you'll set it as `VITE_INFERENCE_URL` on the Amplify app.

---

## Environment variables

| Variable                | Where it's set            | Secret? | Purpose                                                                 |
| ----------------------- | ------------------------- | ------- | ---------------------------------------------------------------------- |
| `VITE_INFERENCE_URL`    | Amplify app (build env)   | No      | Lambda Function URL the browser POSTs to. Unset → Emulated mode.        |
| `ANTHROPIC_AWS_API_KEY` | **Lambda only**           | **YES** | Workspace key, sent as `x-api-key`. Never in the browser or repo.       |
| `CLAUDE_AWS_REGION`     | Lambda                    | No      | Workspace region. **us-east-2** (US East / Ohio).                       |
| `AWS_REGION`            | Lambda (usually preset)   | No      | Fallback region if `CLAUDE_AWS_REGION` is unset.                        |
| `ANTHROPIC_WORKSPACE_ID`| Lambda (if required)      | No      | Workspace id, if the endpoint requires it (short-term keys are usually workspace-scoped). |

**The key is never in the repo.** `.gitignore` excludes all `.env*` files except
[`.env.example`](.env.example), which lists variable **names only**. The browser bundle contains only
`VITE_INFERENCE_URL`.

---

## Deploy on AWS Amplify Hosting (GitHub → Amplify)

1. Push this repo to GitHub on `main` (see the project handoff notes / `git` commands).
2. **AWS Amplify → Hosting → New app → Deploy from GitHub** → authorize GitHub → pick this repo and
   the `main` branch.
3. Amplify auto-detects `amplify.yml`. Confirm build settings: build command `npm run build`,
   artifact base directory `dist`.
4. **App settings → Environment variables** → add `VITE_INFERENCE_URL` = your Lambda Function URL.
   (Leave it blank to ship the demo in Emulated mode first; add it later to enable Live.)
5. **Save and deploy.** Amplify builds the Vite app and serves `dist/` at the app URL.
6. Open the live URL, flip the toggle to **Live**, and trigger a decision — the rationale shown is the
   real Opus 4.8 output.

The Anthropic key is configured on the **Lambda**, not on Amplify. The two are wired together only by
the public Function URL in `VITE_INFERENCE_URL`.

---

## How the simulation works

- A `setInterval` (~700 ms) advances both systems each tick. The latest state is mirrored in a ref so
  the interval closure always reads current values; the interval is cleared on pause/unmount.
- Each tick computes a wandering base demand (sine + bounded noise) plus any active spike. The
  **baseline** AC trace overshoots the 5200 kW envelope during spikes; the **UpGrid** AC trace is
  clamped at/below the envelope (the cabinet buffers the transient on the DC bus).
- Roughly every third tick a job is spawned and Opus 4.8 (or the Emulated fallback) decides
  accept / defer / shed / battery, with a one-sentence rationale that drives the decision log and
  revenue. Calls are async, throttled to one in flight at a time, and never block the UI.
- Revenue is `bid × priceMult × (kW/1000) × durationHours`; UpGrid captures full value unless it
  sheds, the baseline captures a discounted value and loses sheddable jobs during spikes. Values
  never go negative; SoC and QoS clamp; the log caps at ~40 entries.

> Simulation only. Hardware control is deterministic; Opus 4.8 is on the economic layer only. The
> cabinet ships to a 5.2 MW site in July.
