[Docs](../README.md) / Product

# Product

This directory holds documentation that drives the design and development of the Cortex App forward.  For visual/UI design (tokens, components, accessibility), see [Design](../development/design/README.md).

## [Milestones](./milestones/README.md) 
Milestones are larger goals that group related backlog items. Each milestone file describes a target capability, the stories needed to achieve it, and their delivery order. ([TEMPLATE](./milestones/TEMPLATE.milestone.md))

**Processes:**
- [Plan Milestone](../agents/plan-milestone.md) — Define a target capability as a milestone and map it to stories (`/plan-milestone`)

## [Backlog](./backlog/README.md)
The backlog contains the units of work for building. See [How we work](../agents/README.md) for the full lifecycle and workflows.
- **Stories** - Are the most common unit of work and used to describe a fully functional and testable iteration of the app. ([TEMPLATE](./backlog/TEMPLATE.story.md))
- **Tasks** - Are used for breaking stories down into units that an agent can work autonomously with all the needed context to do so ([TEMPLATE](./backlog/TEMPLATE.task.md))

**Processes:**
- [Create Story](../agents/create-story.md) — Scaffold a new `planned` story in the backlog (`/create-story`)
- [Refine Backlog Item](../agents/refine-backlog-item.md) — Refine a `planned` story to `refined` (ready for decomposition)
- [Decompose Backlog Item](../agents/decompose-backlog-item.md) — Decompose a `refined` story into child stories or task files
- [Work Backlog Item](../agents/work-backlog-item.md) — Implement all tasks in a story
- [Backlog Grooming](../agents/backlog-grooming.md) — Evaluate relevance, clarify, abandon, or archive backlog items

## [Devlogs](./devlogs/README.md)
Devlogs capture what happened during implementation — decisions made, tradeoffs, and outcomes. Each devlog is written during or after a leaf story's branch and linked from that story's `devlogs` field.

**Processes:**
- [Work Backlog Item](../agents/work-backlog-item.md) — Creates and appends to the devlog as implementation progresses
- [Create PR Message](../agents/create-pr-message.md) — Reads the devlog to write the PR body and test steps

## See also
- [How we work](../agents/README.md) — Backlog lifecycle and development loop
- [Design](../development/design/README.md) — Visual system and UI patterns
