import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  test: {
    neo4jQuery: () => ipcRenderer.invoke('test:neo4j-query'),
    ollamaQuery: (prompt?: string) => ipcRenderer.invoke('test:ollama-query', prompt),
    ollamaListModels: () => ipcRenderer.invoke('test:ollama-list-models'),
    ollamaGetDefaultModel: () => ipcRenderer.invoke('test:ollama-get-default-model')
  },
  llm: {
    query: (message: string, conversationId?: string) => 
      ipcRenderer.invoke('llm:query', message, conversationId),
    toolsList: () => ipcRenderer.invoke('llm:tools:list'),
    toolsTest: (toolName: string, args: Record<string, any>) => 
      ipcRenderer.invoke('llm:tools:test', toolName, args)
  }
})
