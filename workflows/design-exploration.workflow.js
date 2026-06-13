export const meta = {
  name: 'upgrid-design-exploration',
  description: 'Explore 4 distinct visual directions for the UpGrid demo and pick a winner against the rubric',
  phases: [
    { title: 'Explore', detail: '4 parallel agents, one distinct visual direction each' },
    { title: 'Review', detail: 'one reviewer scores against the rubric and returns the winning spec' },
  ],
}

const CONTEXT = `
PRODUCT: "UpGrid — Compute Orchestrator", a hackathon demo SPA (Vite + React).
It is a SPLIT-SCREEN demo. The SAME demand event hits two systems side by side:
  (1) a software-only BASELINE whose AC power trace BREACHES a 5.2 MW (5200 kW) grid envelope during a spike, and
  (2) UpGrid (the HERO), an SST+BESS cabinet whose AC trace stays FLAT under the envelope because it buffers transients on a DC bus.
Claude Opus 4.8 narrates economic decisions (ACCEPT / DEFER / SHED / BATTERY) live, one job at a time, each with a one-sentence rationale.

UI SURFACES TO STYLE:
- Header (product name + tagline).
- Two GridTrace SVG line charts side by side: a power trace polyline, a dashed line at the 5.2 MW envelope, a status pill "WITHIN ENVELOPE" (good) / "ENVELOPE BREACH" (alarm). Baseline breaches; UpGrid is flat. This divergence is the CENTERPIECE and must be instantly readable to a NON-TECHNICAL judge.
- Two system metric panels: Baseline (QoS %, 3rd-party SoC %, "~min" response) and UpGrid the hero (QoS 100%, DC-bus SoC %, "~ms" response), each with a one-line mechanism caption.
- Revenue panel: UpGrid vs software-only + delta %.
- Decision log panel (scrollable, ~280px tall): each row a colored tag ACCEPT/DEFER/SHED/BATTERY/EVENT + a rationale sentence + a small Live/Emulated source marker.
- Control bar: Run/Pause; three perturbation buttons (Demand spike, Price window, Battery fault); active-event label; a Live·Opus 4.8 / Emulated toggle.
- Footer disclaimer.

HARD CONSTRAINTS (from the rubric):
- The baseline-breaches / UpGrid-flat divergence must be obvious at a glance (color-code breach vs within; UpGrid is visually the winner).
- Accessibility: visible keyboard focus, prefers-reduced-motion support, responsive single-column reflow at narrow widths. So motion must be optional and color must not be the ONLY signal (pair color with text/shape).
- It must read as credible to data-center / energy operators AND legible to a non-technical judge.
AVOID generic AI-slop aesthetics: no Inter/Roboto/Arial/system-default body font as the design identity, no purple-gradient-on-dark cliché, no cookie-cutter card-grid with no point of view.
`

const DIRECTIONS = [
  { key: 'control-room', brief: 'A dark grid OPERATIONS / SCADA control-room console. High-contrast, instrument-dense, confident. Lean into a power-grid command-center feel. Pick a real accent system (e.g. an electric signal color for "within", a hot alarm color for "breach") and a crisp monospaced numeric typeface for readouts paired with a strong non-default sans for labels.' },
  { key: 'editorial-energy', brief: 'A LIGHT, editorial "energy intelligence" report aesthetic — like a beautifully typeset infrastructure briefing. Warm but precise. Strong typographic hierarchy with a distinctive display face. Must keep the breach/within divergence loud despite the lighter palette. Avoid the overused cream + generic-serif cliché unless you make it genuinely distinctive and justify it.' },
  { key: 'blueprint-schematic', brief: 'An engineering BLUEPRINT / single-line-diagram aesthetic: technical grid paper, schematic line-art, measured. Cyan/amber on deep navy or a true blueprint blue. Charts feel like instrument plots on graph paper. Conveys "this is real hardware engineering," not a SaaS dashboard.' },
  { key: 'lab-instrument', brief: 'A power-electronics LAB INSTRUMENT / oscilloscope aesthetic: phosphor traces on a dark scope face, lab-bench typography, calibrated readouts. The two charts read like two scope channels — one clipping past a limit line, one held flat. Phosphor glow must degrade gracefully under prefers-reduced-motion.' },
]

const SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name','concept','rationale','palette','typography','chart','tags','status','layout','motion','accessibilityNotes','riskOfGeneric'],
  properties: {
    name: { type: 'string', description: 'Short evocative name for this visual direction' },
    concept: { type: 'string', description: '2-3 sentence description of the look and feel' },
    rationale: { type: 'string', description: 'Why this fits the brief and the non-technical-judge readability requirement' },
    palette: {
      type: 'object', additionalProperties: false,
      required: ['bg','surface','surfaceAlt','border','textPrimary','textMuted','accent','within','breach','hero','warning'],
      properties: {
        bg: { type: 'string' }, surface: { type: 'string' }, surfaceAlt: { type: 'string' }, border: { type: 'string' },
        textPrimary: { type: 'string' }, textMuted: { type: 'string' }, accent: { type: 'string' },
        within: { type: 'string', description: 'hex for the WITHIN-ENVELOPE / good state' },
        breach: { type: 'string', description: 'hex for the ENVELOPE-BREACH / alarm state' },
        hero: { type: 'string', description: 'hex accent for the UpGrid hero system' },
        warning: { type: 'string' },
      },
    },
    typography: {
      type: 'object', additionalProperties: false,
      required: ['displayFont','bodyFont','monoFont','fontImport','scaleNotes'],
      properties: {
        displayFont: { type: 'string', description: 'CSS font-family stack for headings' },
        bodyFont: { type: 'string', description: 'CSS font-family stack for body' },
        monoFont: { type: 'string', description: 'CSS font-family stack for numeric readouts' },
        fontImport: { type: 'string', description: 'How to load fonts (e.g. a Google Fonts <link> URL, or "system stack, no import"). Prefer web-safe or Google Fonts.' },
        scaleNotes: { type: 'string' },
      },
    },
    chart: {
      type: 'object', additionalProperties: false,
      required: ['traceStyle','envelopeLineStyle','breachTreatment','flatTreatment','gridStyle','fillStyle'],
      properties: {
        traceStyle: { type: 'string' }, envelopeLineStyle: { type: 'string' }, breachTreatment: { type: 'string' },
        flatTreatment: { type: 'string' }, gridStyle: { type: 'string' }, fillStyle: { type: 'string' },
      },
    },
    tags: { type: 'string', description: 'Color/treatment for the ACCEPT, DEFER, SHED, BATTERY, EVENT decision-log tags (give a hex or rule per tag)' },
    status: { type: 'string', description: 'Treatment of the WITHIN/BREACH status pills beyond color (shape, icon, text) so color is not the only signal' },
    layout: { type: 'string', description: 'Layout structure for desktop and the narrow-width reflow' },
    motion: { type: 'string', description: 'Animations/transitions and the prefers-reduced-motion fallback' },
    accessibilityNotes: { type: 'string', description: 'Focus indicator, contrast, non-color cues' },
    riskOfGeneric: { type: 'string', description: 'Self-critique: how this avoids generic AI-slop aesthetics' },
  },
}

phase('Explore')
const specs = await parallel(DIRECTIONS.map((d) => () =>
  agent(
    `You are a senior product designer. Propose ONE distinct, fully-specified visual direction for this app.\n\n${CONTEXT}\n\nYOUR ASSIGNED DIRECTION (commit to it, make it specific and opinionated, give real hex values and real font stacks):\n${d.brief}\n\nReturn the structured design spec. Be concrete: actual hex codes, actual CSS font-family stacks, and how the breach-vs-flat divergence is encoded with MORE than just color. Optimize for: (a) a non-technical judge instantly seeing baseline-breaches vs UpGrid-flat, (b) credibility to energy/data-center operators, (c) accessibility, (d) NOT looking like generic AI output.`,
    { label: `explore:${d.key}`, phase: 'Explore', schema: SPEC_SCHEMA }
  ).then((s) => (s ? { ...s, key: d.key } : null))
))

const valid = specs.filter(Boolean)
log(`Collected ${valid.length}/4 design directions: ${valid.map((s) => s.key).join(', ')}`)

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores','winnerKey','winnerReason','finalSpec'],
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['key','readability','credibility','accessibility','distinctiveness','total','notes'],
        properties: {
          key: { type: 'string' },
          readability: { type: 'number', description: '0-10: non-technical judge instantly sees breach vs flat' },
          credibility: { type: 'number', description: '0-10: believable to energy/data-center operators' },
          accessibility: { type: 'number', description: '0-10: focus, contrast, non-color cues, reduced-motion, responsive' },
          distinctiveness: { type: 'number', description: '0-10: avoids generic AI-slop' },
          total: { type: 'number' },
          notes: { type: 'string' },
        },
      },
    },
    winnerKey: { type: 'string' },
    winnerReason: { type: 'string' },
    finalSpec: {
      type: 'object',
      additionalProperties: false,
      required: ['name','concept','cssVariables','typography','chartGuidance','tagColors','statusTreatment','layoutGuidance','motionGuidance','implementationNotes'],
      properties: {
        name: { type: 'string' },
        concept: { type: 'string' },
        cssVariables: { type: 'string', description: 'A ready-to-paste :root { --token: value; ... } block with ALL color/spacing/radius tokens needed, using the winner palette (graft the best ideas from runners-up where they clearly improve readability or accessibility).' },
        typography: { type: 'object', additionalProperties: false, required: ['displayFont','bodyFont','monoFont','fontImport'], properties: { displayFont: { type: 'string' }, bodyFont: { type: 'string' }, monoFont: { type: 'string' }, fontImport: { type: 'string' } } },
        chartGuidance: { type: 'string', description: 'Exactly how to draw both GridTrace charts: trace, envelope dashed line, breach treatment, flat treatment, grid, fill, and how the divergence is made obvious beyond color.' },
        tagColors: { type: 'string', description: 'Hex per tag: ACCEPT, DEFER, SHED, BATTERY, EVENT.' },
        statusTreatment: { type: 'string', description: 'WITHIN vs BREACH pill: color + shape/icon/text so color is not the only signal.' },
        layoutGuidance: { type: 'string', description: 'Desktop layout + narrow-width single-column reflow.' },
        motionGuidance: { type: 'string', description: 'Transitions + prefers-reduced-motion fallback.' },
        implementationNotes: { type: 'string', description: 'Any extra concrete guidance for the React/CSS implementer.' },
      },
    },
  },
}

phase('Review')
const review = await agent(
  `You are the design director and a hackathon judge. Score these ${valid.length} visual directions for the UpGrid split-screen demo against the rubric, pick ONE winner, and return a single consolidated, ready-to-implement final spec.\n\n${CONTEXT}\n\nScore each on readability (non-technical judge instantly sees baseline-breach vs UpGrid-flat), credibility (energy/data-center operators), accessibility, and distinctiveness (not generic AI-slop). Then choose the winner and synthesize a FINAL spec: use the winner as the base, but graft in the single best ideas from the runners-up where they clearly improve glance-readability or accessibility. The cssVariables block must be complete and ready to paste (background, surfaces, border, text, accent, within, breach, hero, warning, plus radius/spacing tokens). Prefer Google Fonts or web-safe stacks for fonts.\n\nDIRECTIONS:\n${JSON.stringify(valid, null, 2)}`,
  { label: 'review:judge', phase: 'Review', schema: REVIEW_SCHEMA }
)

return { directions: valid, review }
