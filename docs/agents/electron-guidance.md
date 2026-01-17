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

For detailed patterns on Neo4j and Ollama management, see [development/patterns.md](../development/patterns.md#embedded-services).

**Key Reminders:**
- Neo4j and Ollama operations must happen in main process
- Always handle service startup/shutdown in app lifecycle
- Validate connections before use
- Log service state changes for debugging
