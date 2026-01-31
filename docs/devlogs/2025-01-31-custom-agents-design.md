---
date: 2025-01-31
developer: jprowan
agent: Claude (Cursor)
model: claude-sonnet-4-20250514
tags: [design, planning, chat, agents, terminology, backlog]
related_files:
  - docs/backlog/custom-agents.md
  - docs/backlog/sub-agent-delegation.md
  - docs/backlog/deep-agents-adoption.md
  - docs/backlog/chat-features-future.md
related_issues: []
related_devlogs:
  - docs/devlogs/2025-01-27-chat-interface-scoping.md
session_duration: ~1.5 hours
iterations: collaborative discussion with iterative refinement
outcome: success
---

[Docs](../README.md) / [Devlogs](./README.md) / Custom Agents Design

# Custom Agents Design & Terminology

## Context

The existing `chat-personas.md` backlog item described a feature for users to create customizable chat configurations with instructions and tool permissions. During review, it became clear that "personas" wasn't the right terminology—it implies personality/character rather than capability/configuration.

## Problem

**Primary question:** What terminology should be used for user-configurable chat configurations that bundle instructions, tool permissions, and runtime parameters?

**Secondary questions:**
- How does this relate to the existing `LLMAgentService` (the runtime execution engine)?
- What patterns from the existing codebase should influence the design?
- What additional features should be considered (sub-agents, memory, etc.)?

## Solution

### Terminology Decision

After reviewing industry conventions:
- **Assistants** (OpenAI's term) — close match but could conflict with Assistants API
- **Agents** (LangChain/industry term) — strong momentum, implies capability
- **Personas** (original) — implies personality over capability
- **Profiles/Presets** — too generic

**Decision:** Use **"Agents"** for the user-facing configuration concept. The existing `LLMAgentService` remains as the runtime execution engine—there's a clear distinction between:
- **Agent (configuration):** Saved preset of instructions, permissions, model, parameters
- **LLMAgentService (runtime):** The execution engine that runs queries

### Design Decisions

1. **Permission inheritance:** Agent cannot grant more than global allows (intersection model)
2. **Default agent:** Stored in user settings (`settings.defaultAgentId`)
3. **Storage:** Dedicated `agents/` directory with MD files (YAML frontmatter + markdown body)
4. **File format:** Markdown enables version control, external editing, and marketplace distribution

### Codebase Pattern Alignment

Reviewed existing patterns to ensure design consistency:
- **Registry pattern** (like `ToolRegistry`) → `AgentRegistry` singleton
- **Metadata separation** (like `ToolDefinition`) → `AgentMetadata` + `AgentConfig`
- **File watching** (like `SettingsService`) → Watch `agents/` directory
- **Defaults + overrides** (like `LLMServiceConfig`) → Default agent with overrides

### Sub-Agent Delegation

Separated sub-agent functionality into its own backlog item with:
- Allow/deny lists for sub-agent delegation
- Context passing options (full, summary, task_only)
- Permission scoping (intersection model)
- **Parallel execution** for independent tasks (multi-threading)
- Depth limits for recursive delegation

### Future Chat Features

Identified and documented additional chat features not yet in backlog:
- Memory / Persistent Knowledge
- RAG / Knowledge Base Integration
- Attachments / Multimodal Input
- Message Editing & Regeneration
- Conversation Branching
- Feedback & Learning
- Scheduled / Triggered Conversations
- And more...

Created `chat-features-future.md` as a holding document for future consideration.

## Outcome

**Created:**
- `docs/backlog/custom-agents.md` — Full specification for custom agents feature
- `docs/backlog/sub-agent-delegation.md` — Specification for agents delegating to other agents
- `docs/backlog/chat-features-future.md` — Collection of future chat features to consider

**Deleted:**
- `docs/backlog/chat-personas.md` — Replaced by custom-agents.md

**Updated (persona → agent references):**
- `docs/backlog/README.md`
- `docs/backlog/chat-interface-mvp.md`
- `docs/backlog/tool-permission-system.md`
- `docs/backlog/chat-quick-launcher.md`
- `docs/backlog/multi-provider-model-selection.md`
- `docs/backlog/kbar-smart-chat-detection.md`
- `docs/backlog/archive/README.md`
- `docs/backlog/archive/chat-interface.md`
- `docs/devlogs/2025-01-27-chat-interface-scoping.md`

## Notes

### Agent Configuration Example

```yaml
---
id: research-assistant
name: Research Assistant
description: Specialized for knowledge graph exploration
version: 1.0.0
accentColor: "#4f46e5"
icon: search
model: llama3.2:3b
temperature: 0.7

tools:
  allow:
    - neo4j.count-nodes
    - neo4j.query
    - web.search
  ask:                              # Human-in-the-loop approval
    - filesystem.write_file
  deny:
    - system.exec

memory:
  namespace: research-assistant     # Isolated memory namespace
  persistent: true                  # Cross-conversation memory

subagents:
  allow:
    - data-analyst
    - citation-checker
  execution: parallel
  max_concurrent: 3
---

# Research Assistant

You are a research assistant specialized in exploring knowledge graphs...
```

### Key Design Principles

1. **MD file format** — Enables version control, external editing, marketplace distribution
2. **Intersection permissions** — Agent cannot grant more than global allows
3. **Parallel sub-agents** — Multi-threaded execution for independent tasks
4. **File watcher** — External edits automatically update registry

### Deep Agents Alignment (Refined)

After comparing with LangChain Deep Agents documentation, both backlog items were refined to align with Deep Agents capabilities:

**Custom Agents additions:**
- `tools.ask` for human-in-the-loop (maps to Deep Agents' `interrupt_on`)
- `memory.namespace` and `memory.persistent` for per-agent memory
- Deep Agents Integration section explaining runtime mapping
- Updated prerequisites to include Deep Agents Adoption

**Sub-Agent Delegation additions:**
- Runtime invocation via `delegate` tool (wraps Deep Agents' `task()`)
- Stateless execution model (matches Deep Agents)
- General-purpose delegation for pure context isolation
- Deep Agents Integration section explaining what each layer provides
- Updated prerequisites to include Deep Agents Adoption

**Deep Agents Adoption updates:**
- Comprehensive capability tables
- Clear relationship to Custom Agents and Sub-Agent Delegation
- Implementation phases for migration
- Success criteria

### Follow-up Work

- Implement Deep Agents Adoption first (prerequisite for other features)
- Implement Custom Agents when Chat Interface MVP is complete
- Evaluate high-priority future features (Memory, RAG) for promotion to standalone backlog items
- Sub-Agent Delegation depends on Custom Agents, Deep Agents, and Tool Permission System
