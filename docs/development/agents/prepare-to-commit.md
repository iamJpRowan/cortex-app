[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Prepare to commit

# Prepare to commit

**Intent:** Re-evaluate **all uncommitted code** (every changed and new file in the working tree) so it's ready to commit: no workarounds, consistent with repo patterns, and aligned with repo documentation. **Apply all recommended changes**, then report what was updated, what was not, and the reasoning for both. This reduces user turns and acts as a gate to restore consistency if core rules or concepts were lost during implementation.

## What to check

1. **No weird or inefficient workarounds** — Code should be straightforward. Fix or simplify hacks, brittle fixes, or unnecessary complexity where possible.
2. **Existing common patterns** — If the codebase has established patterns (e.g. IPC naming, component structure, state handling), the code should follow them. Align deviations to the pattern unless there's a clear reason to keep them.
3. **Repo documentation** — Code should follow guidance in:
   - [Development guide](../README.md) (feature-development, electron-guidance, guardrails, etc.)
   - [Design](../design/README.md) (UI guide, app components, design tokens, accessibility where relevant)
   - [Architecture](../architecture/README.md) (principles, technical stack)
   - [CONTRIBUTING](../../../CONTRIBUTING.md) and any other repo docs that apply.
4. **Relevant documents updated** — All docs that should reflect the change are up to date: backlog item (if working a feature), READMEs, architecture or design docs the change touches, and any linked or referenced docs. Update any that are missing updates or are now inconsistent.
5. **Session artifacts** — If the changes clearly relate to a backlog item, ensure there is a devlog with `related_backlog` set and the backlog item's status and next steps are accurate. Add or update as needed.
6. **UI and reuse** — For UI changes: use primitives (shadcn, design tokens) and **app components** from the codebase where possible (see [design README](../design/README.md), [app-components](../design/app-components.md)). If something new was added, ensure there is a **written justification** (devlog or comment) for bespoke UI; if an obvious reuse was possible and wasn't done, call it out in the report. **Touches to existing UI:** If changed files include existing views or panels, consider whether the change could have improved the app component layer (extract or adopt). If you refactored toward an app component, say so in the report; if you saw an opportunity but didn't do it, note it (e.g. "Extraction candidate: …") so it can be picked up later.

## Process

1. **Review and update** — Review **all uncommitted code** (staged and unstaged changes; include new and modified files). If the user specifies a narrower scope, use that instead. Evaluate against the six checks above and **apply every recommended change**. For anything ambiguous, make a reasonable choice and note it in the report.
2. **Report** — After making changes, summarize:
   - **What was updated** — List each change (file or area and what was done). Brief reasoning where useful.
   - **What was not updated** — List any item you left unchanged and **why** (e.g. "Left X as-is because…", "Unclear whether A or B; did A because…—say if you prefer B"). So the user has full context and can revert or correct in one turn. If a change was high-impact, call it out so the user can revert if needed.

## See also

- [Development guide](../README.md) — Patterns and guardrails
- [Guardrails](../quality-and-release/guardrails.md) — Technical constraints and red flags
- [Devlogs](../../product/devlogs/README.md) — When you worked a backlog item, ensure devlog and backlog doc are updated before commit
- [Work a backlog item](./work-backlog-item.md) — Close-out and devlog expectations
- [Commit](./commit.md) — When satisfied, use the commit workflow for a consistent commit message
