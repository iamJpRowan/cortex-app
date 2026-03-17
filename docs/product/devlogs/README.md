[Docs](../README.md) / Devlogs

# Development Logs

Development logs document significant features, complex problems, and technical decisions for future reference.

## Purpose

Development logs help:
- Preserve context about technical decisions
- Document how challenges were overcome
- Provide reference for reconsidering decisions later
- Track AI agent effectiveness and efficiency
- Build institutional knowledge

## Creating a New Devlog

Use the [TEMPLATE.md](./TEMPLATE.md) to create new entries with format: `YYYY-MM-DD-descriptive-title.md`

**Linking (bi-directional):**

- **Devlog → backlog:** Set `related_backlog` in frontmatter to the **backlog slug(s)** (filename without `.md`), e.g. `[tool-permission-system]`. Path: `docs/product/backlog/{slug}.md` (or `docs/product/backlog/archive/{slug}.md` for archived items).
- **Backlog → devlog:** The backlog item lists this devlog by **devlog ID** (filename without `.md`) in frontmatter `devlogs`, e.g. `devlogs: [2026-02-17-chat-trace-token-usage-and-cleanup]`. Path: `docs/product/devlogs/{id}.md`. [work-backlog-item](../../agents/work-backlog-item.md) close-out adds the new devlog ID to the backlog item so the link is bi-directional. **One devlog per phase** (or per backlog item if there are no phases); append to it as beads within that phase complete. Do not create a new devlog per bead. The devlog for a phase is the primary source the [create-pr-message](../../agents/create-pr-message.md) agent reads to write the PR body and test steps.

Devlogs are where **implementation** for a backlog item is documented as it occurs: approach taken, decisions, what was built, what's remaining. The backlog item holds requirements and success criteria; the devlog holds the narrative of how the work was done.

## Historical Logs

- [2025-02-07-multi-provider-settings-test-refresh-ux.md](./2025-02-07-multi-provider-settings-test-refresh-ux.md) - Multi-provider settings: when provider tests run; per-provider refresh icons (Phase 4 refinement)
- [2025-02-07-multi-provider-phase-3-model-discovery.md](./2025-02-07-multi-provider-phase-3-model-discovery.md) - Multi-Provider Phase 3 — Model discovery & metadata
- [2025-01-25-settings-command-palette-hotkeys.md](./2025-01-25-settings-command-palette-hotkeys.md) - Settings system, command palette (Kbar), app-level hotkeys, and developer documentation
- [2025-01-25-sidebar-layout-implementation.md](./2025-01-25-sidebar-layout-implementation.md) - Sidebar layout with collapsible icon mode and mobile support
- [2025-01-24-react-shadcn-migration.md](./2025-01-24-react-shadcn-migration.md) - Migrate from Vanilla TS and JSX to React and shadcn/ui
- [2025-01-21-langchain-integration.md](./2025-01-21-langchain-integration.md) - LangChain/LangGraph integration
- [2025-01-14-ui-css-guardrails-implementation.md](./2025-01-14-ui-css-guardrails-implementation.md) - UI CSS guardrails implementation
- [2025-01-12-architecture-pivot-to-electron.md](./2025-01-12-architecture-pivot-to-electron.md) - Architecture pivot to Electron
