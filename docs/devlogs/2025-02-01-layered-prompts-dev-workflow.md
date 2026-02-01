[Docs](../README.md) / [Devlogs](./README.md) / Layered Prompts & Dev Workflow

---
date: 2025-02-01
developer: jprowan
agent: Cursor
model: claude-sonnet-4-20250514
tags: [prompts, agent, developer-experience, architecture]
related_files:
  - src/main/config/prompts/base-system.md
  - src/main/config/prompts/default-agent.md
  - src/main/config/prompts.ts
  - src/main/config/defaults.ts
  - src/main/services/llm/agent.ts
  - src/main/ipc/llm.ts
  - docs/backlog/custom-agents.md
related_issues: []
related_devlogs:
  - 2025-01-31-custom-agents-design.md
session_duration: ~1 hour
iterations: 1
outcome: success
---

# Context

During development of the chat interface, iterating on system prompts required restarting the dev server each time. The system prompt was hardcoded in `defaults.ts` as a concatenated string, making it difficult to read and edit. Additionally, the existing prompt lacked detailed guidance for markdown formatting and tool usage.

# Problem

Three issues needed addressing:

1. **Dev workflow friction**: Prompt changes required server restarts
2. **Poor editing experience**: Prompts embedded in TypeScript strings with escaping
3. **Insufficient prompt guidance**: Basic instructions didn't provide enough detail for consistent LLM behavior

A secondary consideration: the upcoming Custom Agents feature will need a layered prompt architecture where a base prompt is always applied and agent-specific instructions are layered on top.

# Solution

## Layered Prompt Architecture

Split prompts into two layers, preparing for custom agents:

| Layer | File | Editable | Purpose |
|-------|------|----------|---------|
| Base System Prompt | `prompts/base-system.md` | No (hardcoded) | Tool usage, response formatting |
| Agent Instructions | `prompts/default-agent.md` | Yes (per-agent) | Role, persona, guidelines |

The base prompt prevents users from accidentally breaking core behaviors when editing agents.

## MD File Storage

Prompts stored as markdown files in `src/main/config/prompts/`:
- Better editing experience with syntax highlighting
- No string escaping needed
- Easy to read and iterate on

## Reload Command

Added `llm:reloadAgent` IPC handler and "Reload LLM Agent" command palette action:
- Resets the agent singleton
- Next query reinitializes with fresh prompts from disk
- No server restart needed

## Comprehensive Prompt Content

Expanded `base-system.md` with detailed guidance:

**Tool Usage**:
- When to use tools vs. answering directly
- Multi-tool chaining
- Result handling and presentation
- Error handling behavior

**Response Formatting**:
- Headings (when to use ## vs ### vs none)
- Lists (bullet vs numbered)
- Code (inline vs fenced, language tags)
- Emphasis (bold vs italics)
- Tables
- Paragraphs
- "Keep it simple" guidance

# Outcome

## What Works Now

- Edit `base-system.md` or `default-agent.md`
- Run "Reload LLM Agent" from command palette (Cmd+K)
- Next chat query uses updated prompts
- No server restart needed

## Files Changed

| File | Change |
|------|--------|
| `src/main/config/prompts/base-system.md` | New: comprehensive base prompt |
| `src/main/config/prompts/default-agent.md` | New: default agent instructions |
| `src/main/config/prompts.ts` | New: prompt loading with fallbacks |
| `src/main/config/defaults.ts` | Uses `getDefaultLLMConfig()` for fresh loading |
| `src/main/services/llm/agent.ts` | Added `resetAgentService()` export |
| `src/main/ipc/llm.ts` | Added `llm:reloadAgent` handler |
| `src/main/services/commands/registry.ts` | Registered reload command |
| `src/renderer/src/lib/commands.ts` | Added to command palette |
| `src/preload/index.ts` | Exposed `reloadAgent` API |
| `src/renderer/src/types/api.d.ts` | Added type definition |
| `docs/backlog/custom-agents.md` | Documented layered prompt architecture |

## Follow-up

- Custom Agents (backlog): Will build on this layered architecture
- File watcher for automatic reload (deferred to custom agents)
- User-facing prompt editing UI (deferred to custom agents)

# Notes

## Design Decisions

1. **No file watcher yet**: The reload command is sufficient for dev workflow. File watcher complexity is deferred to Custom Agents where it's needed for user-facing editing.

2. **Base prompt is hardcoded**: Stored in source control, not userData. Users can't break core behaviors. Custom agents will inherit this base.

3. **Function instead of const**: `getDefaultLLMConfig()` reads prompts fresh each call, enabling reload without singleton recreation.

## Prompt Engineering Observations

- Smaller models (3B params) benefit from more explicit, structured instructions
- The detailed markdown section with examples should improve formatting consistency
- Tool usage guidance helps prevent common antipatterns (ignoring results, claiming lack of info)
