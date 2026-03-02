[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Commit

# Commit

**Intent:** Make the commit. The user calls this workflow only when they are fully ready to commit (e.g. after [prepare-to-commit](./prepare-to-commit.md)). Produce a consistent commit message per the template below, then stage and run `git commit` so the commit is done. The repo uses [Conventional Commits](https://www.conventionalcommits.org/); a commit-msg hook enforces the format.

## Commit message template

**Subject line (required):**
```
type(scope): description
```

- **type** (required) — One of: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.
- **scope** (optional) — Area of the codebase, e.g. `llm`, `chat`, `settings`, `agents`. Omit if the change doesn't fit a single area.
- **description** (required) — Imperative, lowercase first letter, no period at the end. One logical change per commit.

**Body (required):**

- Add a blank line after the subject, then a body that makes it **easy to scan what was in the commit**.
- Use a **bullet list** of what was done: by area (e.g. backend, UI, docs), by feature, or by change type (added X, updated Y, removed Z). One line per bullet is enough; only add detail where it clarifies.
- Include: main files or areas touched, new or removed behavior, and any doc/backlog updates that are part of the commit. Omit trivial or obvious items if the list would be long.
- Keep lines in the body to a reasonable width (e.g. 72–80 characters) if wrapping; bullets can be short single lines.
- Do not repeat the subject line in the body.

Example:
```
feat(agents): add commit workflow and prepare-to-commit apply-then-report

- Add docs/development/agents/commit.md with subject/body template and process
- Update prepare-to-commit: apply all changes then report; remove commit check
- Add commit to agents README table and workflow list
- See also links between prepare-to-commit and commit
```

## Process

1. **Review changes** — Look at what is staged or all uncommitted changes. Identify the primary type and scope from the diff.
2. **Produce message** — Write a commit message: subject line per the template above, then a body with a bullet list summarizing what was in the commit.
3. **Stage and commit** — Stage all changes that should be included (e.g. `git add -A` or only currently staged if the user has already staged). Run `git commit` with the message (use `-m` for subject and `-m` for body, or write to a temp file and use `git commit -F`). Show the user the message that was used and confirm the commit was made.

## See also

- [CONTRIBUTING](../../../CONTRIBUTING.md) — Commit message convention
- [prepare-to-commit](./prepare-to-commit.md) — Review and fix code/docs before committing
