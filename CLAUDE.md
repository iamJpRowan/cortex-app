# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Cortex** is a local-first AI knowledge management desktop app built with Electron. It embeds Neo4j as a graph database and integrates with local LLMs (Ollama) and cloud LLMs (Anthropic, OpenAI-compatible). All AI processing can happen locally; the user controls what uses cloud services.

## Commands

```bash
# Development
npm run dev              # Start Electron app with hot reload (requires Java 17/21 for Neo4j)
npm run setup            # Initialize Neo4j database (first-time setup)

# Type checking & linting
npm run type-check       # TypeScript compilation check
npm run lint             # ESLint
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier (90 char width, no semicolons, single quotes)
npm run format:check     # Prettier validation
npm run lint:css         # Stylelint

# Build & package
npm run build            # Compile for production
npm run package          # Build + package for current platform
npm run package:mac      # macOS DMG
npm run package:win      # Windows NSIS
npm run package:linux    # Linux AppImage
```

Pre-commit hooks (via Husky + lint-staged) automatically run Prettier, ESLint, design token validation, accessibility validation, and TypeScript type-checking on staged files. Commit messages are enforced as [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): description`, max 90 chars).

There is no test framework configured yet. Testing docs are at [docs/development/quality-and-release/testing.md](docs/development/quality-and-release/testing.md).

## Architecture

### Process Model

This is a standard Electron app with strict process separation:

**Main process** (`src/main/`) — Node.js, owns all state and privileged operations:

- `services/neo4j.ts` — manages embedded Neo4j 5.x subprocess (requires Java 17 or 21)
- `services/ollama.ts` — detects and connects to system-installed Ollama
- `services/settings.ts` — file-backed JSON config with hot reload
- `services/llm/` — LangGraph agent orchestration, conversation history (SQLite via better-sqlite3), multi-provider support (Anthropic, Ollama), tool registry
- `services/modes/` — permission modes system (built-in + user-created)
- `ipc/` — 6 handler groups: `llm.ts`, `conversations.ts`, `settings.ts`, `modes.ts`, `window.ts`, `test.ts`

**Preload** (`src/preload/index.ts`) — IPC bridge; exposes `window.api.*` namespaces to the renderer via `contextBridge`.

**Renderer** (`src/renderer/src/`) — React 19 + Tailwind + shadcn/ui SPA:

- Routes: `HomeView`, `ChatView`, `SettingsView`, `HelpView`
- All backend access goes through `window.api.*` (never direct Node.js APIs)
- UI primitives: shadcn/ui from `@/components/ui/`; app-level components in `src/renderer/src/components/` (excluding `ui/` and `ai-elements/`)

**Shared** (`src/shared/`) — TypeScript types used by both processes.

### IPC Convention

Channels are namespaced by domain with action verbs: `domain:verb-noun` (e.g., `llm:query`, `conversations:get-all`, `settings:set`). Never expose raw DB drivers or privileged objects in preload — only safe, validated invokers.

### Key Paths

| What                 | Where                                                        |
| -------------------- | ------------------------------------------------------------ |
| IPC type definitions | `src/shared/types.ts`                                        |
| IPC handlers (main)  | `src/main/ipc/`                                              |
| Preload bridge       | `src/preload/index.ts`                                       |
| LLM agent + tools    | `src/main/services/llm/`                                     |
| Neo4j service        | `src/main/services/neo4j.ts`                                 |
| React views          | `src/renderer/src/views/`                                    |
| shadcn UI primitives | `src/renderer/src/components/ui/`                            |
| App components       | `src/renderer/src/components/` (excl. `ui/`, `ai-elements/`) |
| Design tokens        | `tailwind.config.js` + CSS variables                         |
| Path aliases         | `@/*` → renderer src, `@shared/*` → shared, `@main/*` → main |

### Adding a Feature (Full-Stack)

1. **Types** in `src/shared/types.ts`
2. **IPC handler** in `src/main/ipc/<domain>.ts`, registered in `src/main/index.ts`
3. **Preload exposure** in `src/preload/index.ts`
4. **React component** using `window.api.*`; use a `cancelled` flag for async `useEffect` cleanup

For async IPC in React:

```tsx
React.useEffect(() => {
  let cancelled = false
  async function load() {
    const data = await window.api.domain.action()
    if (!cancelled) setState(data)
  }
  load()
  return () => {
    cancelled = true
  }
}, [dep])
```

If user can adjust layout/view, persist it via `localStorage` using keys in `layout-storage.ts` or `chat-storage.ts` (`cortex.*` namespace).

## Key Constraints (Guardrails)

- **TypeScript everywhere** — all app code (main + renderer + shared) must be TypeScript; scripts in `scripts/` may be JS
- **No filesystem access from renderer** — renderer is sandboxed; use IPC to reach main process
- **Log all AI queries, responses, and file operations** — logging is not optional
- **Preserve exact Markdown formatting** on file read/write — no extra newlines or reformatting
- **Local-first by default** — process data locally unless there's an explicit reason for cloud
- **Open formats only** — Markdown, JSON; never proprietary or binary-only storage
- **Graph is disposable** — never fix data by editing the Neo4j graph directly; fix source data or transformation logic

Before implementing: ask whether the approach preserves user data sovereignty, is transparent/auditable, and works in the local-first model.

## Code Style

- **Files**: Components → PascalCase, utilities → camelCase, constants → SCREAMING_SNAKE_CASE
- **Directories**: kebab-case
- **Formatting**: Prettier enforced — 90 char width, no semicolons, single quotes, trailing commas
- **Commits**: `type(scope): description` (Conventional Commits); no period, imperative mood

## Agent Workflows

Development is organized as **Theme → Story → Task** with docs as the source of truth. When the user references a workflow by name, see [docs/development/agents/README.md](docs/development/agents/README.md) for the full table of workflows and when to apply them (refine, decompose, work, groom, plan-goal, etc.).

Backlog:
When the user mentions the backlog the are referring to the files within `docs/product/backlog` Review the product [README](docs/product/README.md) and [How we work](docs/development/agents/how-we-work.md)

Key skills available:

- `/prepare-to-commit` — review changes, apply fixes, report before committing
- `/commit` — stage and commit with Conventional Commits format

Devlogs for significant features go in `docs/product/devlogs/` using format `YYYY-MM-DD-descriptive-title.md`.
