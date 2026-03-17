---
name: prepare-to-commit
description: Review all uncommitted changes, apply fixes, and report what was updated before committing. Run this before /commit.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Working tree state

```
!`git status`
```

```
!`git diff HEAD`
```

## Your task

Review **all uncommitted code** (staged and unstaged changes, new and modified files) and apply the checks below. **Apply every recommended change** — do not just report. Then summarize what was updated and what was not.

### Checks

1. **Repo documentation alignment** — Code and docs should follow:
   - [Development guide](docs/development/README.md) (IPC naming, component structure, Electron patterns)
   - [Design](docs/development/design/README.md) (UI guide, app components, design tokens, accessibility)
   - [Architecture](docs/development/architecture/README.md) (principles, technical stack)
   - [CONTRIBUTING.md](CONTRIBUTING.md)

2. **Relevant documents updated** — All docs that should reflect the change are current: the backlog story file (if working a feature), READMEs, architecture or design docs the change touches, and any linked/referenced docs. Update any that are missing or now inconsistent.

3. **Session artifacts** — If the changes relate to a backlog story, ensure there is a devlog with `related_backlog` set and the story's `status` is accurate. Add or update as needed.

4. **UI and reuse** — For UI changes: use shadcn primitives, design tokens, and app components where possible (see [app-components](docs/development/design/app-components.md)). If something new was added bespoke, note why. If an obvious reuse opportunity was missed, call it out as an extraction candidate.

5. **No weird workarounds** — Fix or simplify hacks, brittle fixes, or unnecessary complexity.

### Report

After applying changes:

**Updated:** list each file/area changed and what was done.

**Not updated:** list anything left unchanged and why. Flag any high-impact change so the user can revert if needed.
