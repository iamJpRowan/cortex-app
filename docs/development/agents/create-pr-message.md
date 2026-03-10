[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Create PR message

# Create PR message

**Intent:** When all Beads tasks for a phase epic are closed, produce a PR body with a clear summary and concrete test steps. This workflow is **invoked by the runner** — output the PR body to stdout and nothing else.

## Context

You run in the **runner worktree** on the branch for this phase (`backlog/<slug>-phase-N` or `backlog/<slug>`). The runner captures your stdout and uses it as the PR body when creating the PR.

## Inputs

You will be given:

- **Epic ID** — The Beads epic whose tasks are all closed.
- **Backlog document path** — Path to the backlog item file (e.g. `docs/product/backlog/<slug>.md`).
- **Phase** — The phase number, or `none` for non-phased items.

## Process

1. **Read the backlog item and devlog(s)** — Load the backlog item and the devlog(s) in its `devlogs` frontmatter. Use them to understand what was built and how.

2. **Print the PR body to stdout** — Output a markdown document containing:
   - A short summary (2–3 sentences) of what was built and why.
   - A **"How to test"** section with concrete, numbered steps: how to run the app, where to navigate, what to interact with, and what to expect.
   - Links to the relevant devlog(s).

## Do not

- Change product code, commit files, or modify the backlog item.
- Push or create the PR — the runner does that using your stdout output.
- Write anything to stdout other than the PR body (no preamble, no commentary).
- Work on other backlog items or tasks.

## See also

- [how-we-work](./how-we-work.md) — Full lifecycle and runner description
- [work-backlog-item](./work-backlog-item.md) — How implementation tasks are worked
