# Use Case Workflow Guide

## Introduction

### Purpose

This document guides the implementation of individual features from the use case idea library. Use case documents (in `/Use Cases/`) contain collections of potential enhancements - chat queries, UI components, data integrations, and automation opportunities. This workflow shows how to take ONE specific example and implement it end-to-end.

**Who uses this:**
- You, when implementing features incrementally
- AI agents working with you on feature development

**How it fits with other documentation:**
- **Use Case documents**: Idea repositories - what could be built
- **This document**: Implementation workflow - how to build one thing at a time
- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Practical setup and tooling - how to run and configure
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Principles and decisions - why things are built this way

### How to Use This Guide

**Starting point:**
Begin each feature with: "I want to implement [specific example] from [use case document]"

Example: "I want to implement 'Show me all interactions with Sarah last month' from Person File Enhancement"

**Expectations:**
- Work through phases sequentially, not all at once
- Each phase produces a complete, working increment
- Pause at decision points for human confirmation
- Not every feature needs all four phases

**Key principles:**
- **One feature at a time** - Don't try to implement entire use case at once
- **Vertical slice** - Touch all necessary layers (chat, UI, data, automation notes)
- **Manual proof first** - Demonstrate value before building automation
- **AI asks, not assumes** - When uncertain, pause and clarify

**What this is NOT:**
- Not a waterfall process - iterate within phases as needed
- Not required to complete all 4 phases for every feature
- Not prescriptive about which use case to work on when
- Not a substitute for architectural judgment

---

## The Four-Phase Pattern

### Overview of the Cycle

Each feature follows this progression:

**Phase 1: Chat Exploration** → **Phase 2: Bespoke UI** → **Phase 3: Data Integration** → **Phase 4: Automation Documentation**

**Why this sequence:**
- Prove value manually before building complexity
- Learn about data and graph structure through exploration
- UI emerges from understanding the insight, not speculation
- Integration only when external data proves necessary
- Automation only after manual patterns are proven valuable

### What Happens in Each Phase

**Phase 1: Chat Exploration (Always Required)**
Make the query work conversationally. LLM generates Cypher, results are useful, foundation is solid.

**Phase 2: Bespoke UI Component (Usually Required)**
Visualize results beyond chat interface. Build the specific view that makes this insight clear and actionable.

**Phase 3: Data Integration (Conditional)**
Enrich with external data sources only if needed for this specific feature. Follow ELT pattern, respect source-appropriate flow.

**Phase 4: Automation Documentation (Observational)**
Capture what could eventually be automated. Document the pattern, don't build it yet.

### Phase Dependencies

- **Phase 1** is always required - foundation for everything else
- **Phase 2** usually follows - better UX than chat alone for most insights
- **Phase 3** is conditional - only proceed if external data enriches this specific feature
- **Phase 4** is observational - always capture opportunities, rarely build immediately

### Iteration Within Phases

Each phase may take multiple cycles to refine:
- Don't rush to the next phase
- Make the current phase solid before moving forward
- It's okay to go back to earlier phases when you learn something new
- "Complete enough to learn from" beats "perfect"

---

## Phase 1: Chat Exploration

### Principles

- Start with the simplest version of the query
- Focus on getting LLM → Cypher → results working
- Identify graph structure gaps early
- Document what's hard for the LLM to navigate
- Test edge cases (no results, multiple results, missing data)

### Success Criteria

✅ Query returns expected results
✅ LLM consistently generates correct Cypher
✅ Response is useful and actionable
✅ No obvious graph schema issues blocking progress
✅ Ready to show this insight visually

### Artifacts Created

- GraphQL queries/mutations (if new ones needed)
- LLM prompt refinements (in `src/server/llm/`)
- Chat session logs (JSONL files)
- Notes on graph structure improvements needed
- Documentation of query patterns that work well

### Decision Points (When AI Should Pause and Ask)

❓ "Graph doesn't have the data needed - should we add it now or defer this feature?"
❓ "Multiple ways to structure this query - which makes more sense for your use case?"
❓ "Query works but LLM struggles to generate it - fix prompt or restructure graph?"
❓ "Ready to move to UI phase or iterate more on the query?"
❓ "Should this query be added to GraphQL schema or remain LLM-generated?"

### Common Patterns

**Start broad, then filter:**
- Begin with "show me all X"
- Then add constraints based on what you learn
- Refine until the signal-to-noise ratio is right

**Test edge cases:**
- What if there are no results?
- What if there are hundreds of results?
- What if key relationships are missing?

**Verify graph traversal:**
- Are relationships connecting correctly?
- Are entity types being distinguished properly?
- Is the query path intuitive for the LLM?

---

## Phase 2: Bespoke UI Component

### Principles

- Reuse existing components when possible
- Build new when chat/existing UI can't convey the insight well
- Focus on the specific use case, not generic dashboards
- Component should make patterns/insights immediately visible
- Follow established component patterns (colocated, typed, tested)

### Success Criteria

✅ Visualization clearly communicates the insight
✅ Data loads and renders correctly
✅ Component is responsive and performs well
✅ Follows project conventions (naming, structure, colocation)
✅ Has at minimum a basic render test

### Artifacts Created

- React component(s) in `src/client/components/[feature-name]/`
- GraphQL queries colocated with component (`*.queries.ts`)
- Component tests (`*.test.tsx`)
- Navigation/routing to access the component
- Any reusable sub-components extracted to shared location

**Note:** Follow naming conventions and component organization patterns from [DEVELOPMENT.md](./DEVELOPMENT.md#naming-conventions).

### Decision Points (When AI Should Pause and Ask)

❓ "Should this extend an existing component or create a new one?"
❓ "What visualization type best serves this data?" (timeline, graph, table, map, chart, etc.)
❓ "Does this need interactivity or just display?"
❓ "Should this be a standalone page or embedded widget?"
❓ "Ready to move to integration phase, or does UI need refinement?"

### Common Patterns

**Build incrementally:**
1. Start with static/mock data to test layout
2. Connect to GraphQL and handle loading states
3. Add styling and polish
4. Add interactions if needed

**Test with edge cases:**
- Empty state (no data to display)
- Loading state (data fetching)
- Error state (query failed)
- Large dataset (performance considerations)

**Component structure:**
```
feature-name/
  FeatureName.tsx           # Main component
  FeatureName.queries.ts    # GraphQL queries
  FeatureName.test.tsx      # Tests
  index.ts                  # Re-export
```

---

## Phase 3: Data Integration

### Principles

- Only proceed if external data actually enriches this specific feature
- Follow ELT pattern: extract → load native format → transform for graph
- Use Integration Heuristic: "Would I reference this in my Notes?"
  - Yes → Markdown files
  - No → Structured data (JSON/Parquet/CSV)
- Respect source-appropriate data flow (local vs external)
- Start with manual/one-time import before building automated sync

### Success Criteria

✅ Data successfully extracted from source
✅ Stored in appropriate format (Markdown vs structured data)
✅ Graph transformation logic handles new data
✅ Entity resolution works across sources (if applicable)
✅ Feature now displays enriched data
✅ Sync strategy documented (one-time vs ongoing)

### Artifacts Created

- Integration code in `src/integrations/[source-name]/`
- Transformation logic for graph loading
- Sample data or test fixtures
- Configuration for API credentials/endpoints
- Documentation of sync strategy and limitations

### Decision Points (When AI Should Pause and Ask)

❓ "Is external data actually needed or can we prove value without it first?"
❓ "Which storage format - Markdown or structured data?"
❓ "One-time import or ongoing sync?"
❓ "How should we handle API rate limits and errors?"
❓ "Entity resolution strategy for matching data across sources?"
❓ "Should sync be manual trigger or scheduled?"

### Common Patterns

**Start simple:**
- Manual one-time import first
- Prove value before building automated sync
- Test with small dataset before full import

**Storage decision tree:**
```
Would I want to reference this in my Notes?
├─ YES → Markdown with YAML frontmatter
│         (events, insights, meaningful activities)
└─ NO  → Structured data (JSON/Parquet/CSV)
          (metrics, logs, high-volume streams)
```

**Testing integration:**
1. Extract small sample dataset
2. Verify transformation logic on sample
3. Load into graph and verify structure
4. Test feature with enriched data
5. Document any source-specific quirks

---

## Phase 4: Automation Documentation

### Principles

- Observe and document, don't build yet
- Capture what felt repetitive or valuable during manual work
- Note frequency needed (daily, weekly, on-demand, event-triggered)
- Identify what context and triggers would be required
- Build automation only after multiple use cases establish clear patterns

### Success Criteria

✅ Automation opportunity clearly described
✅ Potential value articulated
✅ Frequency or trigger identified
✅ Prerequisites and dependencies noted
✅ Logged in consistent format for later review

### Artifacts Created

- Entry in automation candidates log (use template at `automation-candidates/TEMPLATE.md`)
- Reference to related chat sessions showing the pattern
- Notes on what data/context the automation would need
- Links to relevant devlogs if applicable

### Decision Points (When AI Should Pause and Ask)

❓ "Is this pattern actually repetitive enough to justify automation?"
❓ "Should this be scheduled (daily/weekly) or event-triggered?"
❓ "Does this depend on other automations being built first?"
❓ "Is the manual process well-understood enough to automate?"

### Common Patterns

**Review chat logs:**
- Look for repeated similar queries
- Identify manual enrichment steps
- Note pattern recognition opportunities

**Identify automation triggers:**
- **Scheduled**: "Every Monday, summarize last week's activities"
- **Event-driven**: "When new Strava activity syncs, check for route patterns"
- **On-demand**: "Generate person interaction summary when viewing profile"
- **Threshold-based**: "Alert when haven't contacted someone in 60 days"

**Documentation format:**

Use the template at `automation-candidates/TEMPLATE.md` to create new automation candidate documents with consistent structure.

Key fields to include:
- Use case, trigger type, description
- Value proposition and frequency
- Prerequisites and dependencies  
- Observed patterns from chat sessions
- Effort estimate and priority

---

## Workflow Principles

### When to Pause vs Proceed

**Pause when:**
- Encountering architectural decisions that affect multiple features
- Multiple valid approaches exist and choice isn't obvious
- Unclear about which principle applies to current situation
- About to make assumption about user preferences or requirements
- Hitting limitations that might require rethinking approach

**Proceed when:**
- Following established patterns from previous features
- Iterating within current phase to refine implementation
- Decision aligns clearly with documented principles
- Path forward is unambiguous and low-risk

### How to Handle Uncertainty

**Ask clarifying questions:**
- Don't assume requirements - ask specific questions
- Present options with tradeoffs rather than choosing arbitrarily
- Reference architecture principles to frame decisions
- Provide context for why the question matters

**Default to simpler approach:**
- When multiple valid options exist, prefer simpler
- Build minimum viable increment first
- Add complexity only when value is proven
- Document deferred complexity for later consideration

**Reference existing patterns:**
- Look at how similar features were implemented
- Follow established component structures
- Reuse transformation patterns where applicable
- Maintain consistency with codebase conventions

### Iteration vs Completion

**Each phase can iterate:**
- Multiple cycles within a phase before moving forward
- Refining based on what's learned
- Going back to earlier phases when new information emerges
- "Complete enough to learn from" is the goal

**What "complete" means:**
- **Phase 1**: Query reliably returns useful results
- **Phase 2**: Visualization clearly conveys the insight
- **Phase 3**: Data flows correctly and enriches the feature
- **Phase 4**: Opportunity is documented with sufficient detail

**Ship working increments:**
- Don't wait for perfection before moving to next phase
- Each phase should produce something functional
- Document what was deferred vs what was finished
- Build on working foundation incrementally

### Working with AI Agents

**Clear starting point:**
State the specific feature being implemented: "I want to implement [feature] from [use case]"

**Confirm phase transitions:**
Explicitly agree to move to next phase rather than assuming readiness

**Review artifacts together:**
- Examine generated code, queries, components
- Validate against success criteria
- Iterate before considering phase complete

**Human has final say:**
- AI proposes approaches and asks questions
- Human makes architectural and priority decisions
- AI executes implementation based on guidance
- Human validates results and decides next steps

**Maintain context:**
- Reference previous decisions and patterns
- Link to relevant devlogs when similar problems were solved
- Build institutional knowledge through documentation
- Learn from each feature to improve the next

---

## Summary

This workflow enables rapid, incremental feature development:

1. **Pick one specific example** from a use case document
2. **Work through phases** sequentially with iteration
3. **Pause at decision points** for human guidance
4. **Create working artifacts** at each phase
5. **Document learnings** for future features

The goal is not perfection in a single pass, but steady accumulation of working features that prove value and reveal patterns worth automating.

Start small. Ship increments. Learn continuously. Build the system that improves both its data model and its tooling through use.

---

*This workflow will evolve based on actual development experience. Update it as patterns emerge and practices solidify.*
