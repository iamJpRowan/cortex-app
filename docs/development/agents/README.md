[Docs](../../README.md) / [Development](../README.md) / Agents

# Agent Instructions

This directory holds **generic instructions** for all agent conversations and **workflow-based instructions** for specific kinds of conversations.

When the user references one of the workflow docs below (by name, file, or similar phrasing), treat that as **explicit instructions** for the current conversation: review that workflow and follow it.

**How development is intended to work:** See [how-we-work.md](./how-we-work.md) for the backlog lifecycle and development loop (Plan → Execute → Review). Keep **state and substance in docs** (backlog item, devlog, concept doc); use chat for coordination and short summaries so future sessions can start from the docs.

## Generic behavior (all chats)

- Follow the collaboration patterns in [CONTRIBUTING.md](../../../CONTRIBUTING.md) and technical constraints in the [development guide](../README.md).
- Favor concise explanations; provide detail when asked.
- Pause and clarify when requirements are ambiguous—do not assume.
- If the agreed approach will not work, stop, explain, and ask how to proceed.

## When the user wants to…

| Intent                                                    | Workflow                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Set a goal and identify what to build                     | [plan-goal.md](./plan-goal.md)                                                                      |
| Refine a `planned` backlog item                           | [refine-backlog-item.md](./refine-backlog-item.md)                                                  |
| Decompose a `refined` item into Beads tasks (automated)   | [decompose-backlog-item.md](./decompose-backlog-item.md)                                            |
| Work the next task / implement                            | [work-backlog-item.md](./work-backlog-item.md) — use `bd ready` for next task                       |
| Define or refine a core concept (product/system behavior) | [defining-core-concepts.md](./defining-core-concepts.md)                                            |
| Evaluate backlog (relevance, clarify, abandon, hygiene)   | [backlog-grooming.md](./backlog-grooming.md)                                                        |
| Clean up docs (links, user vs dev, devlog links)          | [docs-cleanup.md](./docs-cleanup.md)                                                                |
| Get ready to commit                                       | [prepare-to-commit.md](./prepare-to-commit.md)                                                      |
| Commit (after prepare-to-commit)                         | [commit.md](./commit.md)                                                                            |

Use **one workflow per conversation** so the agent has clear intent.

## Workflow-based conversations

Each workflow doc is a set of explicit instructions for that conversation type.

- **[plan-goal.md](./plan-goal.md)** — Set a target capability and identify the backlog items needed.
  _Example phrases:_ "set a goal", "plan the next goal", "what should we build next", "follow plan-goal".

- **[refine-backlog-item.md](./refine-backlog-item.md)** — Refine a `planned` backlog item to `refined` (ready for decomposition).
  _Example phrases:_ "refine this backlog item", "refine [item name]", "let's refine [feature]", "follow refine-backlog-item".

- **[decompose-backlog-item.md](./decompose-backlog-item.md)** — Decompose a `refined` item into Beads tasks (fully automated, no human turn).
  _Example phrases:_ "decompose this item", "break this into beads", "follow decompose-backlog-item".

- **[work-backlog-item.md](./work-backlog-item.md)** — Working a Beads task (implementing or advancing it).
  _Example phrases:_ "work this backlog item", "work on [this backlog doc]", "implement this backlog item", "let's work the backlog", "follow work-backlog-item".

- **[defining-core-concepts.md](./defining-core-concepts.md)** — Defining or refining how the product works; trickle-down to architecture, user docs, dev docs, backlog.
  _Example phrases:_ "define a core concept", "we're defining [concept]", "refine the connections doc", "follow defining-core-concepts".

- **[backlog-grooming.md](./backlog-grooming.md)** — Backlog hygiene and relevance (clarify, abandon, archive).
  _Example phrases:_ "backlog grooming", "groom the backlog", "follow backlog-grooming".

- **[docs-cleanup.md](./docs-cleanup.md)** — Docs-only cleanup (links, user vs dev, devlog related_backlog).
  _Example phrases:_ "docs cleanup", "clean up the docs", "follow docs-cleanup".

- **[prepare-to-commit.md](./prepare-to-commit.md)** — Review code before commit: apply all recommended fixes (workarounds, patterns, docs, session artifacts, UI/reuse), then report what was updated and what was not.
  _Example phrases:_ "prepare to commit", "review before commit", "pre-commit review", "follow prepare-to-commit".

- **[commit.md](./commit.md)** — Produce a consistent commit message using the template. Use after prepare-to-commit when the user is satisfied.
  _Example phrases:_ "commit", "commit message", "follow commit", "ready to commit".

For workflow-based conversations, keep the relevant doc (backlog item, draft, or devlog) as the source of truth—prefer updating it over long chat so new sessions can start from the doc.

## Implementation reference

For how to build features (IPC, JSX, testing, Electron, etc.), use the [development guide](../README.md).
