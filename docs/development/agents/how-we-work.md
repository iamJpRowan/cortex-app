[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / How we work

# How we work

This document describes the intended development loop so both the user and agents can follow a consistent process.

## Backlog Lifecycle

The backlog item is the central planning artifact. Each status has a clear owner and a corresponding workflow that advances it to the next state.

| Status | Owner | Next workflow | What happens |
|---|---|---|---|
| `considering` | — | `plan-goal` (pulls it in) | Item exists but is not part of the current goal. |
| `planned` | You | `refine-backlog-item` | Goal-setting identified this item as needed. May be a lightweight placeholder. |
| `refined` | Agent (auto) | `decompose-backlog-item` (no human turn) | Design is solid. Agent decomposes into Beads epic + tasks. |
| `ready` | Runner | `work-backlog-item` | Beads tasks exist. Runner picks up the first unblocked task. |
| `in progress` | Agent/You | (working beads; reviewing PRs per phase) | Work ongoing. Agents work beads; each completed phase produces a PR for your review. |
| `completed` | You | Archive | All phase PRs merged to main; you're satisfied with the feature. |

Review happens at the **phase level**, not the bead level. Each phase maps to one Beads epic and one git branch (`backlog/<slug>-phase-N`, or `backlog/<slug>` for items with no phases). When all beads in a phase epic are closed, the runner spawns [create-pr-message](./create-pr-message.md) to produce a PR body with test steps, then pushes the branch and opens a PR. You check out the branch, run `npm run dev`, test and iterate, then merge the PR. When all phases are merged, mark the backlog item `completed` and archive it.

## The Three Phases

| Phase | Who | What |
|-------|-----|------|
| 1. Plan | You + agent | Set goal, refine backlog items, agent decomposes into Beads tasks |
| 2. Execute | Agents (continuous) | Agents work through Beads task chain; each completed task spawns the next |
| 3. Review | You | Check out phase PR branch, `npm run dev`, test and iterate, merge when satisfied |

Planning and execution overlap. You don't wait for all items to be refined before execution starts. As soon as one item reaches `ready`, the runner begins working its tasks while you continue refining later items.

## The User's Role

1. **Set goals** — Define the next target capability and identify the backlog items needed to achieve it. Use the [plan-goal](./plan-goal.md) workflow.
2. **Refine backlog items** — For each `planned` item, flesh out requirements and success criteria so agents can decompose and implement it. Use the [refine-backlog-item](./refine-backlog-item.md) workflow.
3. **Review phase PRs** — When a phase PR is opened, check out the branch, run `npm run dev`, test and iterate. Merge when satisfied. If the work is egregiously wrong, close the PR, reset the backlog item to `refined` with improved requirements, and let the runner re-decompose. Only you mark a backlog item `completed` after all its phase PRs are merged.
4. **Define concepts** — Define or refine how the product works using [defining-core-concepts](./defining-core-concepts.md) before refining any backlog item that depends on an unsettled concept. This is not a lifecycle step; do it when a concept is ambiguous or missing before refinement proceeds.

## The Agent's Role

1. **Decompose** — When a backlog item reaches `refined`, automatically decompose it into Beads tasks. Follow [decompose-backlog-item](./decompose-backlog-item.md).
2. **Implement** — Work tasks from `bd ready`. Follow [work-backlog-item](./work-backlog-item.md).
3. **Hand off for review** — When all beads in a phase (epic) are closed, the runner pushes the branch and opens a PR. The PR body contains a summary of what was built and how to test it.
4. **Respond to feedback** — If the user requests changes after reviewing a PR, new beads are created on the same branch and worked before the PR is merged.

## The Runner

A lightweight script manages agent continuity. It uses a **git worktree** (default: `../cortex-app-runner` from the repo root) so you can stay on `main` in the main repo while agents work on backlog branches in the worktree. The worktree is created with branch `runner-main` (from `main`) because Git does not allow the same branch in two worktrees. Beads state (`.beads`) is shared via Beads' native redirect mechanism — the `post-checkout` hook sets up `.beads/redirect` in the worktree automatically, pointing back to the main repo's `.beads`.

1. Run `bd ready` (from the main repo) to find a task with no open blockers.
2. **Branch per phase:** In the runner worktree, ensure branch `backlog/<slug>-phase-N` (or `backlog/<slug>` for items with no phases) for the task's epic (create from `main` if needed). All agent work for that phase stays on that branch in the worktree.
3. Spawn a Claude Code session with the worktree as context. Agent follows [work-backlog-item](./work-backlog-item.md): implements, updates devlog, runs prepare-to-commit and commit (fixing hook failures), then closes the task. Agent does not push.
4. **Epic complete:** After each task session, check if any epic has all children closed. If so, spawn a session following [create-pr-message](./create-pr-message.md) to produce a PR body with test steps. Then push the branch (`backlog/<slug>-phase-N` or `backlog/<slug>` → `main`) and create a PR using that body.
5. Go to step 1 and continue working the next ready task.

Run the runner from the **main repo** (e.g. `./scripts/runner.sh`). Use `--worktree PATH` or set `RUNNER_WORKTREE` to override the worktree location. The runner is the orchestrator (worktree, branching, epic-complete detection, spawning the right workflow). The intelligence is in the task graph (Beads) and the agent workflows.

## Your Daily Routine

1. **Check open PRs** — Review phase PRs in GitHub/Cursor. Check out the branch, `npm run dev`, test and iterate, then merge.
2. **Advance `planned` items** — Pick the next one and run `refine-backlog-item`.
3. **Set the next goal** — When all items in the current goal are `completed`, start over with `plan-goal`.

## See also

- [Agent workflows](./README.md#workflow-based-conversations) — Which workflow to use when
- [Backlog README](../../product/backlog/README.md) — Backlog structure and status definitions
