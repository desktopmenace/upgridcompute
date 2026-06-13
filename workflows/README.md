# Orchestration workflows

The two dynamic multi-agent workflow scripts used to build this project. They are written for the
Claude Code **Workflow** runner (`agent()` / `parallel()` to fan out sub-agents, JSON-schema
structured outputs). They're committed here for transparency — they are not part of the app build.

- [`design-exploration.workflow.js`](design-exploration.workflow.js) — fans out 4 sub-agents, each
  proposing one distinct visual direction as a structured spec, then a reviewer agent scores all four
  against the rubric and returns the winning, ready-to-implement design spec.
- [`adversarial-verify.workflow.js`](adversarial-verify.workflow.js) — fans out 8 skeptical verifier
  agents, one per rubric criterion (R1–R8), each in a clean context, each trying to make its criterion
  FAIL and returning a structured verdict + evidence + fixes.

See [`../BRIEF.md`](../BRIEF.md), [`../RUBRIC.md`](../RUBRIC.md), and [`../session-log.md`](../session-log.md).
