---
type: story
title: Diff Viewer
status: planned
summary: View diffs of changes agents make to files in a connected local folder.
themes: ["[[ui-features]]", "[[connections]]"]
depends_on:
  - "[[local-folder-connection-type.story.md]]"
---

# Diff Viewer

## Goal

Allow the user to see what an agent changed in files within a connected local folder. This enables the user to review agent work before approving, and supports the "ready to test" review phase of the development workflow.

## Prerequisites / Dependencies

- **[[local-folder-connection-type.story.md]]** — The app must be able to read files from a connected folder before it can compute or display diffs.

## Requirements and constraints

*Needs refinement.* Open design questions:

- What is the diff source? Git diff (requires git integration), in-memory before/after snapshots, or file system timestamps?
- Granularity: per-file diffs, per-commit diffs, or per-agent-session diffs?
- UI: inline diff, side-by-side, or both? Where does it live — a panel, a modal, a dedicated view?
- Can the user revert individual changes from the diff view?

## Success criteria

*To be defined during refinement.*

## References

- [[connections]] — Connection concept and Local Folder requirements.
- [[local-folder-connection-type.story.md]] — Prerequisite backlog item.
