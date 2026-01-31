[Docs](../README.md) / [Backlog](./README.md) / Sub-Agent Delegation

# Sub-Agent Delegation

## Goal

Enable agents to delegate tasks to other agents (sub-agents), allowing for specialized task decomposition and collaboration between different agent configurations. A parent agent can invoke a sub-agent to handle specific subtasks, then continue with the results.

This feature builds on LangChain Deep Agents' native sub-agent capabilities, adding a user-configurable permission layer and integration with Custom Agents.

## Prerequisites

- **[Custom Agents](./custom-agents.md)** - Must be complete. Provides agent configuration, registry, and management.
- **[Deep Agents Adoption](./deep-agents-adoption.md)** - Must be complete. Provides native sub-agent capabilities via `task()` tool.
- **[Tool Permission System](./tool-permission-system.md)** - Should be complete for permission scoping.

## Key Capabilities

### Sub-Agent Configuration

Agents can specify which other agents they're allowed to delegate to:

```yaml
---
id: research-coordinator
name: Research Coordinator
# ... other fields ...

subagents:
  allow:                            # Agents this agent can delegate to
    - data-analyst
    - citation-checker
    - web-researcher
  deny:                             # Agents explicitly denied
    - code-helper                   # Prevent scope creep
---
```

**Permission Rules:**
- Sub-agent permissions follow the same intersection model as tools
- A parent agent cannot delegate to an agent that the user has disabled
- Sub-agents cannot have more tool permissions than the parent grants
- Recursive delegation (sub-agent calls sub-agent) requires explicit configuration

### Runtime Invocation

Sub-agents are invoked via a `delegate` tool that the parent agent can call during execution. This aligns with Deep Agents' `task()` tool pattern.

**The `delegate` Tool:**
```
delegate(
  agent: string,           # ID of sub-agent to invoke
  task: string,            # Task description for sub-agent
  context?: "full" | "summary" | "task_only"  # Context passing mode
)
```

**Example usage by parent agent:**
```
I need to analyze this data. Let me delegate to the data-analyst.
[calls delegate(agent="data-analyst", task="Analyze sales trends for Q4")]
```

**Stateless Execution:**
- Sub-agents are ephemeral—they execute autonomously until completion
- Sub-agents cannot send multiple messages back; they return a single final result
- Each delegation creates a fresh agent instance with isolated context
- This matches Deep Agents' model: "subagents are stateless"

### Delegation Model

**Context Passing:**
- Parent agent can pass full conversation history, summary, or just the delegated task
- Configurable per delegation (or per agent default)
- Options: `full_history`, `summary`, `task_only`
- Default: `task_only` (minimizes token usage, matches Deep Agents best practice)

**Return Handling:**
- Sub-agent returns structured result to parent
- Parent can use result to continue its own processing
- Results can be: text response, structured data, or error
- Sub-agent should return concise summaries, not raw data (Deep Agents best practice)

**Error Handling:**
- Sub-agent failures return to parent with error information
- Parent can retry, try different sub-agent, or fail gracefully
- Configurable retry policies

### General-Purpose Delegation

In addition to named custom agents, a parent can delegate to a "general-purpose" sub-agent:

**Use case:** Context isolation without specialization—offload a complex multi-step task to keep the main agent's context clean.

```
delegate(agent="general-purpose", task="Research quantum computing trends")
```

The general-purpose sub-agent:
- Has the same tools and system prompt as the parent
- Provides pure context isolation
- Useful when you don't need specialized instructions, just want to prevent context bloat

### Delegation Tracking

- All delegations logged in conversation trace
- Each delegation shows:
  - Parent agent ID
  - Sub-agent ID
  - Task delegated
  - Context passed
  - Result returned
  - Duration
- User can see full delegation chain in trace view

### Permission Scoping

**Principle of Least Privilege:**
- Sub-agent tools are intersection of: global permissions ∩ parent permissions ∩ sub-agent permissions
- A parent cannot grant more permissions than it has
- A sub-agent cannot exceed its own configured permissions

**Example:**
```
Global: allows [neo4j, web, filesystem]
Parent (Research Coordinator): allows [neo4j, web], denies [filesystem]
Sub-agent (Data Analyst): allows [neo4j], denies [web]

Effective sub-agent permissions: [neo4j] only
```

### Parallel Execution

Sub-agents can run simultaneously when tasks are independent, enabling multi-threaded delegation:

**Parallel Delegation:**
- Parent agent can delegate to multiple sub-agents concurrently
- Independent tasks execute in parallel threads
- Results collected and aggregated when all complete (or as they complete)
- Significant performance improvement for multi-step workflows

**Execution Modes:**
- `parallel`: All delegations run simultaneously, wait for all to complete
- `parallel_streaming`: Delegations run simultaneously, results stream back as each completes
- `sequential`: Delegations run one at a time (for dependent tasks)

**Configuration:**
```yaml
subagents:
  allow:
    - data-analyst
    - citation-checker
    - web-researcher
  execution: parallel          # Default execution mode for this agent's delegations
  max_concurrent: 3            # Maximum simultaneous sub-agents (default: 5)
```

**Runtime Control:**
- Parent agent can specify execution mode per delegation batch
- Can mix parallel and sequential in same workflow
- Dependency graph support: "run A and B in parallel, then C after both complete"

**Resource Management:**
- Configurable concurrency limits (global and per-agent)
- Prevents resource exhaustion from too many parallel executions
- Queue management for delegations exceeding limit

### Depth Limits

- Maximum delegation depth configurable (default: 3)
- Prevents runaway recursive delegation
- Clear error when depth exceeded
- Depth tracked per branch in parallel execution trees

## Implementation Approach

### Phase 1: Sub-Agent Schema

1. Add `subagents` field to agent frontmatter schema
2. Update agent parser to handle sub-agent configuration
3. Validate sub-agent references (exist, not circular)
4. Update AgentDefinition type

### Phase 2: Delegation Service

1. Create delegation service for invoking sub-agents
2. Implement context passing options (full, summary, task_only)
3. Handle sub-agent invocation via LLMAgentService
4. Capture and return results to parent
5. Track delegation depth

### Phase 2.5: Parallel Execution

1. Implement parallel delegation executor
2. Support concurrent sub-agent invocations
3. Implement execution modes (parallel, parallel_streaming, sequential)
4. Add concurrency limits and queue management
5. Aggregate results from parallel executions
6. Handle partial failures in parallel batches

### Phase 3: Permission Resolution

1. Implement permission intersection logic
2. Calculate effective permissions for sub-agent invocation
3. Pass resolved permissions to LLMAgentService
4. Test permission scoping scenarios

### Phase 4: Trace Integration

1. Add delegation events to trace format
2. Display delegation chain in trace UI
3. Show parent → sub-agent → result flow
4. Include timing and context information

### Phase 5: Error Handling

1. Define delegation error types
2. Implement retry policies (configurable)
3. Handle sub-agent failures gracefully
4. Surface errors in trace and conversation

### Phase 6: UI for Configuration

1. Add sub-agent configuration to agent editor
2. Agent selector for allow/deny lists
3. Validation (prevent self-reference, circular deps)
4. Visual indication of delegation capabilities

## Success Criteria

- [ ] Agents can specify allowed/denied sub-agents in frontmatter
- [ ] Parent agent can invoke sub-agent via `delegate` tool during conversation
- [ ] `delegate` tool correctly wraps Deep Agents' `task()` mechanism
- [ ] Context passing works (full, summary, task_only options)
- [ ] Sub-agent results return to parent for continued processing
- [ ] Sub-agents execute statelessly (single result, no multi-turn)
- [ ] General-purpose delegation works for pure context isolation
- [ ] Permission intersection enforced (sub-agent cannot exceed parent)
- [ ] Delegation chain visible in conversation trace
- [ ] Depth limits prevent runaway recursion
- [ ] Errors handled gracefully with clear feedback
- [ ] Agent editor UI supports sub-agent configuration
- [ ] Multiple sub-agents can execute in parallel for independent tasks
- [ ] Execution modes work correctly (parallel, parallel_streaming, sequential)
- [ ] Concurrency limits enforced (global and per-agent)
- [ ] Parallel execution results aggregated correctly
- [ ] Trace view shows parallel execution branches clearly

## Deep Agents Integration

Sub-Agent Delegation is implemented on top of LangChain Deep Agents' native sub-agent capabilities. Our layer adds user-configurable permissions and integration with Custom Agents.

### What Deep Agents Provides

- **`task()` tool**: Built-in tool for spawning sub-agents (we wrap this as `delegate`)
- **Context isolation**: Sub-agent work doesn't clutter parent's context
- **Parallel execution**: Multiple sub-agents can run concurrently
- **Streaming**: Results stream with agent name metadata (`lc_agent_name`)
- **General-purpose sub-agent**: Built-in sub-agent with parent's tools/prompt

### What Our Layer Adds

- **Permission allow/deny lists**: User configures which sub-agents each agent can invoke
- **Permission intersection**: Sub-agent effective permissions are intersection of global ∩ parent ∩ sub-agent
- **Custom Agents integration**: Sub-agents are Custom Agents (MD files), not code-defined
- **Depth limits**: Configurable maximum delegation depth (not in Deep Agents by default)
- **UI for configuration**: Agent editor includes sub-agent allow/deny configuration

### Implementation Approach

When a parent agent calls `delegate()`:

1. **Permission check**: Verify sub-agent is in parent's `subagents.allow` list
2. **Resolve sub-agent config**: Load sub-agent from `AgentRegistry`
3. **Calculate effective permissions**: Intersect global ∩ parent ∩ sub-agent tool permissions
4. **Convert to Deep Agents format**: Map Custom Agent MD config to Deep Agents subagent dict
5. **Invoke via Deep Agents**: Use Deep Agents' `task()` mechanism
6. **Return result**: Concise result returned to parent

## Related Backlog Items

**Depends on:**
- [Custom Agents](./custom-agents.md) - Agent configuration and registry
- [Tool Permission System](./tool-permission-system.md) - Permission model
- [Deep Agents Adoption](./deep-agents-adoption.md) - Provides runtime sub-agent capabilities

**Related:**
- [Chat Features (Future)](./chat-features-future.md) - Memory features may interact with sub-agent state

## Notes

### Use Cases

**Research Coordinator (Parallel):**
- Receives complex research request
- Delegates in parallel:
  - Data Analyst → gathers graph data
  - Web Researcher → finds external sources
  - Citation Checker → verifies references
- All three run simultaneously, results aggregated
- Synthesizes combined results into final response
- Total time ≈ slowest sub-agent, not sum of all

**Code Review Pipeline (Parallel):**
- Code Reviewer agent receives PR
- Delegates in parallel:
  - Security Auditor → security analysis
  - Linter Agent → style checking
  - Test Coverage Agent → coverage analysis
- All three run simultaneously
- Combines feedback into comprehensive review

**Data Processing Pipeline (Mixed):**
- Coordinator receives data processing request
- Phase 1 (parallel): Fetch data from 3 sources simultaneously
- Phase 2 (sequential): Transform combined data (depends on Phase 1)
- Phase 3 (parallel): Generate 3 different report formats simultaneously

### Design Considerations

**Why Sub-Agents vs. Tools?**
- Sub-agents have their own instructions and personality
- Sub-agents can use multiple tools in combination
- Sub-agents provide higher-level abstraction than individual tools
- Users can customize sub-agents without code changes

**Context Passing Trade-offs:**
- `full_history`: Most context, highest token usage
- `summary`: Balanced, requires summarization logic
- `task_only`: Minimal tokens, may lose important context

**Circular Delegation:**
- Prevent at configuration time (validation)
- Also enforce at runtime (depth tracking)
- Clear error messages when detected

### Resolved Design Questions

- **Stateless execution**: Sub-agents are ephemeral and return a single result (aligns with Deep Agents)
- **Invocation mechanism**: Via `delegate` tool that wraps Deep Agents' `task()` (aligns with Deep Agents)
- **General-purpose delegation**: Supported for pure context isolation (aligns with Deep Agents)
- **Streaming**: Deep Agents provides streaming with agent name metadata; `parallel_streaming` mode streams as each completes

### Open Questions

- **Cancellation**: If user cancels, how do we cancel sub-agent execution? How does this work with parallel branches?
- **State Sharing**: Sub-agents are isolated by default (Deep Agents model). Should we allow optional state sharing for advanced use cases?
- **Partial Results**: In parallel execution, how do we handle partial results if some sub-agents fail? Continue with successful results or fail entire batch?
- **Filesystem sharing**: Should sub-agents share parent's filesystem/scratchpad, or have isolated working directories?

These questions can be addressed during implementation based on actual usage patterns.
