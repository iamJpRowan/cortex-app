[Docs](../README.md) / [Development](./README.md) / UI State Persistence

# UI State Persistence

User-modified UI state should survive app restarts. Use `localStorage` with keys in the `cortex.*` namespace.

## Rules

- **Namespace per view:** Use a consistent prefix per view (e.g. `cortex.layout`, `cortex.chat`, `cortex.settings`, `cortex.help`). View code only reads/writes its own namespace.
- **Layout vs view:** Layout keys (e.g. sidebar collapsed, last view) are app-wide; view keys are scoped to that view.
- **Key location:** Define keys in `layout-storage.ts` for layout and settings, or `chat-storage.ts` for chat; add a view-specific file or section if a new view needs its own namespace.
- **Shape:** Prefer flat keys (e.g. `cortex.help.expanded`, `cortex.help.scroll`). For large or per-entity data (e.g. drafts), use separate keys like `cortex.chat.draft.{id}` instead of one big JSON blob.
- **Validation:** Validate stored values on load (e.g. route exists, tab exists, numbers in range). Deserialize defensively in `usePersistedState` so invalid or legacy data doesn’t break the app.

This doc does not list every key in the codebase; it describes how to add and structure persisted state.

## Key files

- **`src/renderer/src/lib/layout-storage.ts`** — Layout and settings (and other view) key constants
- **`src/renderer/src/lib/chat-storage.ts`** — Chat view key constants
- **`src/renderer/src/hooks/use-persisted-state.ts`** — Hook for persisted state

## Usage

```tsx
import { usePersistedState } from '@/hooks/use-persisted-state'
import { LAYOUT_SIDEBAR_COLLAPSED_KEY } from '@/lib/layout-storage'

const [collapsed, setCollapsed] = usePersistedState(LAYOUT_SIDEBAR_COLLAPSED_KEY, false)
```

For custom types, provide `serialize` and `deserialize`:

```tsx
const [expanded, setExpanded] = usePersistedState<
  Record<string, boolean>
>(SETTINGS_PROVIDER_EXPANDED_KEY, { ollama: false, anthropic: false }, {
  deserialize: s => {
    try {
      const o = JSON.parse(s) as Record<string, unknown>
      if (o && typeof o === 'object') {
        const out: Record<string, boolean> = {}
        for (const k of ['ollama', 'anthropic']) {
          out[k] = typeof o[k] === 'boolean' ? o[k] : false
        }
        return out
      }
    } catch {}
    return { ollama: false, anthropic: false }
  },
})
```

## Adding new persisted state

1. Add the key constant to `layout-storage.ts`, `chat-storage.ts`, or a view-specific module.
2. Use `usePersistedState` in the component (or pass initial value from a parent that uses it).
3. Provide `deserialize` (and `serialize` if needed) so invalid or missing storage doesn’t break the app.

## See also

- [Settings](./settings.md) — For user preferences stored in `settings.json` (main process)
- [Feature Development](./feature-development.md) — UI checklist includes persistence
