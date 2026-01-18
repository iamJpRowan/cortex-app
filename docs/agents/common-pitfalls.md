[Docs](../README.md) / [Agents](./README.md) / Common Pitfalls

# Common Pitfalls

## ❌ Don't: Assume React Patterns Work
```typescript
// This won't work (no useState)
const [count, setCount] = useState(0)
```

## ✅ Do: Manage State Explicitly
```typescript
let count = 0

function increment() {
  count++
  render()
}

function render() {
  document.getElementById('count').textContent = String(count)
}
```

## ❌ Don't: Try to Access Filesystem from Renderer
```typescript
// Renderer process - this will fail
import fs from 'fs'
const data = fs.readFileSync('/path/to/file')
```

## ✅ Do: Use IPC to Request Main Process
```typescript
// Renderer process - correct approach
const data = await window.api.vault.readFile('/path/to/file')
```

## ❌ Don't: Expose Raw Database Connection
```typescript
// Preload - dangerous
contextBridge.exposeInMainWorld('api', {
  neo4j: driver  // Renderer can run any query!
})
```

## ✅ Do: Expose Safe, Validated Operations
```typescript
// Preload - safe
contextBridge.exposeInMainWorld('api', {
  graph: {
    getPersonDetails: (name: string) => ipcRenderer.invoke('graph:person-details', name)
  }
})
```
