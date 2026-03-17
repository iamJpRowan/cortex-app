---
date: 2026-03-17
developer: jprowan
agent: Claude
model: claude-sonnet-4-6
session_id:
tags:
  - dx
  - skills
  - agents
backlog_items:
  - "[[create-skills-for-working-stories.story]]"
related_issues: []
outcome: complete
---

# Context

The current development loop requires the user to manually follow workflow docs (refine-backlog-item.md, decompose-backlog-item.md, work-backlog-item.md) to work a story. This is error-prone and slow. The goal is to create three Claude Code skills (`/refine-story`, `/work-story`, `/work-task`) that automate the full lifecycle from story validation through task execution to PR creation.

These skills live in `.claude/commands/` and are invokable as `/refine-story`, `/work-story`, and `/work-task`. They operate alongside (not replacing) the existing workflow docs.

# Approach

Three command files:

1. **`/refine-story`** — Interactive conversation that evaluates the 6 readiness criteria and asks one targeted question at a time for each failing criterion. Updates the story file in place as state. Sets `status: refined` when all criteria pass.

2. **`/work-story`** — Orchestrator. Validates wikilinks (attempts auto-fix), checks all readiness criteria, creates a worktree + branch, creates a devlog, decomposes the story into a `## Tasks` section, presents to user for approval, then spawns `/work-task` subagents sequentially, and finally opens a PR.

3. **`/work-task`** — Subagent worker. Receives story path + task identifier + devlog path (all in worktree context). Reads context, implements, records decisions in devlog, marks task complete, runs `/prepare-to-commit` + `/commit`, then pushes.

Key decision: The `allowed-tools` for `/work-story` needs to include `Agent` to spawn `/work-task` subagents. The `/work-task` command needs Bash for `git push` and the full implementation toolset.

The `[[how-we-work]]` wikilink in the story file is broken — that content is embedded directly in `docs/agents/README.md`. This is noted but does not block implementation.

# Challenges Addressed

## Worktree path in `/work-story`

`/work-story` needs to create a worktree. The `Bash` tool is required for `git worktree add`. The command's `allowed-tools` must include `Bash`.

## Sequential subagent spawning

The story requires tasks run sequentially (each `/work-task` must complete before the next begins). In Claude Code, spawning subagents via the `Agent` tool is blocking by default, so sequential ordering is natural.

## `/work-task` tool access

`/work-task` needs the full implementation toolset (Read, Write, Edit, Glob, Grep, Bash) plus the ability to invoke `/prepare-to-commit` and `/commit` as sub-skills. The `Skill` tool is not listed as an available tool in `allowed-tools` — these skills are invoked as prompt expansions within the agent's context, not as separate tool calls. The command text should reference them as skills to invoke.

# Outcome

All three command files created and committed:

- [.claude/commands/refine-story.md](.claude/commands/refine-story.md) — reads story, resolves wikilinks, evaluates 6 readiness criteria, asks one question per failing criterion, updates story in place, confirms when all pass without changing status.
- [.claude/commands/work-story.md](.claude/commands/work-story.md) — full orchestrator: validates links, checks readiness, creates worktree + branch, creates devlog, decomposes into inline tasks, waits for user approval, commits setup, spawns `/work-task` sequentially, sets `ready to review`, opens PR.
- [.claude/commands/work-task.md](.claude/commands/work-task.md) — subagent worker: parses args (story path, task ID, devlog path), reads inline task entry from `## Tasks` section, records approach in devlog before implementing, marks task complete, runs `/prepare-to-commit` + `/commit` + push, handles blockers with devlog note.

Also updated the story spec to fix status lifecycle: `/refine-story` does not change status; `/work-story` sets `in progress` on setup and `ready to review` before PR. Story spec and success criteria are now consistent.

# Notes

- The `[[how-we-work]]` wikilink in the story references file is broken. Content is in `docs/agents/README.md`. No fix needed for this task — skill behavior comes from the story spec, not from resolving that link.
- `/refine-story` does **not** change story status — refinement is a content improvement pass, not a lifecycle transition. Status only changes when work begins (`in progress` on first task) or when all tasks complete (`ready to review` before PR).
