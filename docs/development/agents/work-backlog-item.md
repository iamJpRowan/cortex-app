[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Work a backlog item

# Work a backlog item

**What to work on:** When starting a session, **determine what to work on from `bd ready`** (Beads tasks with no open blockers) unless the user explicitly specifies a different item. Each Beads task links to a backlog item — read the backlog item and its referenced docs for full context. If `bd ready` returns nothing, inform the user (all tasks are blocked on review or the epic is done).

**Autonomous by default.** This workflow assumes the agent is spawned by the runner with no user present. Proceed directly from reading the task to implementing it. Record your approach in the devlog — do not wait for user input. The only required user turn is when a bead is set to `ready to test`.

**Doc as state:** The backlog document and devlogs are the source of truth. Prefer updating the backlog doc and devlog over long chat replies. **Use the backlog item as the manifest of relevant context:** at the start of a session, read the backlog item and the docs it links to — `implements` (concept doc), `devlogs` (devlogs for this item), and `references` or a **References** section (architecture/development/design docs that apply). Load only those linked docs to bound context.

**Status location:** Put **backlog item status** in **YAML frontmatter** at the top of the file. Keep the backlog body lean: status, short "Next" or "Current approach: see devlog …" only. **Approach and decisions** live in the **devlog** (implementation narrative); the backlog is the contract (goal, requirements, success criteria) and manifest (links).

## Objectives

- Fully thought-through solutions with sensible future-proofing.
- Clear record of decisions made and why.
- Context that can easily be shared across many sessions.
- **Consistent, intuitive UI** — Prefer app components so the same actions and concepts are presented the same way. When touching existing UI, consider extracting or adopting app components so we improve consistency over time (see [App Components](../design/app-components.md)).

## When the item includes UI

- **Functionality first, with minimal UI to prove it** — Implement behavior, data, and integration so the feature works end-to-end. Include **enough UI** to exercise and verify it (e.g. minimal screen or panel).
- **Set bead to ready to test** — Once functionality is testable, set the Beads task to `ready to test` via `bd update <id> --status ready_to_test`. The user will test via the UI and refine layout, copy, and components. Expect iterations; only the user closes the bead after testing.
- **Primitives as foundation** — Use shadcn (and AI Elements where relevant) for low-level UI. Design tokens and [UI Guide](../design/ui-guide.md) apply.
- **App components for consistency** — Before adding new UI, **review existing app components** (`src/renderer/src/components/`, excluding `ui/` and `ai-elements/`) and design docs ([design README](../design/README.md), [ui-guide](../design/ui-guide.md), [app-components](../design/app-components.md)). Prefer reusing or extending an app component. If you build bespoke UI, **justify in the devlog**. When you add UI that could be reused elsewhere, note it in the devlog.
- **Improve existing UI when you touch it** — When you **modify** existing views or panels, consider whether this or other screens repeat a pattern that should be an app component. If so: extract or adopt, or document an extraction candidate in the devlog.

## Starting a session

1. **Read the Beads task** — `bd show <id>` for scope and acceptance criteria.
2. **Read the backlog item and linked docs** — the backlog item, its `implements`, `devlogs`, and `references` docs. Load only what's linked to bound context.
3. **Determine your approach** — Based on the task scope, backlog requirements, and existing decisions in devlogs. Treat any decisions or approach already in the devlog as fixed.
4. **Record approach in the devlog** — Create or update a devlog for this session. Record your approach, key decisions, and what you plan to build. This replaces any "first message to the user" — the devlog is the record.
5. **Set backlog status** — If this is the first bead being worked for the backlog item, set status to `in progress` in frontmatter.
6. **Proceed to implementation immediately.** Do not wait for user input.

## Implement

- Follow the approach and decisions recorded in the devlog (and any short "next" in the backlog).
- When you make a decision or change direction, record it in the **devlog**.
- Look for ways to limit rework or refactors based on this and related backlog items.

**When to stop and flag:** Only stop implementing when you discover something that **materially changes the overall approach** (e.g. new constraint, a design that conflicts with the backlog requirements, or a dependency that doesn't work as expected). Record what you found in the devlog, set the bead to a blocked state, and leave clear notes for the next session or the user.

**When implementation is testable:**
- For **auto-advance** beads (no UI, no user review needed): close the bead via `bd update <id> --status closed`. The runner will pick up the next task.
- For **review-required** beads (has UI or needs user testing): set the bead to `ready to test` via `bd update <id> --status ready_to_test`. Add a **short, concrete handoff** in the bead description or comment: what to test, how to run it, where the UI is.

## Update the backlog and devlog as you work

- Keep **approach and decisions** in the **devlog**. Keep the **backlog** to status, short next steps, and links.
- Update the devlog as you go: decisions, what was built, what's left. The next session loads context from the devlog, not from chat.

## Review docs

- Review existing documentation (architecture, development, related backlog items). **Make documentation updates** so the repo stays accurate. If an update is outside what you can edit, note it in the devlog.

## Close out

- **Definition of done:** Check the backlog's success criteria; in the devlog, note how each was met (or why not).
- **Update backlog status:** If this is the first bead being worked for a backlog item, set the backlog item status to `in progress` in frontmatter. Do **not** set the item to `completed` or archive it — only the user does that after testing and confirming. When all beads are closed, the runner will spawn a separate session to set the item [ready for review](./set-backlog-item-ready-for-review.md).
- **Create or update a devlog** — Prefer **one devlog per backlog item** (or per major phase). Append to the existing devlog for this item as you complete beads; do not create a new devlog per bead. Create or update the devlog in `docs/product/devlogs/` with **related_backlog** set to this backlog item (use backlog **slug**: filename without `.md`). **Add this devlog to the backlog item** in turn: update the backlog item's **devlogs** frontmatter with the devlog **ID** (filename without `.md`). See [Devlogs README](../../product/devlogs/README.md). Summarize what was done, key decisions, approach taken, and what's remaining. Do this at the end of every session, even if the item isn't fully complete.
- **Prepare to commit and commit (per bead):** Before ending the session, follow [prepare-to-commit](./prepare-to-commit.md) for all uncommitted changes from this bead, then [commit](./commit.md). Run `./scripts/beads-export-for-commit.sh`, then `git add .beads/issues.jsonl` and all changed files. Use the commit message template (include the bead/task ID in the body). If `git commit` fails (e.g. pre-commit hook), fix the reported issues (lint, types, docs) and retry until the commit succeeds. Do **not** push — the user pushes after review.

## See also

- [App Components](../design/app-components.md) — Primitives vs app components; consistency → intuitiveness
- [Backlog README](../../product/backlog/README.md) — Backlog view (generated); [TEMPLATE](../../product/backlog/TEMPLATE.md) — structure and frontmatter
- [set-backlog-item-ready-for-review](./set-backlog-item-ready-for-review.md) — Runner invokes this when all beads for an item are closed
- [prepare-to-commit](./prepare-to-commit.md) and [commit](./commit.md) — Per-bead commit before session end
- [refine-backlog-item.md](./refine-backlog-item.md) — Workflow for refining a planned backlog item
- [How we work](./how-we-work.md) — Backlog lifecycle and development loop
