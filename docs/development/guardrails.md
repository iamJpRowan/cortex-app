[Docs](../README.md) / [Development](./README.md) / Development Guardrails

# Development Guardrails

These are hard constraints that keep development aligned with Cortex's long-term vision. Follow these rules to maintain architectural integrity and avoid technical debt.

## Technical Constraints (Always Follow)

### TypeScript Everywhere
- All code must be TypeScript, no plain JavaScript exceptions
- Enables code reuse across web, desktop, and Obsidian plugins
- Provides type safety during rapid iteration

### Desktop-Compatible from Day One
- Never use browser-only APIs without fallback or abstraction
- Architecture must work for both web and desktop packaging (Electron/Tauri)
- Think: "Will this work when we're not in a browser?"

### Preserve Exact Markdown Formatting
- File read/write operations must maintain exact formatting
- No introducing extra newlines, changing indentation, or reformatting
- Users need clean diffs to see what actually changed
- Read original file for edits, don't reconstruct from graph

### Comprehensive Logging
- Log all AI queries and responses
- Log all file read/write operations
- Log user actions and interactions
- Logging is not optional - it enables transparency and automation preparation
- Never skip logging "to move faster"

## Decision Shortcuts (When In Doubt)

### Choose Simpler
- When multiple valid approaches exist, pick the simpler one
- Build minimum viable increment first
- Add complexity only when value is proven

### Default to Local-First
- Process data locally unless explicit reason for cloud
- User controls what (if anything) uses cloud services
- Privacy is the default, not an option

### Colocate Related Code
- Components with their tests and GraphQL queries
- Keep what changes together, together
- Reduces cognitive load and makes refactoring safer

### Manual Before Automated
- Prove value through manual interaction first
- Don't build automation until pattern is well-understood and proven valuable
- Document automation opportunities, don't implement them immediately

## Red Flags (Never Do This)

### Don't Patch the Graph
- Never fix data issues by editing graph directly
- Always fix source data or transformation logic
- Graph must remain disposable and rebuildable

### Don't Use Proprietary Formats
- All data storage must use open, portable formats
- Markdown, JSON, Parquet, CSV - never proprietary or binary-only
- Future you (or users) must be able to read files in any text editor

### Don't Assume User Preferences
- Make features configurable, not hardcoded
- Privacy boundaries are user-defined
- Feature enablement is user choice
- Never force functionality on users

### Don't Skip Artifacts
- Each phase of use case workflow produces artifacts
- Tests aren't optional "nice to haves"
- Documentation isn't "we'll add it later"
- Shortcuts compound into technical debt

## Alignment Check

Before implementing a feature, ask:
- ✅ Does this maintain portability to desktop?
- ✅ Does this preserve user data sovereignty?
- ✅ Is this transparent and auditable?
- ✅ Does this respect user agency?
- ✅ Will this work in the local-first model?

If any answer is "no" or "not sure", pause and reconsider the approach.

## See Also

- [Architecture Principles](../architecture/principles.md) - The principles these guardrails protect
- [Development Patterns](./patterns.md) - Patterns that follow these guardrails
- [Use Case Workflow](./use-case-workflow.md) - How to implement features within these constraints
- [Architecture Security](../architecture/security.md) - Security-related guardrails
