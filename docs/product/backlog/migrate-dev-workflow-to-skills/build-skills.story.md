---
type: story
title: Build Skills from Agent Workflow Docs
status: planned
summary: Convert each agent workflow doc in docs/development/agents/ into a first-class Claude skill under .claude/skills/.
themes: []
parent: "[[migrate-dev-workflow-to-skills.story.md]]"
---

# Build Skills from Agent Workflow Docs

## Goal

Make every agent workflow a proper Claude skill (a `/slash-command`) so they can be invoked
directly from the Claude Code CLI. The workflow docs in `docs/development/agents/` become the
source of truth; corresponding skill files live in `.claude/skills/`.

## Architecture discussion needed

Before decomposing this story into tasks, we need to settle a few design questions:

1. **Skill file format** — What does a `.claude/skills/<name>.md` file look like? What
   frontmatter does it need? How does Claude Code discover and load skills from this directory?
2. **Scope per skill** — Which of the workflow docs map 1-to-1 to a skill, and which need
   splitting or merging? Current workflow docs:
   - `plan-goal.md` → `/plan-goal`?
   - `refine-backlog-item.md` → `/refine`?
   - `decompose-backlog-item.md` → `/decompose`?
   - `work-backlog-item.md` → used internally by `/work`, not directly invoked?
   - `create-pr-message.md` → invoked by `/work`, not directly?
   - `prepare-to-commit.md` → `/prepare-to-commit` or folded into `/work`?
   - `commit.md` → `/commit`?
   - `backlog-grooming.md` → `/groom`?
   - `docs-cleanup.md` → `/docs-cleanup`?
   - `defining-core-concepts.md` → `/define-concept`?
3. **Relationship between skill and doc** — Is the skill file the canonical source (docs are
   generated or removed), or are both maintained? Preference: skill file is the canonical
   artifact; doc is kept as a human-readable reference copy.
4. **One PR per skill or batch** — Likely one task/PR per skill to keep review focused.

## Requirements and constraints

- Each skill maps to a file at `.claude/skills/<name>.md`.
- Skill files must be invocable via `/name` in Claude Code.
- The new `/work` skill is the primary orchestrator — it must be built first (or in parallel
  with the simpler utility skills).
- `docs/development/agents/` files are kept as reference copies after skills are created;
  they should note at the top that the canonical version lives in `.claude/skills/`.

## Success criteria

- `/work`, `/decompose`, `/refine`, `/plan-goal`, and core utility skills (`/commit`,
  `/prepare-to-commit`) all exist as `.claude/skills/<name>.md` files and are invocable.
- Each skill file is self-contained and does not reference Beads or the old runner.
- The workflow described in `docs/development/agents/how-we-work.md` is fully executable
  using only Claude skills — no external tooling required.

## Build a `/work` skill

The `/work` skill is invoked on a **leaf story** (one with tasks, no child stories). If invoked on a container story, it detects there are no tasks and points to the first `ready` child story.

**Behavior on a leaf story:**

- Scans the story folder for `*.task.md` files with `status: pending` and no unresolved `depends_on`.
- Spawns a sub-agent (`isolation: worktree`) for the lowest-numbered pending task, passing the task file as context.
- Sub-agent implements, sets `status: complete` in the task file, runs `prepare-to-commit` + `commit`, pushes.
- Parent scans again for the next pending task and repeats.
- When no pending tasks remain, spawns a sub-agent to open a PR via `gh pr create` using the devlog and story file.
- **Stops after the PR is opened.** Reports the PR URL.

## References

- [[how-we-work]]
- [[README]]
- [[work-backlog-item]]
- [[decompose-backlog-item]]
- [[refine-backlog-item]]
- [[plan-goal]]
- [[create-pr-message]]
- [[prepare-to-commit]]
- [[commit]]
- [[backlog-grooming]]
- [[docs-cleanup]]
- [[defining-core-concepts]]
