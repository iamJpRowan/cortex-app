[Docs](../../README.md) / [Development](../README.md) / Agents

# Agent Instructions

This directory holds **generic instructions** for all agent conversations and **workflow-based instructions** for specific kinds of conversations.

When the user references one of the workflow docs below (by name, file, or similar phrasing), treat that as **explicit instructions** for the current conversation: review that workflow and follow it.

**How development is intended to work:** See [how-we-work.md](./how-we-work.md) for the intended loop (User role: concepts, roadmap, test & refine; Agent role: implement from roadmap, set ready to test). Keep **state and substance in docs** (backlog item, devlog, concept doc); use chat for coordination and short summaries so future sessions can start from the docs.

## Generic behavior (all chats)

- Follow the collaboration patterns in [CONTRIBUTING.md](../../../CONTRIBUTING.md) and technical constraints in the [development guide](../README.md).
- Favor concise explanations; provide detail when asked.
- Pause and clarify when requirements are ambiguous—do not assume.
- If the agreed approach will not work, stop, explain, and ask how to proceed.

## When the user wants to…

| Intent                                                    | Workflow                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Define or refine a core concept (product/system behavior) | [defining-core-concepts.md](./defining-core-concepts.md)                                            |
| Sequence or reprioritize work                             | [roadmap-review.md](./roadmap-review.md)                                                            |
| Work the next feature / implement                         | [work-backlog-item.md](./work-backlog-item.md) — use [roadmap](../../product/README.md#roadmap) current focus |
| Evaluate backlog (relevance, clarify, abandon, hygiene)   | [backlog-grooming.md](./backlog-grooming.md)                                                        |
| Clean up docs (links, user vs dev, devlog links)          | [docs-cleanup.md](./docs-cleanup.md)                                                                |
| Get ready to commit                                       | [prepare-to-commit.md](./prepare-to-commit.md)                                                      |
| Commit (after prepare-to-commit)                         | [commit.md](./commit.md)                                                                            |
| Design a new feature / create a backlog item              | [design-new-features.md](./design-new-features.md)                                                  |

Use **one workflow per conversation** so the agent has clear intent.

## Workflow-based conversations

Each workflow doc is a set of explicit instructions for that conversation type.

- **[work-backlog-item.md](./work-backlog-item.md)** — Working an existing backlog item (implementing or advancing it).  
  _Example phrases:_ "work this backlog item", "work on [this backlog doc]", "implement this backlog item", "let's work the backlog", "follow work-backlog-item".

- **[design-new-features.md](./design-new-features.md)** — Designing a new feature and creating a backlog item.  
  _Example phrases:_ "design a new feature", "create a backlog item", "let's design [feature name]", "new feature design", "follow design-new-features".

- **[defining-core-concepts.md](./defining-core-concepts.md)** — Defining or refining how the product works; trickle-down to architecture, user docs, dev docs, backlog.  
  _Example phrases:_ "define a core concept", "we're defining [concept]", "refine the connections doc", "follow defining-core-concepts".

- **[roadmap-review.md](./roadmap-review.md)** — Review and update roadmap current focus and sequence.  
  _Example phrases:_ "review the roadmap", "reprioritize", "roadmap review", "follow roadmap-review".

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
