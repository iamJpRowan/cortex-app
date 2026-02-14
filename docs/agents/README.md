[Docs](../README.md) / Agents

# Agent Instructions

This directory holds **generic instructions** for all agent conversations and **workflow-based instructions** for specific kinds of conversations.

When the user references one of the workflow docs below (by name, file, or similar phrasing), treat that as **explicit instructions** for the current conversation: review that workflow and follow it.

## Generic behavior (all chats)

- Follow the collaboration patterns in [CONTRIBUTING.md](../../CONTRIBUTING.md) and technical constraints in the [development guide](../development/README.md).
- Favor concise explanations; provide detail when asked.
- Pause and clarify when requirements are ambiguous—do not assume.
- If the agreed approach will not work, stop, explain, and ask how to proceed.

## Workflow-based conversations

Each workflow doc is a set of explicit instructions for that conversation type. If the user references the doc or uses phrasing like the following, review that workflow and follow it.

- **[work-backlog-item.md](./work-backlog-item.md)** — Working an existing backlog item (implementing or advancing it).  
  *Example phrases:* "work this backlog item", "work on [this backlog doc]", "implement this backlog item", "let's work the backlog", "follow work-backlog-item".

- **[designing-new-features.md](./designing-new-features.md)** — Designing a new feature and creating a backlog item.  
  *Example phrases:* "design a new feature", "create a backlog item", "let's design [feature name]", "new feature design", "follow designing-new-features".

- **[preparing-to-commit.md](./preparing-to-commit.md)** — Review code before commit: workarounds, patterns, repo docs. Assessment first, then user confirms before updates.  
  *Example phrases:* "prepare to commit", "review before commit", "pre-commit review", "follow preparing-to-commit".

Use one workflow per conversation so the agent has clear intent without loading every pattern.

For workflow-based conversations, keep the relevant doc (backlog item, draft, or devlog) as the source of truth—prefer updating it over long chat so new sessions can start from the doc.

## Implementation reference

For how to build features (IPC, JSX, testing, Electron, etc.), use the [development guide](../development/README.md).
