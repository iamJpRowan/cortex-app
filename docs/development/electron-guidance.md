[Docs](../README.md) / [Development](./README.md) / Electron-Specific Guidance

# Electron-Specific Guidance

## Process Boundary Awareness

**When Working on Main Process Code:**
- Remember: Has access to filesystem, Neo4j, Ollama
- Can execute system commands
- Manages application lifecycle
- Owns all application state

**When Working on Renderer Process Code:**
- Remember: Sandboxed, no direct filesystem access
- Must use IPC to communicate with main process
- Focus on UI rendering and user interaction
- Minimal local state (most state lives in main process)

**When Adding New Features:**
Always ask: "Does this need to happen in main process or renderer?"
- Data operations → Main process
- UI rendering → Renderer process
- User input → Renderer captures, main process handles

**Pitfall: Don't access filesystem from renderer.** The renderer is sandboxed. Use IPC to request the main process.

```typescript
// ❌ Renderer - will fail
import fs from 'fs'
const data = fs.readFileSync('/path/to/file')

// ✅ Renderer - correct
const data = await window.api.vault.readFile('/path/to/file')
```

## IPC Design Patterns

**Follow these conventions when creating IPC channels:**

```typescript
// Namespace by domain
'person:get-details'
'person:update-bio'
'graph:query'
'vault:read-file'
'vault:write-file'
'ai:generate-query'
'ai:stream-response'

// Use verbs that indicate action
get, set, create, update, delete, query, stream

// Group related operations
ipcMain.handle('person:*', ...)  // All person operations
ipcMain.handle('vault:*', ...)   // All vault operations
```

**Security Considerations:**
- Validate all inputs from renderer
- Never expose raw database queries to renderer
- Sanitize file paths to prevent directory traversal
- Rate-limit expensive operations

**Pitfall: Don't expose raw DB or privileged objects in preload.** Expose only safe, validated IPC invokers.

```typescript
// ❌ Preload - dangerous (renderer could run any query)
contextBridge.exposeInMainWorld('api', { neo4j: driver })

// ✅ Preload - safe
contextBridge.exposeInMainWorld('api', {
  graph: {
    getPersonDetails: (name: string) => ipcRenderer.invoke('graph:person-details', name)
  }
})
```

## State Management Patterns

**Main Process State:**
```typescript
// Single source of truth
class AppState {
  currentPerson: Person | null
  recentActivity: Activity[]
  
  // Notify renderer of changes
  private notify(channel: string, data: any) {
    mainWindow?.webContents.send(channel, data)
  }
  
  setCurrentPerson(person: Person) {
    this.currentPerson = person
    this.notify('state:person-changed', person)
  }
}
```

**Renderer Subscribes:**
```typescript
// Listen for state changes
window.api.on('state:person-changed', (person) => {
  renderPersonView(person)
})

// Request initial state on load
window.api.getInitialState().then(state => {
  renderApp(state)
})
```

## Working with Embedded Services

Neo4j and Ollama operations must happen in the main process. Handle startup/shutdown in app lifecycle; validate connections before use; log service state changes.

### Neo4j management

Neo4j runs as a managed subprocess. Example connection lifecycle:

```typescript
// src/main/neo4j/connection.ts
import neo4j from 'neo4j-driver'

export async function connectToNeo4j() {
  const driver = neo4j.driver('neo4j://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  )
  await driver.verifyConnectivity()
  return driver
}

export async function closeNeo4jConnection(driver) {
  await driver.close()
}
```

### Ollama management

Ollama uses the system installation (e.g. models in `~/.ollama/models`). Example:

```typescript
// src/main/ollama/connection.ts
import { DEFAULT_OLLAMA_CONFIG } from '../config/defaults'

export async function connectToOllama() {
  const response = await fetch(
    `http://${DEFAULT_OLLAMA_CONFIG.host}:${DEFAULT_OLLAMA_CONFIG.port}/api/tags`
  )
  if (!response.ok) {
    throw new Error('Ollama not available - may need installation')
  }
  return await response.json()
}
```

### Application lifecycle

Wire service connect/close into `app.on('ready')` and `app.on('before-quit')`; create the browser window after services are ready.

### Checklist: Adding external data integration

- [ ] Define data storage format (MD vs JSON)
- [ ] Implement API client
- [ ] Create sync logic
- [ ] Add graph transformation
- [ ] Implement IPC handlers for UI access
- [ ] Create UI components for display
- [ ] Add error handling and retry logic
- [ ] Document integration approach

## Common main process patterns

### File watching

```typescript
// src/main/vault/watcher.ts
import chokidar from 'chokidar'

export function watchVault(vaultPath: string, onChange: (path: string) => void) {
  const watcher = chokidar.watch(vaultPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  })
  watcher.on('change', onChange)
  watcher.on('add', onChange)
  return watcher
}
```

### Error handling in IPC handlers

```typescript
ipcMain.handle('query', async (_, cypher) => {
  try {
    return await neo4jSession.run(cypher)
  } catch (error) {
    log('error', 'Query failed', { cypher, error: error.message })
    throw new Error(`Query failed: ${error.message}`)
  }
})
```

## AI integration (main process)

LLM query generation and streaming run in the main process; expose only safe IPC to the renderer.

### LLM query generation

```typescript
// src/main/ai/queryGenerator.ts
export async function generateCypherQuery(
  userIntent: string,
  context: GraphContext
): Promise<string> {
  const prompt = `
    Given this graph schema: ${context.schema}
    Generate a Cypher query for: ${userIntent}
  `
  const response = await ollama.query(prompt)
  return extractCypherFromResponse(response)
}
```

### Streaming responses

```typescript
ipcMain.handle('ai:stream-query', async (event, prompt) => {
  const stream = await ollama.stream(prompt)
  for await (const chunk of stream) {
    event.sender.send('ai:stream-chunk', chunk)
  }
  event.sender.send('ai:stream-complete')
})
```
