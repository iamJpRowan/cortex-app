# Adding a New Tool

This guide describes how to add a built-in or domain tool using the declarative definition + handler pattern. Tools are defined as **data** (name, description, schema, handler key, metadata) and bound to implementations at registration. See [Tool Permission System](../../product/backlog/tool-permission-system.md) for the full design.

## Tool name format

Provider APIs (e.g. Anthropic) require tool names to match `^[a-zA-Z0-9_-]{1,128}$`—**no dots**. Use underscores for namespacing: `neo4j_count_nodes`, `command_invoke`, `web_search`.

## 1. Add a definition

In your domain folder under `src/main/services/llm/tools/builtin/<domain>/tools.ts` (or create it):

- **name**: Unique tool ID (e.g. `neo4j_count_nodes`).
- **description**: For the LLM and UI.
- **schema**: Zod schema for parameters (use `z.object({ ... })`).
- **handler**: String key that will match a key in the handler map (e.g. `neo4j_countNodes`).
- **metadata**: Must include **scope** (`local` | `external` | `app`) and **access** (`read` | `write`). Optional: `connectionType`, `connection`, `risk`, `permissionExplanation`, **capResultLength** (default `true`; set to `false` only when the tool must return uncapped content—increases risk of UI freezes and “prompt too long” errors; see [Bounded Tool Results](../../product/backlog/archive/bounded-tool-results-and-chat-ui-stability.md)).

**Connection type and connection:** Use `connectionType` and `connection` only for tools that operate on **data-source connections** (e.g. Folder, Slack, Google Drive). See [Connections](../../development/architecture/connections.md). Tools that query or modify the graph are governed by **graph access**; do not set `connectionType` for those tools.

Definition files should only use data and Zod—no LangChain or registry imports.

```ts
// builtin/neo4j/tools.ts — graph tools: no connectionType (graph access applies)
import { z } from 'zod'
import type { ToolDefinition } from '@main/services/llm/tools/definition-types'

export const neo4jToolDefinitions: ToolDefinition[] = [
  {
    name: 'neo4j_count_nodes',
    description: 'Counts the total number of nodes in the Neo4j graph database.',
    schema: z.object({}),
    handler: 'neo4j_countNodes',
    metadata: { scope: 'external', access: 'read' },
  },
]
```

For a tool that operates on a **connection** (e.g. Local Folder), set `connectionType` and optionally `connection`: e.g. `metadata: { scope: 'local', access: 'read', connectionType: 'Folder' }`.

For tools with **dynamic schema** (e.g. enum of current commands), export a **function** that returns definitions (see `builtin/command/tools.ts`).

## 2. Add a handler

In the same domain, create or extend `handlers.ts`:

- Keys in the handler map must match the **handler** field in your definitions.
- Each handler is `(input: unknown) => Promise<string>`. The input is the parsed schema output.

```ts
// builtin/neo4j/handlers.ts
import type { ToolHandlers } from '@main/services/llm/tools/factory'

export const neo4jHandlers: ToolHandlers = {
  async neo4j_countNodes() {
    // ... implementation
    return 'The Neo4j database contains 42 node(s).'
  },
}
```

## 3. Register the domain

In `src/main/services/llm/tools/builtin/index.ts`:

- Import your definitions and handlers.
- After any required setup (e.g. `registerBuiltinCommands()` for command tools), call `createToolsFromDefinitions(domainDefs, domainHandlers)` and register each result:

```ts
for (const { tool, metadata } of createToolsFromDefinitions(neo4jToolDefinitions, neo4jHandlers)) {
  toolRegistry.register(tool as StructuredTool, metadata)
}
```

No per-tool `toolRegistry.register()` calls elsewhere—only domain-level loops in the builtin index.

## Categories

Category is **derived** from scope + access (e.g. `read external`, `write app`). You don’t set it on the definition; the factory sets it on metadata at registration.

## Result length

By default the **factory** caps every tool's return string to a maximum length before it is stored in the conversation (see `content-guardrails.ts`). This prevents context-window blow-up and UI freezes. To allow uncapped results for a specific tool, set `metadata.capResultLength: false`. Only do this when necessary; document the risk (freezes, "prompt too long" errors). Tools that serialize structured data (e.g. graph nodes) should also cap at source (e.g. per-property length limits in the handler).

## Reference

- **Connections** (connection type vs graph access): [architecture/connections.md](../../development/architecture/connections.md)
- **Types**: `src/main/services/llm/tools/definition-types.ts`
- **Factory**: `src/main/services/llm/tools/factory.ts`
- **Examples**: `builtin/neo4j/`, `builtin/command/`
