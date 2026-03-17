---
name: commit
description: Stage all changes and commit using the Conventional Commits format with a bullet-list body.
allowed-tools: Bash
---

## Working tree state

```
!`git status`
```

```
!`git diff HEAD`
```

## Your task

Stage and commit all changes using the Conventional Commits format (enforced by commit-msg hook).

### Commit message format

**Subject line:**
```
type(scope): description
```

- **type** — One of: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`
- **scope** — Area of the codebase (e.g. `llm`, `chat`, `settings`, `agents`). Omit if the change spans multiple unrelated areas.
- **description** — Imperative, lowercase first letter, no period at end.

**Body (required):** blank line after subject, then a bullet list of what was done — by area, feature, or change type (added X, updated Y, removed Z). Include main files/areas touched, new/removed behavior, and any doc/backlog updates. Keep lines to ~72–80 characters.

### Process

1. Identify the primary type and scope from the diff above.
2. Write subject + bullet body.
3. Stage all changes (`git add -A`) unless the user has already staged selectively.
4. Run `git commit` with the message.
5. Show the message used and confirm the commit completed.
