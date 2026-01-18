[Docs](../README.md) / [Architecture](./README.md) / Security Model

# Security Model

## Sandboxed Renderer

The renderer process (UI) runs in a security sandbox:
- Cannot access filesystem directly
- Cannot execute system commands
- Cannot make arbitrary network requests
- Can only communicate via whitelisted IPC channels

## Controlled IPC Surface

Main process exposes specific, validated functions to renderer:

```typescript
// Only these approved functions are callable from UI
ipcMain.handle('query-graph', async (_, cypher) => { ... })
ipcMain.handle('read-file', async (_, filePath) => { ... })
ipcMain.handle('write-file', async (_, filePath, content) => { ... })
ipcMain.handle('ollama-query', async (_, prompt) => { ... })
```

## Data Isolation

- Neo4j database only accessible from main process
- Ollama only accessible through main process
- Vault files validated before read/write operations
- No direct exposure of sensitive data to renderer
