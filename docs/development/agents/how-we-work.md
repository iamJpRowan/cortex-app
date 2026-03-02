[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / How we work

# How we work

This document describes the intended development loop so both the user and agents can follow a consistent process.

## The User's Role

1. **Discuss concepts** — Define or refine how the product should work (e.g. connections, permissions, data flow) so they can be implemented cleanly and deliver value. The result is a **trickle-down of documentation**: architecture, user docs, developer guides, and backlog items. Use the [defining-core-concepts](./defining-core-concepts.md) workflow.
2. **Review the roadmap** — Sequence delivery based on your current priorities. Update current focus and the order of work. Use the [roadmap-review](./roadmap-review.md) workflow. No record of when the review occurred is required.
3. **Test and refine at ready to test** — When an item reaches **ready to test**, you take over: test the feature via the UI, refine the UI, and/or refine requirements or success criteria (in which case the item goes back to in progress for rebuild). Only you mark an item **complete** and archive it after you are satisfied.

## The Agent's Role

1. **Implement from roadmap** — Determine what to work on from the [roadmap](../../product/README.md#roadmap) **current focus** unless you specify otherwise. Follow [work-backlog-item](./work-backlog-item.md).
2. **Set ready to test** — When implementation is testable (including enough UI to prove functionality), set status to **ready to test** and hand off to you with a clear summary of what to test and how. Do not mark complete or archive.
3. **Respond to requirement changes** — If you refine requirements or success criteria, update the backlog item, set status back to **in progress**, and continue implementation until it is ready to test again.

## Flow

1. **Concepts** — User defines/refines core concepts → documentation trickles down.
2. **Roadmap** — User reviews and sequences; current focus defines what’s next.
3. **Implement** — Agent works current-focus item(s) until **ready to test** (functionality first, with minimal UI to prove it; then UI iterations happen with you at ready to test).
4. **Ready to test** — User's turn: test via UI, refine UI and/or requirements.
5. **Complete** — User decides when item is complete when satisfied. If user changes requirements, item goes back to **in progress** and the cycle continues.

## See also

- [Agent workflows](./README.md#workflow-based-conversations) — Which workflow to use when
- [Backlog README](../../product/backlog/README.md) — Backlog structure and status definitions
- [Roadmap](../../product/README.md#roadmap) — Current focus and sequence
