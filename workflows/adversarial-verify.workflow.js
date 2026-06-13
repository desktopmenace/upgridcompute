export const meta = {
  name: 'upgrid-adversarial-verify',
  description: 'One skeptical verifier per rubric criterion (R1-R8), clean context, reading the real repo',
  phases: [{ title: 'Verify', detail: 'one independent verifier per rubric criterion' }],
}

const REPO = '/Users/h/upgrid'

const COMMON = `
You are an ADVERSARIAL verifier for a hackathon submission at ${REPO} ("UpGrid — Compute Orchestrator", Vite + React + TS SPA, with an AWS Lambda under lambda/).
Your job is to try to make your assigned rubric criterion FAIL. Be skeptical; default to FAIL if you cannot find concrete evidence of PASS in the actual files.
Read the relevant files yourself with Read/Grep/Glob (e.g. amplify.yml, package.json, index.html, src/**, lambda/index.mjs, BRIEF.md, RUBRIC.md, README.md, .gitignore, .env.example). The build was already run by the orchestrator: dist/ exists and ${REPO}/build.log holds the build output — you MAY read those, but DO NOT run npm install / npm run build / npm run dev / git commit / any mutating command (parallel verifiers share this directory). Static analysis + reading build.log/dist is your tool.
Quote concrete evidence (file + line or snippet). For any failure, give a SPECIFIC, minimal fix (file + what to change). Verdict 'pass', 'fail', or 'warn' (warn = works but a real risk worth noting).
`

const CRITERIA = [
  { key: 'R1', title: 'Builds clean & valid Amplify config', detail: 'Check: build.log shows a clean Vite build (read ${REPO}/build.log and confirm "built in" with no errors); dist/ contains index.html + assets; amplify.yml is valid YAML, runs the Vite build, and sets artifacts.baseDirectory: dist. Also scan src/** for likely runtime console errors (e.g. reading undefined, missing keys on lists, invalid DOM/SVG attributes, effects without cleanup).' },
  { key: 'R2', title: 'Split screen & visible divergence', detail: 'Check: two grid-trace charts render side by side (src/App.tsx, SystemPanel, GridTrace). A dashed line marks 5200 kW on each at the SAME y-pixel (shared scale). On a demand spike the baseline trace exceeds the envelope and shows ENVELOPE BREACH; UpGrid stays at/below and shows WITHIN ENVELOPE. Confirm the simulation math in useSimulation.ts actually makes the baseline breach during a spike (baseAc can exceed 5200) and UpGrid cannot (dcAc clamped <= envelope). Confirm the divergence is encoded beyond color (shape/hatch/pill text).' },
  { key: 'R3', title: 'Real Opus 4.8 via Lambda → Claude Platform on AWS', detail: 'Check lambda/index.mjs: POSTs to https://aws-external-anthropic.<region>.api.aws/v1/messages with x-api-key and anthropic-version headers (NOT Bedrock, NOT InvokeModel, no anthropic. model prefix). MODEL_ID is a single clearly-commented constant defaulting to claude-opus-4-8. Key read from process.env.ANTHROPIC_AWS_API_KEY, never hardcoded/printed. The browser (src/lib/inference.ts) calls only the Lambda URL (VITE_INFERENCE_URL), never the endpoint or key. The displayed rationale in Live mode is the model output. max_tokens present and generous.' },
  { key: 'R4', title: 'Emulated fallback & toggle', detail: 'Check: with no VITE_INFERENCE_URL the app runs fully Emulated (hasLiveBackend()/decideLocal). If a Live call throws, it falls back to decideLocal for that decision and labels it Emulated (useSimulation runDecision try/catch). A visible Live/Emulated toggle exists (ControlBar SourceToggle) and a per-decision/source badge reads "Live · Opus 4.8" or "Emulated".' },
  { key: 'R5', title: 'Perturbations affect both panels; non-blocking async', detail: 'Check useSimulation.ts: demand spike (baseline breaches, UpGrid flat), price window (priceMult rises → revenue/decisions change), battery fault (dcSoc drops sharply AND something visibly changes on the baseline panel too). An in-flight guard (inFlightRef) ensures one decision call at a time. The sim interval keeps advancing during async calls (decision is awaited outside the tick, not blocking setInterval).' },
  { key: 'R6', title: 'Numeric safety & lifecycle', detail: 'Check: revenue for both systems is always >= 0 (Math.max(0, ...)). dcSoc clamps ~6-95, baseSoc clamps to a floor, QoS clamps <= 100. Decision log capped at ~40 (LOG_CAP slice). The setInterval is cleared on unmount/pause (useEffect cleanup returns clearInterval). Look for any path that could push negative revenue, unbounded log, or a leaked timer.' },
  { key: 'R7', title: 'Accessible & responsive', detail: 'Check src/index.css + components: visible :focus-visible ring on interactive controls and the scrollable log; prefers-reduced-motion: reduce disables animations/transitions; layout reflows to one column at narrow widths (media query) with the hero leading. Also check aria-live on status/log, role=img + title/desc on charts, non-color cues, tabular-nums.' },
  { key: 'R8', title: 'Repo & secret hygiene', detail: 'Check: BRIEF.md, RUBRIC.md, README.md, amplify.yml, lambda/ all present. .gitignore excludes .env* (except .env.example) and node_modules/dist. .env.example lists variable NAMES only (no values). Grep the whole tree for any hardcoded secret value of ANTHROPIC_AWS_API_KEY or an x-api-key literal — there must be none. (The repo is committed/pushed by the orchestrator separately; just verify the files exist and are secret-clean.)' },
]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'verdict', 'confidence', 'evidence', 'issues'],
  properties: {
    key: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'fail', 'warn'] },
    confidence: { type: 'number', description: '0-1' },
    evidence: { type: 'string', description: 'Concrete proof from the files (paths + snippets/line refs) supporting the verdict.' },
    issues: {
      type: 'array',
      description: 'Empty if pass. Each is a concrete problem with a minimal fix.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'detail', 'file', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          detail: { type: 'string' },
          file: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

phase('Verify')
const results = await parallel(
  CRITERIA.map((c) => () =>
    agent(
      `${COMMON}\n\nYOUR CRITERION ${c.key} — ${c.title}\n${c.detail}\n\nReturn your structured verdict for ${c.key} only.`,
      { label: `verify:${c.key}`, phase: 'Verify', schema: SCHEMA },
    ).then((r) => (r ? { ...r, title: c.title } : { key: c.key, title: c.title, verdict: 'fail', confidence: 0, evidence: 'verifier returned no result', issues: [] })),
  ),
)

return { results }
