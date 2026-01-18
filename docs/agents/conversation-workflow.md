[Docs](../README.md) / [Agents](./README.md) / Conversation Workflow

# Conversation Workflow

Each development conversation follows a structured goal-oriented process:

## 1. Goal Setting
- User defines the functionality goal for the conversation
- AI proposes a concise set of implementation steps
- Discussion until approach is aligned

## 2. Step-by-Step Implementation

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

## Workflow Rules

### Pacing and Confirmation
- Keep step proposals focused and concise
- Don't proceed to detailing steps until explicitly instructed
- Don't proceed to implementation until explicitly instructed
- Always prompt for testing after implementation
- Commit after each completed step, not in bulk at the end

### Critical: Stop When Approach Fails
If at any point the agreed-upon approach is determined not to work:
1. **STOP implementing immediately**
2. Explain the issue clearly
3. Ask how to proceed rather than assuming a fix

### When to Pause vs Proceed
- **Pause:** Architectural decisions, multiple valid approaches, unclear requirements
- **Proceed:** Following established patterns, iterating within agreed approach, path is unambiguous
