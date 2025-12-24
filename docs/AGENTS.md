# AI Agent Development Guide

This guide defines how AI agents (Cursor, Claude, GitHub Copilot, autonomous bots, etc.) should collaborate with developers when working on Cortex.

## Conversation Workflow

Each development conversation follows a structured goal-oriented process:

### 1. Goal Setting
- User defines the functionality goal for the conversation
- AI proposes a concise set of implementation steps
- Discussion until approach is aligned

### 2. Step-by-Step Implementation

For each step, follow this cycle:

1. **Propose** - AI suggests specific changes for the current step
2. **Discuss** - Back and forth until approach is agreed
   - User asks for clarifications and defines criteria
   - Agent provides confirmation of understanding and answers questions
   - Agent should only produce full updated plan when prompted to do so
3. **Implement** - User explicitly instructs AI to implement
4. **Test** - AI prompts user to test; work through bugs/adjustments
5. **Commit** - Once satisfied, commit changes with appropriate semantic prefix
6. **Repeat** - Proceed to next step

### Workflow Rules

**Pacing and Confirmation:**
- Keep step proposals focused and concise
- Don't proceed to detailing steps until explicitly instructed
- Don't proceed to implementation until explicitly instructed
- Always prompt for testing after implementation
- Commit after each completed step, not in bulk at the end

**Critical: Stop When Approach Fails**
If at any point the agreed-upon approach is determined not to work:
1. **STOP implementing immediately**
2. Explain the issue clearly
3. Ask how to proceed rather than assuming a fix

**When to Pause vs Proceed:**
- **Pause:** Architectural decisions, multiple valid approaches, unclear requirements
- **Proceed:** Following established patterns, iterating within agreed approach, path is unambiguous

## Agent-Specific Patterns

### Cursor IDE
- File-focused operations with `.cursorrules` guidance
- References this document for collaboration patterns
- Good for: Component creation, refactoring, testing
- Limitation: Single-file focus; use Claude for multi-file workflows

### Claude (Desktop/Chat)
- Multi-file workflows and architectural discussions
- Follows [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md) for feature implementation
- Good for: Feature planning, cross-cutting changes, research
- Use: Computer use tools for file operations when appropriate

### GitHub Copilot
- Code completion and inline suggestions
- Reads `.github/copilot-instructions.md` if present
- Good for: Boilerplate, test generation, documentation
- Limitation: Less conversational; better for autocomplete

### Autonomous Agents (PR Bots)
- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines and guardrails
- Should reference [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md) for feature structure
- Must follow all technical constraints and red flags
- Should include rationale in PR descriptions

## Communication Principles

### Conciseness
- Default to brief, focused responses
- Provide detail only when asked or when complexity demands it
- Ask clarifying questions rather than writing walls of text
- Remember: human context window is much smaller than AI's

### Incremental Disclosure
When discussing multi-faceted topics:
1. Start with concise summary of overall structure
2. Align on high-level approach first
3. Work through details one topic at a time
4. Confirm completion of each topic before moving to next
5. Avoid introducing new context mid-discussion

### Question Patterns
- Ask specific questions, not open-ended "what do you think?"
- Present options with tradeoffs when multiple approaches exist
- Frame questions in context of architectural principles
- Provide enough background so user understands why it matters

### Assumption Avoidance
- Never assume user requirements or preferences
- When unclear, ask rather than implement
- Make implicit decisions explicit for confirmation
- Default to simpler approach when in doubt

## Feature Development Integration

When implementing features from use cases, combine this conversation workflow with the [USE_CASE_WORKFLOW.md](./USE_CASE_WORKFLOW.md) phases:

**Within each phase:**
1. **Goal Setting** - Align on what this phase should accomplish
2. **Step-by-Step** - Break phase into implementable steps
3. Follow the propose → discuss → implement → test → commit cycle
4. **Phase Complete** - Confirm phase success criteria met before moving to next

**Example: Phase 2 (Bespoke UI Component)**
- Goal: "Build person timeline visualization"
- Steps: Mock component structure → Add GraphQL query → Connect data → Style → Test edge cases
- Each step: Propose approach → Discuss → Get explicit go-ahead → Implement → Test → Commit
- Phase complete when all success criteria met

## Development Guardrails for Agents

AI agents must follow the technical constraints and red flags defined in [CONTRIBUTING.md](../CONTRIBUTING.md#development-guardrails):

**Always:**
- Use TypeScript (no plain JavaScript)
- Ensure desktop compatibility (no browser-only APIs)
- Preserve exact Markdown formatting
- Log comprehensively (queries, file ops, actions)

**Never:**
- Patch graph directly (fix source or transformation)
- Use proprietary data formats
- Assume user preferences (make configurable)
- Skip artifacts (tests, docs are not optional)

**When in doubt:**
- Choose simpler approach
- Default to local-first
- Colocate related code
- Prove manually before automating

## Context Preservation

### Between Conversations
- Reference previous devlogs when similar problems were solved
- Link to related features or decisions
- Build on established patterns rather than reinventing
- Update documentation as patterns emerge

### Within Conversations
- Maintain awareness of decisions made earlier in conversation
- Don't contradict previous agreements without discussion
- Reference user's stated goals and constraints
- Track what's been implemented vs what's planned

### Documentation
- Create devlog when solving significant problems
- Document automation opportunities during Phase 4
- Update USE_CASE_WORKFLOW with lessons learned
- Note technical debt or deferred decisions

## Multi-Turn Collaboration

### For Long Features (Multiple Conversations)
1. **End each session** with clear summary:
   - What was completed
   - What's next
   - Open questions or blockers
2. **Start next session** by reviewing:
   - Previous session's summary
   - Current codebase state
   - Remaining work

### For Interrupted Work
1. **Before stopping:** Create detailed notes in devlog
2. **When resuming:** Read relevant devlogs
3. **Validate assumptions:** Check if anything changed
4. **Continue pattern:** Pick up conversation workflow where it left off

## Effective Agent Usage

### Choose the Right Agent
- **Cursor**: Single-file edits, component creation, refactoring
- **Claude**: Multi-file features, architecture discussions, research
- **Copilot**: Boilerplate, repetitive patterns, autocomplete
- **Autonomous**: Well-defined PRs with clear acceptance criteria

### Switching Between Agents
- Document current state before switching
- New agent should read relevant context (devlogs, current files)
- Don't assume new agent knows conversation history
- Re-establish goals and constraints

### Agent Limitations
- Agents don't remember between sessions (read devlogs!)
- Agents can't access user's full mental model (ask questions!)
- Agents work best with explicit, structured instructions
- Agents should never replace human judgment on architecture

## Summary

**Core principles for AI agents working on Cortex:**
1. **Structured workflow**: Goal → Steps → Propose → Discuss → Implement → Test → Commit
2. **Human in control**: Explicit permission required to proceed with implementation
3. **Stop when stuck**: Explain issues rather than pushing forward
4. **Concise communication**: Brief responses, incremental disclosure
5. **Follow guardrails**: Technical constraints are non-negotiable
6. **Build on patterns**: Reference existing code and documentation
7. **Document learnings**: Create devlogs, update workflows

The goal is productive collaboration where AI agents enhance development velocity while maintaining code quality and architectural integrity.

---

*This guide will evolve based on real collaboration patterns. Update it as new practices emerge.*
