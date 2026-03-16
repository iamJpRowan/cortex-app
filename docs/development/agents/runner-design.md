[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Runner Design

# Runner Design

This document captures requirements and constraints for the agent runner — the script responsible for autonomously executing development work on behalf of the user.

The goal is that Jp's involvement is not required until it is time to review a built feature and refine its UI.

---

## Core Requirements

### Isolation from Design Work
- Agent work must not conflict with design work being committed to the same repo
- The runner operates in an isolated environment; design commits on `main` never collide with in-progress agent branches

### Handoff to Human
- When a unit of work is complete, the runner must produce a working environment for Jp to test in
- The handoff must include clear, specific steps for how to run and test the feature
- Jp should be able to pick up the work without reading agent session logs or backlog docs

### Ejecting Abandoned Work
- When design requirements lead the build astray, Jp needs a simple, low-friction way to discard the work entirely
- Ejecting should be a single command or a clearly documented 2–3 step process
- No leftover branches, beads tasks, or state should require manual cleanup

---

## Cost Optimization Approach

The runner spawns many Claude Code sessions (20+/day). Token cost is the primary ongoing expense.

### Model
- Use **Sonnet** as the default model. Haiku is too unreliable for mixed-complexity tasks; Opus is unnecessary for routine implementation work.
- Expose a `--model` flag to override per-run for experimentation.

### Prompt Caching
- Claude Code caches input tokens automatically when the same content appears at the start of consecutive API calls.
- To maximize cache hits across sessions, the static portion of every agent prompt (project context, workflow instructions, constraints) must be front-loaded and kept identical across all invocations.
- Dynamic content (task ID, title, description) should appear at the end of the prompt, after the stable preamble.
- Pre-loading shared context files (AGENTS.md, relevant workflow docs) into the prompt preamble — rather than relying on each agent to discover and read them — reduces redundant file reads and increases cache hit rate.

### Billing
- Use **API billing** (not Pro subscription) at this usage volume. Pro rate limits will throttle a 20+/day session workflow. API gives predictable per-token costs with caching discounts applied automatically.

---

## Open Questions

- What is the right unit of work for a single agent session? (current assumption: one Beads task)
- Should the runner support parallel sessions, or always serial?
- How should the runner surface errors to Jp without requiring him to watch logs?
- What triggers the eject workflow — a CLI flag, a file, a Beads status?
