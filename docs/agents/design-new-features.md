[Docs](../README.md) / [Agents](./README.md) / Design a new feature

# Design a new feature

When the user references this document or says they want to design a new feature or create a backlog item (e.g. "design a new feature", "create a backlog item", "let's design [X]"), treat that as **explicit instructions** for this conversation: follow this workflow.

**How the user may start:** The user will often give a simple goal and some requirements or features, but their approach will not be consistent—sometimes a short goal only, sometimes goal + list, sometimes scattered across messages. Work with whatever they provide; use Goal and Propose to clarify and structure as needed. If they are refining an existing backlog item, treat it like a design session: set its status to `designing`, update the doc as you go, then set status to `considering`/`soon`/`next` when done.

**Doc as state:** The backlog doc(s) (draft or final) should stay an accurate representation of the current design so a new conversation can continue from them. Prefer updating that doc as you go; use chat for questions and short summaries, not long state dumps.

**Output:** One or more backlog items in `docs/backlog/` (see [Backlog README](../backlog/README.md) for structure). Each file is the source of truth for that slice of the design.

**Status:** Put **backlog item status** in **YAML front matter** at the top of each backlog file. Add it when first creating the item (e.g. `designing`) and update it in front matter as you work through the feature requirements. When finishing the feature discussion, **prompt the user** for which status to set (e.g. `considering`, `soon`, `next`) and set it in front matter.

**Shaping backlog items:** Help the user decide when to split the design into multiple backlog items. Splitting makes sense when: a piece can be implemented and validated on its own, boundaries are clear (e.g. one item = one capability or one extension point), or a single item would be too large or would force a big refactor later. Every backlog item should be shaped to support future work: modular boundaries, extensible design, and alignment with the project’s modularity and extensibility approach so that implementing it does not necessitate large refactors later.

## Process

1. **Goal** — Clarify what the feature should achieve (from whatever the user has already shared or by asking).
2. **Propose** — Suggest a concise set of steps or scope. Consider whether the design is one backlog item or several; if several, outline boundaries and dependencies.
3. **Discuss** — Align on approach. Update the (draft) backlog doc(s) with decisions and rationale as you go.
4. **Produce** — Create the backlog file(s) **as soon as you have a minimal shape** (e.g. after Propose). Set **status** to `designing` in **front matter**. By the end of Produce, ensure each file includes at least:
   - **Status in front matter:** `designing` while in progress (then `considering`/`soon`/`next` at Finalize, after prompting the user).
   - Goal/scope and **out-of-scope** (what this item explicitly does not cover).
   - Constraints and requirements.
   - Approach and **decisions** (with rationale).
   - **Dependencies:** list any other backlog items or systems this requires (e.g. "requires: Chat Interface MVP"); note in the doc.
   - Next steps or "Ready for implementation".
   - **Naming and placement:** choose a filename and add the item to the appropriate section in [docs/backlog/README.md](../backlog/README.md).
   - **Links:** link to relevant architecture or design docs; add back-links from those docs to this backlog item where useful.
5. **Review docs** — Review existing documentation (architecture, development, related backlog items). **Make the documentation updates** so the repo stays accurate. If an update is outside what you can edit, note it in the backlog doc. The user can review edits and choose not to commit.
6. **Finalize** — **Prompt the user** for which status to set for each item (`considering`, `soon`, or `next`), then set it in **front matter**. Ensure each backlog doc reflects the agreed design and is ready for a future session to pick up (e.g. via [work-backlog-item.md](./work-backlog-item.md)).

## See also

- [Backlog README](../backlog/README.md) — Structure and conventions for backlog items
- [work-backlog-item.md](./work-backlog-item.md) — Workflow for implementing a backlog item
