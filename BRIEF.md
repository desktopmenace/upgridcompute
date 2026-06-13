# UpGrid — Compute Orchestrator · BRIEF

> Hackathon submission. This file is written **first**, before any code, and committed before the app.

## The problem

AI data centers are no longer bottlenecked by chips. They are bottlenecked by **grid
interconnection**. A new high-density AI campus can wait **multiple years** in the utility
interconnection queue before it is allowed to pull its contracted megawatts. The silicon is on the
dock; the substation upgrade is not.

Operators try to live inside their interconnection envelope with **software-only orchestrators** —
schedulers that throttle compute at the AC meter. But software does not own the power hardware. It
can only react over **seconds to minutes**, and it reacts at the meter, which means the grid has
*already seen* the transient. A training job that ramps 1.8 MW in a few hundred milliseconds blows
straight through the envelope before any scheduler can defer a job. The result is breached
interconnect agreements, demand-charge penalties, curtailment, and lost revenue on exactly the
high-value jobs the operator most wanted to run.

## Who it's for

**AI compute operators and data-center developers** sitting in multi-year interconnection queues who
need to run more compute *now*, inside a fixed grid envelope, without breaching it.

## What UpGrid is

UpGrid is an **integrated solid-state transformer + battery (SST + BESS) cabinet** that sits between
the grid and the compute hall. Because it owns the power hardware, it buffers demand transients on
the **DC bus in milliseconds** — *before the grid ever sees them*. The AC draw the utility meters
stays flat under the interconnection envelope even while compute demand spikes.

Hardware control of the cabinet is **deterministic** and safety-rated. It is not, and never will be,
controlled by a language model.

On top of that deterministic hardware sits the part that needs judgment: the **economics**. Which
compute jobs do we accept right now? Which do we defer to a cheaper window? Which premium SLA jobs do
we protect by holding them on battery when the grid is momentarily short? Which low-value spot jobs
do we shed when there's genuinely no headroom and the battery is low? Every one of those is a
dollars-and-cents decision against live bids, headroom, state-of-charge, and price multipliers — and
it has to come with an **auditable rationale** an operator can defend to a CFO and a utility.

That economic layer is **Claude Opus 4.8**, called server-side, deciding accept / defer / shed /
battery on each job and writing one sentence of reasoning that cites the actual numbers.

## The demo (what "done" looks like)

A deployed, single-page **split-screen** demo:

- The **same demand event** hits two systems side by side — a **software-only baseline** and
  **UpGrid**.
- When a demand spike fires, the baseline's AC trace **breaches the 5.2 MW envelope** (visible,
  alarming). UpGrid's AC trace **stays flat** under the envelope — the cabinet absorbed the transient
  on the DC bus.
- **Claude Opus 4.8 narrates the economic decisions live**, one job at a time, each with a rationale
  that cites the real bid, headroom, state-of-charge, and price multiplier.
- The divergence is **instantly readable to a non-technical judge**: one chart breaches, one doesn't;
  one system loses revenue, one captures it.

The cabinet ships to a real **5.2 MW site in July**.

## Why this framing wins

- It reframes the bottleneck from a chip story (crowded) to a **grid-interconnection** story (the
  real constraint).
- It draws a hard line: **hardware control is deterministic; the model is the economic layer only.**
  That is the responsible, defensible architecture — and it's exactly where an LLM adds value
  (judgment + auditable narration), not where it would be dangerous (real-time power control).
- The split-screen makes an invisible millisecond-scale physics advantage **visible and economic** in
  one glance.

See [RUBRIC.md](RUBRIC.md) for the scoring criteria this submission is judged against, and
[README.md](README.md) for how to run and deploy it.
