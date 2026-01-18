import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  test: {
    neo4jQuery: () => ipcRenderer.invoke('test:neo4j-query')
  }
})
