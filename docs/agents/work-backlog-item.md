[Docs](../README.md) / [Agents](./README.md) / Work a backlog item

# Work a backlog item

When the user references this document or says they want to work a backlog item (e.g. "work this backlog item", "work on this doc", "implement this backlog"), treat that as **explicit instructions** for this conversation: follow this workflow.

**Gate:** Before implementing, **propose an approach** for the phase and get user sign-off. Resolve any pre-documented open decisions, and for the rest (especially UI) present what you plan to build and where user input would help; then confirm before proceeding.

**Phased items:** When the backlog item uses a phased approach, each phase is a top-level section (`## Phase N`) with all relevant details inside it (steps, approach, decisions for that phase). No separate “Decision Record” section—decisions live under the phase they apply to. See [Backlog README](../backlog/README.md#phased-items).

**Doc as state:** The backlog document should stay an accurate representation of current state (decisions, status, next steps, and—when starting a phase—the proposed approach for that phase) so a new conversation can continue from it. Prefer updating the backlog doc over long chat replies; use chat for questions and short summaries.

**Status location:** Put **backlog item status** (e.g. `in progress`, `ready to test`) in **YAML frontmatter** at the top of the file. Put **phase or stage status** (which phase is in progress, done, ready to test, etc.) in the **markdown body** (e.g. a Phases or Progress section).

## Objectives

- Fully thought-through solutions with sensible future-proofing.
- Clear record of decisions made and why.
- Context that can easily be shared across many chat sessions.

## First response when starting or advancing a phase

Before any implementation, do **both** of the following. Your first reply must contain only this (no implementation in the same message).

1. **Pre-documented decisions:** If the backlog has open decisions for this phase (e.g. under that phase’s section), list them and prompt the user.
2. **Proposed approach:** From the phase description (and any **Approach** or **Decisions** under that phase), outline what you plan to build:
   - **Scope:** Main deliverables (e.g. components, APIs, UI areas).
   - **UI/UX (when the phase involves UI):** Components and structure (what the user will see; key behaviors).
   - **Recommendations:** Your suggested choices for anything ambiguous.
   - **Where your input helps:** Details the user might want to steer (placement, wording, behavior).
   **Record this in the backlog doc** under that phase (add or update an **Approach** or **Proposed plan** subsection) so the doc stays the source of truth. Then summarize in chat and ask for sign-off.
3. **Ask for sign-off:** Ask the user to confirm the plan (or adjust specific points) before you implement. Do not start implementation until they confirm or give direction.

If there are no pre-documented open decisions, you still **propose the approach** and get sign-off—do not skip to implementation.

## Assess current state and readiness

- Review the backlog item, any documents it references, and any recent devlogs for this item so you understand current state and what’s already been done.
- Identify the **next phase or stage** to work on (from the backlog doc or from what’s already done). For phased items, read the **phase section** (`## Phase N`); treat any **Decisions** or **Approach** there as fixed.
- **Propose a concrete approach** for that phase from its description: what you will build (scope, components, key behavior), with recommendations and clear points for user input. Do not start implementation until the user has confirmed this plan (and any pre-documented open decisions).
- Look for ways to limit rework or refactors based on this and related backlog items.
- Update dependent documents if needed.

**Checkpoint:** Update the backlog doc: set **item** status to `in progress` in **front matter**; record open decisions and any blockers in the body; update **phase** status in the body; **record your proposed approach** (scope, components, recommendations, where user input helps) in the backlog under that phase (e.g. **Approach** or **Proposed plan** subsection). Your **first** reply must then summarize that approach and **ask for sign-off**—do not put the full plan only in chat. Do not include implementation in that message. Do not start implementation until the user confirms or gives direction. Optionally create a minimal devlog for this session; complete it at close out.

## Update the backlog as you work

- Set **item** status to `in progress` in **front matter** when you start working the item.
- For phased items: keep **Decisions** and **Approach** under the phase section they apply to; track **phase** status (in progress, done, ready to test) in that phase's header or body.
- When you complete steps or hit milestones, update the doc (e.g. next steps, remaining work; phase status) so a new session can continue from it.

## Decisions and sign-off before proceeding

Before implementing or starting a **new phase or stage**:

1. **Use existing Decisions** in the backlog item (under that phase's section for phased items) as given; do not re-ask or override them.
2. **Proposed approach** = (a) any pre-documented open decisions for the phase, and (b) your **plan** for the phase: what you will build (scope, components, key UX/details), with recommendations and "where your input helps."
3. **If there are open decisions:** Prompt the user with those and wait for confirmation (or explicit instruction to proceed) before implementing.
4. **If there are none (or in addition):** Present your **proposed approach** for the phase and ask the user to confirm before you proceed. Do not assume that phrases like “I’m ready to phase X” mean proceed without this sign-off. For UI-heavy phases, always describe planned components and behavior so the user can steer.

Do not jump into implementation until the user has confirmed the plan or given direction. When advancing to a new phase after completing work, repeat: review the next phase section, propose approach, get sign-off, then proceed.

## Implement (or advance) the item

- Follow the approach and decisions in the backlog doc.
- Keep the doc in sync: when you make a decision or change direction, record it in the backlog file.

**When implementation is done** (for a phase or the whole item): Set **item** status to **`ready to test`** in **front matter**. Update **phase** status in the body (e.g. mark that phase as ready to test or done). Do **not** mark the item complete or archive it. Complete is only for after the user has tested and confirmed.

## Review docs

- Review existing documentation (architecture, development, related backlog items, this backlog doc). **Make the documentation updates** so the repo stays accurate. If an update is outside what you can edit, note it in the backlog doc or devlog. The user can review edits and choose not to commit.

## Close out

- **Definition of done:** Check the backlog’s success criteria; in the doc or devlog, note how each was met (or why not).
- Ensure the backlog doc has: **item status in front matter**; for phased items, **Decisions** and **Approach** under each phase with rationale; and any follow-up items or next steps. After you finish implementing, set **item** status to **`ready to test`** in **front matter** and update **phase** status in the body. Do **not** set to complete or archive—only the user can confirm after testing. If you’re pausing mid-work, leave item status `in progress` in front matter (or set back to `considering`/`soon`/`next` if you’re not continuing soon).
- **Archive (only after user confirms):** Move the item to archive and mark `completed` only when the **user has tested and confirmed** the work. Until then, keep status `ready to test`. When the user confirms: move to `docs/backlog/archive/`, add frontmatter (e.g. `status: completed`, `completed_date`) per [Backlog README](../backlog/README.md), and **remove it from the Current Backlog list** in [docs/backlog/README.md](../backlog/README.md).
- **Create or update a devlog** for this session in `docs/devlogs/` summarizing what was done, key decisions, and any follow-ups. Use [docs/devlogs/TEMPLATE.md](../devlogs/TEMPLATE.md) as a guide. Do this at the end of every session that worked the item, even if the item isn’t fully complete.

## See also

- [Backlog README](../backlog/README.md) — Backlog structure and archive
- [design-new-features.md](./design-new-features.md) — Workflow for creating a new backlog item
