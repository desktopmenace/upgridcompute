# How I orchestrated Claude's work

I directed Claude with a **rubric-as-contract, spec-first** strategy and two **dynamic multi-agent
pipelines**, then an **iteration loop grounded in real-browser evidence**.

- **Spec first.** Before any code, I had Claude write the [BRIEF](BRIEF.md) and a [RUBRIC](RUBRIC.md)
  of eight PASS/FAIL criteria (R1–R8) and commit them — the rubric doubled as the acceptance test for
  everything downstream.

- **Multi-agent design pipeline.** A fan-out workflow ran 4 sub-agents in parallel, each proposing a
  distinct visual direction as structured output, then a reviewer agent scored them against the rubric
  and returned a single ready-to-implement spec (winner: a SCADA "Substation Console" look). Script:
  [workflows/design-exploration.workflow.js](workflows/design-exploration.workflow.js).

- **Adversarial verifier agents.** After the build, a second workflow fanned out **8 skeptical
  verifiers — one per rubric criterion, each in a clean context** — each trying to make its criterion
  *fail* and returning a structured verdict + evidence + fixes. Script:
  [workflows/adversarial-verify.workflow.js](workflows/adversarial-verify.workflow.js).

- **Iteration loop with real verification.** I didn't trust "it compiles." Claude ran a
  ~5,000-assertion logic harness, then loaded the *deployed* site in a browser — which caught a
  demo-critical bug static review missed (a React `setState`-updater pitfall meant decisions never
  fired) and drove the fix, then redeployed.

- **Custom scaffolding.** I had Claude pull a Claude API reference skill to pin the exact model id
  (`claude-opus-4-8`) and the native Messages API shape before writing the inference Lambda; the two
  Workflow scripts above were the orchestration scaffolding; and a strict secret-handling discipline
  (key only ever in the Lambda env, never printed or committed) ran throughout. Claude also drove the
  AWS deploy end-to-end via CLI (Lambda → Claude Platform on AWS, fronted by API Gateway because the
  org blocks public Lambda Function URLs) and AWS Amplify Hosting.

Full play-by-play: [session-log.md](session-log.md).
