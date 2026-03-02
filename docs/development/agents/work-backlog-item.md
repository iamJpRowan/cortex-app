[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Work a backlog item

# Work a backlog item

**What to work on:** When starting a session, **determine what to work on from the [roadmap](../../product/README.md#roadmap) current focus** (frontmatter `current_focus`) unless the user explicitly specifies a different item. If current focus is empty, ask the user which item to work on or suggest one from the backlog.

**First turn, then proceed:** Your first message is a **concise recommended approach with brief justifications** (scope, main choices, and why). The user may clarify or correct. **Then proceed to implement**—do not wait for an explicit "I confirm." The next time you need the user is at **ready to test**, unless you discover something during implementation that changes the overall approach and needs discussion.

**Doc as state:** The backlog document and devlogs are the source of truth. Prefer updating the backlog doc and devlog over long chat replies; use chat for questions and short summaries. **Use the backlog item as the manifest of relevant context:** at the start of a session, read the backlog item and the docs it links to—`implements` (concept doc), `devlogs` (devlogs for this item), and `references` or a **References** section (architecture/development/design docs that apply). Load only those linked docs to bound context. In chat, give a short summary (e.g. "Last session we did X; next we need Y") then propose next steps. Do not re-explain full history in chat.

**Status location:** Put **backlog item status** (e.g. `in progress`, `ready to test`) in **YAML frontmatter** at the top of the file. Keep the backlog body lean: status, short "Next" or "Current approach: see devlog …" only. **Approach and decisions** live in the **devlog** (implementation narrative); the backlog is the contract (goal, requirements, success criteria) and manifest (links).

**Phased items (optional):** If the backlog item is organized in phases (see [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md)), each phase is **scope + success criteria only**. When working the item, identify **which phase/chunk is next**. Record your approach for that phase in the **devlog**; optionally one line in the backlog. You can set **ready to test** when a phase is testable so the user can test that slice; the item as a whole stays in progress until all phases are done and the user marks it complete.

## Objectives

- Fully thought-through solutions with sensible future-proofing.
- Clear record of decisions made and why.
- Context that can easily be shared across many chat sessions.
- **Consistent, intuitive UI** — Prefer app components so the same actions and concepts are presented the same way. When touching existing UI, consider extracting or adopting app components so we improve consistency over time (see [App Components](../design/app-components.md)).

## When the item includes UI

- **Functionality first, with minimal UI to prove it** — Implement behavior, data, and integration so the feature works end-to-end. Include **enough UI** to exercise and verify it (e.g. minimal screen or panel). Then treat the next step as **UI iteration** with the user.
- **Then UI iteration** — Once functionality is testable, set status to **ready to test**. The user will test via the UI and refine layout, copy, and components. Do not treat the item as done until the user has had a chance to iterate on the UI. Expect iterations at **ready to test**; only the user decides the item complete after testing and refinement.
- **Primitives as foundation** — Use shadcn (and AI Elements where relevant) for low-level UI. Design tokens and [UI Guide](../design/ui-guide.md) apply.
- **App components for consistency** — Consistent presentation of actions and concepts makes the interface **intuitive**; variations and bespoke patterns add cognitive load. Before adding new UI, **review existing app components** (`src/renderer/src/components/`, excluding `ui/` and `ai-elements/`) and design docs ([design README](../design/README.md), [ui-guide](../design/ui-guide.md), [app-components](../design/app-components.md)). Prefer reusing or extending an app component. If you build bespoke UI, **justify in the devlog** (e.g. "No existing X; Y not suitable because …"). When you add UI that could be reused elsewhere, note in the devlog (or design docs) that it could become an app component.
- **Improve existing UI when you touch it** — When you **modify** existing views or panels, consider whether this or other screens repeat a pattern that should be an app component. If so: extract or adopt an existing app component, or document an extraction candidate in the devlog. We improve the app component layer incrementally so the product becomes more consistent over time.

## First response when starting or continuing work

**First message:** Give a **concise recommended approach with brief justifications**: scope (main deliverables), key choices, and why. If there are open decisions that must be resolved before building, list them with your recommended resolution and justification. For UI, include what the user will see and key behaviors. **Record the full approach in the devlog** (create or update for this session); optionally add one line in the backlog (e.g. "Current approach: see devlog YYYY-MM-DD-…").

**Default: proceed.** The user may clarify or correct in their next message. If they do not object (or say "go ahead" / "looks good"), **proceed to implementation** in your next turn. Do not send a second message that only asks for sign-off. The next **required** user turn is at **ready to test**, or when you pause because something discovered during implementation affects the overall approach.

## Assess current state and readiness

- Review the backlog item and the docs it links to (`implements`, `devlogs`, `references` or References section) so you understand current state, rules that apply, and what's already been done.
- Identify what's **next** (from the backlog doc, success criteria, or from what's already been done). If the item uses phases, identify **which phase/chunk is next**. Treat any decisions or approach already in the devlog as fixed.
- In your first message: **concise recommended approach with justifications** (see above). Record the full approach in the **devlog**; set backlog status to `in progress` in front matter; optionally a short "Next" or "Current approach: see devlog …" in the backlog body. Then **proceed to implementation** unless the user corrects or asks to discuss.
- Look for ways to limit rework or refactors based on this and related backlog items.
- Update dependent documents if needed.

## Update the backlog and devlog as you work

- Set **item** status to `in progress` in **front matter** when you start working the item.
- Keep **approach and decisions** in the **devlog** (implementation narrative). Keep the **backlog** to status, short next steps, and links; do not duplicate full approach or decision rationale in the backlog.
- Update the devlog as you go: decisions, what was built, what's left. Prefer updating the devlog over long chat so the next session can load context from it.

## When to pause for the user

- **Use existing decisions** (in backlog or devlog) as given; do not re-ask or override them.
- **Only pause for the user** when (a) you discover something during implementation that **materially changes the overall approach** (e.g. new constraint, better design that affects scope), or (b) the user has explicitly corrected or asked to discuss. In (a), state what you found and the options, then wait for direction. Otherwise continue to **ready to test** without an extra confirmation step.

## Implement (or advance) the item

- Follow the approach and decisions recorded in the devlog (and any short "next" in the backlog).
- When you make a decision or change direction, record it in the **devlog**; keep the backlog updated with status and short next steps only.

**When implementation is testable** (including enough UI to prove functionality): Set **item** status to **`ready to test`** in **front matter**. Do **not** mark the item complete or archive it.

**Ready to test handoff:** When you set **ready to test**, give the user a **short, concrete handoff**: what to test, how to run it, where the UI is. Optionally add one line in the backlog doc or devlog: "Ready for user testing: [what to test / how to open it]." **Only the user** marks the item complete and archives it after testing and refinement. The user may refine the UI or change requirements; if they change requirements or success criteria, update the backlog item, set status back to **in progress**, and continue implementation until it is ready to test again.

## Review docs

- Review existing documentation (architecture, development, related backlog items, this backlog doc). **Make the documentation updates** so the repo stays accurate. If an update is outside what you can edit, note it in the backlog doc or devlog. The user can review edits and choose not to commit.

## Close out

- **Definition of done:** Check the backlog's success criteria; in the devlog, note how each was met (or why not).
- Ensure the backlog doc has: **item status in front matter**; short next steps or "Current approach: see devlog …" if useful. Ensure the **devlog** has approach, decisions, and what's remaining. After you finish implementing, set **item** status to **`ready to test`** in **front matter**. Do **not** set to complete or archive—only the user can confirm after testing. If you're pausing mid-work, leave item status `in progress` in front matter (or set back to `considering`/`soon`/`next` if you're not continuing soon).
- **Update roadmap:** If you completed or are handing off the **current-focus** item, update the [roadmap](../../product/README.md#roadmap): set **current_focus** in frontmatter to the next item(s) from the sequence so the next session knows what to work on.
- **Archive (only after user confirms):** Move the item to archive and mark `completed` only when the **user has tested and confirmed** the work. Until then, keep status `ready to test`. When the user confirms: move to `docs/product/backlog/archive/`, add frontmatter `status: completed`, `date_archived: YYYY-MM-DD`, and `summary` (one line). Put "Why archived" or "Merged into" in the body, not frontmatter. See [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md). The [Backlog README](../../product/backlog/README.md) is generated and will update on next predev/pre-commit.
- **Create or update a devlog** for this session in `docs/product/devlogs/` with **related_backlog** set to this backlog item (use backlog **slug**: filename without `.md`). **Add this devlog to the backlog item** in turn: update the backlog item's **devlogs** frontmatter with the devlog **ID** (filename without `.md`, e.g. `devlogs: [2026-02-17-chat-trace-token-usage-and-cleanup]`) so the link is bi-directional. See [Devlogs README](../../product/devlogs/README.md) for format. Summarize what was done, key decisions, approach taken, and what's remaining so the next session can continue without this chat. Use [docs/product/devlogs/TEMPLATE.md](../../product/devlogs/TEMPLATE.md). Do this at the end of every session that worked the item, even if the item isn't fully complete.

## See also

- [App Components](../design/app-components.md) — Primitives vs app components; consistency → intuitiveness
- [Backlog README](../../product/backlog/README.md) — Backlog view (generated); [TEMPLATE](../../product/backlog/TEMPLATE.md) — structure and frontmatter
- [design-new-features.md](./design-new-features.md) — Workflow for creating a new backlog item
- [How we work](./how-we-work.md) — Intended development loop
- [Roadmap](../../product/README.md#roadmap) — Current focus and sequence
