# UpGrid — Compute Orchestrator

A live demo showing why owning the power-electronics layer lets an AI data center run more compute than its grid connection allows — with Claude Opus 4.8 making and explaining the economic dispatch decisions in real time.

Built for the Claude Fable 5 Build Day. Hosted on AWS Amplify; inference runs through Claude Platform on AWS (Anthropic's native Messages API, accessed via the AWS account).

---

## What this is

A browser-based simulation that demonstrates the core thesis behind ChargeWheel's UpGrid platform: in AI data centers, the binding constraint is no longer chips, it's grid power. Utility interconnection upgrades take years, so the operators who win are the ones who can run more compute behind the power they already have. UpGrid does this by integrating a solid-state transformer and battery storage into one cabinet, then letting an AI agent decide how to spend that scarce power profitably.

## Why it's needed

The advantage UpGrid claims is physical, and therefore hard to show on a slide. A software-only competitor can also "orchestrate compute and batteries," so the differentiation isn't obvious until you can see two systems respond to the same event and diverge. The demo exists to make that divergence visible and undeniable — and to prove the AI layer is doing real reasoning, not following a script, by letting anyone perturb the scenario live.

## How it works

The simulation runs two systems side by side against one shared stream of electricity demand and incoming compute jobs.

The first is a software-only orchestrator — the kind of system that manages power equipment it doesn't own. It can only react to demand surges at the grid meter, and only as fast as third-party hardware allows, so when a transient hits, its power draw briefly breaches the site's interconnection limit and service quality dips.

The second is UpGrid. Because it owns the integrated transformer-plus-battery stack, it absorbs the same surge on its internal DC bus before the grid ever registers it. The grid sees a flat line; nothing breaches.

Sitting on top of UpGrid is the economic layer, powered by Claude Opus 4.8. Every time a new compute job arrives, the model is given the live state of the site — what the job pays, how much power headroom remains, how full the battery is, and whether energy is currently in a premium-price window — and decides whether to accept it, defer it, shed it, or hold it on battery. It returns a one-sentence rationale for every decision, so the result is an auditable log a customer or utility could actually read, not a black box.

A clear division of responsibility runs through the whole thing: the hard, safety-critical control (keeping the site inside its power envelope) is deterministic, while the model is confined to the economic judgment of how to make the most money inside that envelope. The model never controls hardware.

## The outcome

Watching it run, you see the two systems start identical and split apart the moment stress is applied: the baseline overshoots its limit and loses jobs it couldn't physically protect, while UpGrid stays flat and Opus 4.8 visibly reasons about which jobs to keep, defer, or drop — and explains why, in plain language. A running revenue tally shows UpGrid capturing more value from the same power, and three live controls let anyone inject a demand spike, a price surge, or a battery fault to confirm the agent is responding to real conditions rather than a canned demo.

The takeaway: the orchestration software is the visible part, but the moat is the hardware underneath it — and the AI is what turns that hardware advantage into dollars, legibly enough to put in front of a customer.

---

## Architecture

| Layer | Role |
| :---- | :---- |
| React \+ Vite frontend | Runs the two-system simulation, the live charts, the decision log, and the perturbation controls entirely in the browser. |
| AWS Lambda | Server-side proxy that holds the credential and forwards each decision request to Claude. The browser never talks to the model directly and never sees the key. |
| Claude Platform on AWS | Anthropic's native Messages API, reached through the AWS account at the regional endpoint. Returns the accept/defer/shed/battery decision and its rationale. |
| AWS Amplify Hosting | Builds the app from this GitHub repo on push and serves the live URL. |

The deterministic simulation (power envelope, battery state, revenue) lives entirely in the frontend. Only the economic decisions are delegated to the model, and only through the Lambda.

## Live vs. Emulated mode

The app has a visible toggle between two modes:

- **Live · Opus 4.8** — each decision is a real call to Claude Opus 4.8 through the Lambda. The rationale shown is the model's own output.  
- **Emulated** — a local, deterministic decision function using the same rule set. No backend or key required.

Emulated mode is the demo-safe default: it guarantees the simulation runs even with no network. Live mode is for showing genuine model reasoning when connectivity is reliable.

## Running locally

1. Install dependencies and start the dev server (`npm install`, then `npm run dev`).  
2. The app runs immediately in **Emulated** mode with no further setup.  
3. To exercise **Live** mode locally, provide the environment variables below to the Lambda/dev backend (see `.env.example` for the variable names — values are never committed).

## Environment variables

These are set in the AWS Amplify console (or your local backend env). See `.env.example` for names only.

| Variable | Purpose |
| :---- | :---- |
| `ANTHROPIC_AWS_API_KEY` | Workspace API key for Claude Platform on AWS. Supplied separately; lives only in the Lambda environment. |
| `CLAUDE_AWS_REGION` | Region of the Claude Platform on AWS workspace  |
| `ANTHROPIC_WORKSPACE_ID` | Workspace identifier, if required by the endpoint/SDK. |

The model id is kept in a single `MODEL_ID` constant (default `claude-opus-4-8`). Confirm that id appears in your workspace's model list before relying on Live mode; if not, change the one constant to the current Opus build.

## Deploying to AWS Amplify

1. **Amplify Hosting → New app → connect this GitHub repo and branch.** The GitHub authorization happens in the console.  
2. **Confirm build settings** match `amplify.yml`   
3. **Set environment variables** on the app/function: `ANTHROPIC_AWS_API_KEY` (pasted in the console), `CLAUDE_AWS_REGION`, and `ANTHROPIC_WORKSPACE_ID` if needed.  
4. **Deploy**, then confirm a Live-mode decision returns a real Opus 4.8 rationale.

## Security

The credential exists only as a Lambda environment variable — never in the browser, never in the repository. A `.gitignore` excludes local env files and a `.env.example` documents variable names without values. The frontend reaches the model solely through the Lambda proxy.

## A note on the simulation

The numbers are illustrative and the scenario is simulated. The hardware control is deterministic, as it is in the real cabinet; Claude Opus 4.8 is on the economic layer only.
