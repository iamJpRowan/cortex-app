[Docs](../README.md) / [Development](./README.md) / Feature Development

# Feature Development

When implementing new features, follow the workflow below.

---

## Adding new functionality (sequence)

For any new feature that touches backend and UI, follow this order:

1. **Define IPC interface** (if backend needed) — types for inputs/outputs
2. **Implement main process handler** — validation, error handling
3. **Expose via preload** — safe API for renderer
4. **Build UI component** — React + shadcn/ui; see [UI Guide](../design/ui-guide.md)
5. **Test end-to-end** — see [testing.md](./testing.md)

### Example: "Get Person Details" feature

**Step 1: Define types** (`src/shared/types.ts`)

```typescript
export interface Person {
  name: string
  occurrences: string[]
  connections: string[]
}
```

**Step 2: Add IPC handler** (`src/main/ipc/person.ts`)

```typescript
import { ipcMain } from 'electron'
import { neo4jSession } from '../neo4j'

export function registerPersonHandlers() {
  ipcMain.handle('person:get-details', async (_, name: string) => {
    const result = await neo4jSession.run(
      'MATCH (p:Person {name: $name}) RETURN p',
      { name }
    )
    return result.records[0]?.get('p').properties
  })
}
```

**Step 3: Expose in preload** (`src/preload/index.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  person: {
    getDetails: (name: string) =>
      ipcRenderer.invoke('person:get-details', name)
  }
})
```

**Step 4: Create UI component** — Use React; fetch via `window.api.person.getDetails(name)`, handle loading/error, render. See [UI Guide](../design/ui-guide.md). For async IPC in `useEffect`, use a cancelled flag so you don’t set state after unmount:

```tsx
React.useEffect(() => {
  let cancelled = false
  async function load() {
    const data = await window.api.person.getDetails(name)
    if (!cancelled) setPerson(data)
  }
  load()
  return () => { cancelled = true }
}, [name])
```

**Step 5: Test** — Unit test the component; test from renderer UI.

### Checklist: Adding a new IPC handler

- [ ] Define TypeScript types for inputs/outputs
- [ ] Implement handler in main process
- [ ] Add input validation
- [ ] Add error handling
- [ ] Expose via preload script
- [ ] Add TypeScript definitions for renderer
- [ ] Write unit tests
- [ ] Test from renderer UI
- [ ] Document in appropriate file

### Checklist: Creating a new UI component

- [ ] Define component props interface
- [ ] Implement React component (use shadcn/ui from `@/components/ui/` where applicable)
- [ ] Add Tailwind classes for styling
- [ ] Attach event handlers (JSX props)
- [ ] Handle loading/error states
- [ ] Write component tests
- [ ] Integrate into parent component
- [ ] Test in running application
- [ ] **If user can change layout, view, or preference:** persist via `localStorage` — add key to `layout-storage.ts` or `chat-storage.ts`, use `usePersistedState`; see [UI State Persistence](./ui-state-persistence.md)

**React and cleanup:** Put subscriptions, async work, and timers in `useEffect`; return a cleanup function (unsubscribe, `clearInterval`, or set a `cancelled` flag for async). Use JSX event props (`onClick`, etc.); no manual `addEventListener`.
