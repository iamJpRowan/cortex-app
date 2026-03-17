[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Work a backlog item

# Work a backlog item

**What to work on:** This workflow is executed by the `/work` skill on behalf of a specific task. The `/work` skill identifies the next `pending` `*.task.md` file in the story folder and spawns a sub-agent with that file as the primary context. If invoked directly by the user, scan the story folder for the first `pending` task file (lowest numeric prefix, no unresolved `depends_on`).

**Autonomous by default.** This workflow assumes the agent is spawned with no user present. Proceed directly from reading the task to implementing it. Record your approach in the devlog — do not wait for user input.

**Doc as state:** The task file, story file, and devlog are the source of truth. The task file is your primary input — it is self-contained. The story file (`<slug>.story.md`) is the contract (goal, requirements, success criteria) and manifest (links to devlogs and references). **Approach and decisions** live in the **devlog**.

## Objectives

- Fully thought-through solutions with sensible future-proofing.
- Clear record of decisions made and why.
- Context that can easily be shared across many sessions.
- **Consistent, intuitive UI** — Use app components so the same actions and concepts are presented the same way. When touching existing UI, check whether the pattern should be an app component and extract or adopt it if so (see [App Components](../design/app-components.md)).

## When the story includes UI

- **Functionality first, with minimal UI to prove it** — Implement behavior, data, and integration so the feature works end-to-end. Include **enough UI** to exercise and verify it (e.g. minimal screen or panel).
- **Primitives as foundation** — Use shadcn (and AI Elements where relevant) for low-level UI. Design tokens and [UI Guide](../design/ui-guide.md) apply.
- **App components for consistency** — Before adding new UI, **review existing app components** (`src/renderer/src/components/`, excluding `ui/` and `ai-elements/`) and design docs ([design README](../design/README.md), [ui-guide](../design/ui-guide.md), [app-components](../design/app-components.md)). Prefer reusing or extending an app component. If you build bespoke UI, **justify in the devlog**.
- **Improve existing UI when you touch it** — When you **modify** existing views or panels, check whether the pattern repeats elsewhere and should be an app component. Extract or adopt if it does; document in the devlog if extraction is non-trivial and deferred.

## Starting a session

1. **Read the task file** — Scope, acceptance criteria, and references are all here. This file is your complete input for what to build.
2. **Read the story file and linked docs** — Find `<slug>.story.md` in the parent folder. Load the story's `devlogs` and `references`. Load only what's linked to bound context.
3. **Determine your approach** — Based on the task scope, story requirements, and existing decisions in devlogs. Treat any decisions already in the devlog as fixed.
4. **Record approach in the devlog** — Create or update the devlog for this story. Record your approach, key decisions, and what you plan to build.
5. **Update task and story status:**
   - Set `status: in-progress` in the task file's frontmatter.
   - If this is the first task being worked for the story, set the story file's status to `in progress`.
   - If this is the first task in the first child story of a container, set the container's status to `in progress` as well.
6. **Proceed to implementation immediately.** Do not wait for user input.

## Implement

- Follow the approach and decisions recorded in the devlog.
- When you make a decision or change direction, record it in the **devlog**.

**When to stop and flag:** Only stop when you discover something that **materially changes the overall approach** (e.g. new constraint, design conflict, broken dependency). Set `status: blocked` in the task file frontmatter, add a `## Blocked` section with the reason, and leave clear notes for the next session.

**When implementation is testable:**
- Set `status: complete` in the task file's frontmatter.
- All review (UI or otherwise) happens when the full story PR is opened — not at the task level.

## Update the devlog as you work

- Keep **approach and decisions** in the **devlog**. The story file stays as the contract — do not add implementation notes there.
- Update the devlog as you go. The next session loads context from the devlog, not from chat.

## Review docs

- Review existing documentation (architecture, development, related stories). **Make documentation updates** so the repo stays accurate. Note anything out of scope in the devlog.

## Close out

- **Definition of done:** Check the story's success criteria; in the devlog, note how each was met (or why not).
- **Create or update the devlog** — **One devlog per story**. Append to the existing devlog as you complete tasks; do not create a new devlog per task. Create or update it in `docs/product/devlogs/` with **related_backlog** set to this story's slug. Update the story file's `devlogs` frontmatter with the devlog ID. See [Devlogs README](../../product/devlogs/README.md).
- **Prepare to commit, commit, and push (per task):** Run `/prepare-to-commit` for all uncommitted changes, then `/commit`. Include the task filename or title in the commit body. If `git commit` fails (pre-commit hook), fix the reported issues and retry. Then `git push` — push after every task so work is never stranded locally.

## See also

- [App Components](../design/app-components.md) — Primitives vs app components; consistency → intuitiveness
- [TEMPLATE.story.md](../../product/backlog/TEMPLATE.story.md) and [TEMPLATE.task.md](../../product/backlog/TEMPLATE.task.md) — Story and task formats
- [create-pr-message](./create-pr-message.md) — Invoked by `/work` when all task files in a story are complete
- `/prepare-to-commit` and `/commit` skills — Per-task commit before session end
- [How we work](./how-we-work.md) — Backlog lifecycle and development loop
