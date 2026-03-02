# Contributing Guide

This document provides guidelines for developers and AI agents working on Cortex.

## How development works

Development follows a consistent loop: **concepts** (define how the product works → doc trickle-down) → **roadmap** (you sequence and set current focus) → **implementation** (agent works current-focus item until **ready to test**) → **you test and refine** (via UI, and/or refine requirements) → **complete** (you mark done and archive). For the full picture, see [how we work](docs/development/agents/how-we-work.md) and the [agents guide](docs/development/agents/README.md).

## AI Agents

If you're an AI agent (Cursor, Claude, GitHub Copilot, etc.), see the [agents guide](docs/development/agents/README.md) for:
- [How we work](docs/development/agents/how-we-work.md) — Intended development loop and who does what
- Workflow-based conversations (work backlog item, design features, roadmap review, backlog grooming, docs cleanup, define core concepts, prepare to commit)
- When to pause vs proceed
- Implementation reference (development guide, guardrails)

## Feature Development

When implementing new features, follow the workflow defined in [feature-development.md](docs/development/development-patterns/feature-development.md).

**Quick summary:**
1. Pick ONE specific example from a use case document
2. Implement through phases: Chat → UI → Integration → Automation docs
3. Pause at decision points for human guidance
4. Create working increments, not perfection

## Development Guardrails

These are hard constraints that keep development aligned with Cortex's long-term vision. See [guardrails.md](docs/development/quality-and-release/guardrails.md) for:
- Technical constraints (TypeScript everywhere, desktop-compatible, preserve formatting, comprehensive logging)
- Decision shortcuts (choose simpler, local-first, colocate code, manual before automated)
- Red flags (don't patch graph, don't use proprietary formats, don't assume preferences, don't skip artifacts)
- Alignment check questions

## Development Logs

When working on significant features or solving complex problems, create a development log to document decisions and solutions for future reference.

Use the template at [devlogs/TEMPLATE.md](docs/product/devlogs/TEMPLATE.md) to create new entries with format: `YYYY-MM-DD-descriptive-title.md`

Development logs help:
- Preserve context about technical decisions
- Document how challenges were overcome
- Provide reference for reconsidering decisions later
- Track AI agent effectiveness and efficiency
- Build institutional knowledge

## Code Style and Conventions

Follow the conventions defined in [code-style.md](docs/development/quality-and-release/code-style.md):
- **File naming**: Components (PascalCase), utilities (camelCase), constants (SCREAMING_SNAKE)
- **Directory naming**: kebab-case
- **Component organization**: Colocated tests and GraphQL queries
- **GraphQL**: TypeScript files with gql tagged templates

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/): **type** (optional **scope**), then a short description.

- **Format:** `type(scope): description` or `type: description`
- **Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, etc.
- **Scope (optional):** area of the codebase, e.g. `feat(llm): add provider adapter`
- **Description:** imperative, lowercase start; no period at the end.

Examples: `feat: implement command palette`, `fix: keep new conversation selected`, `docs: restructure agents and development docs`. A commit-msg hook runs on every commit to enforce this format.

## Pull Request Process

[TODO: Define PR process once repository workflow is established]

## Questions or Unclear Requirements?

When in doubt:
- Reference [architecture documentation](docs/development/architecture/README.md) for principles and decisions
- Check [feature-development.md](docs/development/development-patterns/feature-development.md) for feature development patterns
- Pause and ask clarifying questions rather than making assumptions
- Default to simpler approaches when multiple valid options exist

---

*This document will be expanded as contribution patterns emerge and the project matures.*
