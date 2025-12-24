# Contributing Guide

This document provides guidelines for developers and AI agents working on Cortex.

## AI Agents

If you're an AI agent (Cursor, Claude, GitHub Copilot, etc.), see [AGENTS.md](docs/AGENTS.md) for:
- Structured conversation workflow (Goal → Steps → Propose → Discuss → Implement → Test → Commit)
- Communication principles and pacing guidelines
- When to pause vs proceed
- Agent-specific patterns for different tools

## Feature Development

When implementing new features, follow the workflow defined in [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md).

**Quick summary:**
1. Pick ONE specific example from a use case document
2. Implement through phases: Chat → UI → Integration → Automation docs
3. Pause at decision points for human guidance
4. Create working increments, not perfection

See [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md) for complete details on each phase, success criteria, and common patterns.

## Development Guardrails

These are hard constraints that keep development aligned with Cortex's long-term vision. Follow these rules to maintain architectural integrity and avoid technical debt.

### Technical Constraints (Always Follow)

**TypeScript Everywhere**
- All code must be TypeScript, no plain JavaScript exceptions
- Enables code reuse across web, desktop, and Obsidian plugins
- Provides type safety during rapid iteration

**Desktop-Compatible from Day One**
- Never use browser-only APIs without fallback or abstraction
- Architecture must work for both web and desktop packaging (Electron/Tauri)
- Think: "Will this work when we're not in a browser?"

**Preserve Exact Markdown Formatting**
- File read/write operations must maintain exact formatting
- No introducing extra newlines, changing indentation, or reformatting
- Users need clean diffs to see what actually changed
- Read original file for edits, don't reconstruct from graph

**Comprehensive Logging**
- Log all AI queries and responses
- Log all file read/write operations
- Log user actions and interactions
- Logging is not optional - it enables transparency and automation preparation
- Never skip logging "to move faster"

### Decision Shortcuts (When In Doubt)

**Choose Simpler**
- When multiple valid approaches exist, pick the simpler one
- Build minimum viable increment first
- Add complexity only when value is proven

**Default to Local-First**
- Process data locally unless explicit reason for cloud
- User controls what (if anything) uses cloud services
- Privacy is the default, not an option

**Colocate Related Code**
- Components with their tests and GraphQL queries
- Keep what changes together, together
- Reduces cognitive load and makes refactoring safer

**Manual Before Automated**
- Prove value through manual interaction first
- Don't build automation until pattern is well-understood and proven valuable
- Document automation opportunities, don't implement them immediately

### Red Flags (Never Do This)

**Don't Patch the Graph**
- Never fix data issues by editing graph directly
- Always fix source data or transformation logic
- Graph must remain disposable and rebuildable

**Don't Use Proprietary Formats**
- All data storage must use open, portable formats
- Markdown, JSON, Parquet, CSV - never proprietary or binary-only
- Future you (or users) must be able to read files in any text editor

**Don't Assume User Preferences**
- Make features configurable, not hardcoded
- Privacy boundaries are user-defined
- Feature enablement is user choice
- Never force functionality on users

**Don't Skip Artifacts**
- Each phase of use case workflow produces artifacts
- Tests aren't optional "nice to haves"
- Documentation isn't "we'll add it later"
- Shortcuts compound into technical debt

### Alignment Check

Before implementing a feature, ask:
- ✅ Does this maintain portability to desktop?
- ✅ Does this preserve user data sovereignty?
- ✅ Is this transparent and auditable?
- ✅ Does this respect user agency?
- ✅ Will this work in the local-first model?

If any answer is "no" or "not sure", pause and reconsider the approach.

## Development Logs

When working on significant features or solving complex problems, create a development log to document decisions and solutions for future reference.

Use the template at `devlogs/devlog-template.md` to create new entries with format: `YYYYMMDD-descriptive-title.md`

Development logs help:
- Preserve context about technical decisions
- Document how challenges were overcome
- Provide reference for reconsidering decisions later
- Track AI agent effectiveness and efficiency
- Build institutional knowledge

## Code Style and Conventions

Follow the conventions defined in [DEVELOPMENT.md](./DEVELOPMENT.md#naming-conventions):

- **File naming**: Components (PascalCase), utilities (camelCase), constants (SCREAMING_SNAKE)
- **Directory naming**: kebab-case
- **Component organization**: Colocated tests and GraphQL queries
- **GraphQL**: TypeScript files with gql tagged templates

## Pull Request Process

[TODO: Define PR process once repository workflow is established]

## Questions or Unclear Requirements?

When in doubt:
- Reference [ARCHITECTURE.md](./ARCHITECTURE.md) for principles and decisions
- Check [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md) for feature development patterns
- Pause and ask clarifying questions rather than making assumptions
- Default to simpler approaches when multiple valid options exist

---

*This document will be expanded as contribution patterns emerge and the project matures.*
