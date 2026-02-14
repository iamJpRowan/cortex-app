[Docs](../README.md) / [Agents](./README.md) / Prepare to commit

# Prepare to commit

When the user references this document or asks for a pre-commit review (e.g. "prepare to commit", "review before commit", "pre-commit review", "follow prepare-to-commit"), treat that as **explicit instructions** for this conversation: follow this workflow.

**Intent:** Re-evaluate **all uncommitted code** (every changed and new file in the working tree) so it’s ready to commit: no workarounds, consistent with repo patterns, and aligned with repo documentation. **Do an assessment first and present it to the user before making any edits.** The user gets full context and can confirm (or reject) before updates are made.

## What to check

1. **No weird or inefficient workarounds** — Code should be straightforward. Flag hacks, brittle fixes, or unnecessary complexity that could be simplified.
2. **Existing common patterns** — If the codebase has established patterns (e.g. IPC naming, component structure, state handling), the code should follow them. Call out deviations unless there’s a clear reason.
3. **Repo documentation** — Code should follow guidance in:
   - [Development guide](../development/README.md) (feature-development, electron-guidance, guardrails, etc.)
   - [Design](../design/README.md) (UI guide, design tokens, accessibility where relevant)
   - [Architecture](../architecture/README.md) (principles, technical stack)
   - [CONTRIBUTING](../../CONTRIBUTING.md) (including [commit message format](../../CONTRIBUTING.md#commit-messages)) and any other repo docs that apply.
4. **Relevant documents updated** — All docs that should reflect the change are up to date: backlog item (if working a feature), READMEs, architecture or design docs the change touches, and any linked or referenced docs. Flag any that are missing updates or are now inconsistent.
5. **Commit message** — If the user has proposed or will write a commit message, it should follow [Conventional Commits](https://www.conventionalcommits.org/) as described in CONTRIBUTING (e.g. `type(scope): description`). The repo’s commit-msg hook will reject invalid formats.

## Process

1. **Assess** — Review **all uncommitted code** (staged and unstaged changes; include new and modified files). If the user specifies a narrower scope, use that instead. Evaluate everything in scope against the four checks above. Do **not** make edits yet. Gather every finding: workarounds, pattern violations, doc guidance not followed, and docs that need updating.
2. **Report** — Present the assessment to the user. List each issue clearly (what’s wrong, where, and what guidance or pattern it violates). Give the user full context so they can decide what to do.
3. **Confirm** — Wait for the user to confirm which updates they want (all, some, or none). If anything is unclear, clarify before changing code.
4. **Update** — After the user confirms, make the agreed updates. If the user prefers to fix specific items themselves, note what’s left for them.

## See also

- [CONTRIBUTING](../../CONTRIBUTING.md) — Commit message convention (Conventional Commits)
- [Development guide](../development/README.md) — Patterns and guardrails
- [Guardrails](../development/guardrails.md) — Technical constraints and red flags
