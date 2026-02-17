[Docs](../README.md) / [Development](./README.md) / UI State Persistence

# UI State Persistence

User-modified UI state should survive app restarts. Use `localStorage` with keys in the `cortex.*` namespace.

## Structure

**Flat keys with namespace prefixes:**

| Namespace | Scope | Example keys |
|-----------|--------|---------------|
| `cortex.layout` | App-wide | `sidebarCollapsed`, `lastView` |
| `cortex.chat` | Chat view | `sidebarWidth`, `lastActiveConversationId`, `draft.{id}`, `composerMode.{id}`, `composerHeight.{id}` |
| `cortex.settings` | Settings view | `tab`, `providerExpanded`, `scrollPosition` |
| `cortex.{viewId}` | Future views | Add as needed |

**Rules:**
- One namespace per view; view code only reads/writes its own namespace.
- Layout keys are global; view keys are scoped.
- For large or per-entity data (e.g. drafts), use separate keys like `cortex.chat.draft.{id}` instead of one big JSON blob.

## Key files

- **`src/renderer/src/lib/layout-storage.ts`** — Layout and settings keys
- **`src/renderer/src/lib/chat-storage.ts`** — Chat view keys
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

1. Add the key to `layout-storage.ts` or `chat-storage.ts` (or create a new view namespace).
2. Use `usePersistedState` in the component or pass initial value from a parent that uses it.
3. Validate stored values on load (e.g. route exists, tab exists, numbers in range).

## See also

- [Settings](./settings.md) — For user preferences stored in `settings.json` (main process)
- [Feature Development](./feature-development.md) — UI checklist includes persistence
