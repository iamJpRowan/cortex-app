import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  test: {
    neo4jQuery: () => ipcRenderer.invoke('test:neo4j-query'),
    ollamaQuery: (prompt?: string) => ipcRenderer.invoke('test:ollama-query', prompt),
    ollamaListModels: () => ipcRenderer.invoke('test:ollama-list-models'),
    ollamaGetDefaultModel: () => ipcRenderer.invoke('test:ollama-get-default-model'),
  },
  llm: {
    query: (message: string, conversationId?: string) =>
      ipcRenderer.invoke('llm:query', message, conversationId),
    toolsList: () => ipcRenderer.invoke('llm:tools:list'),
    toolsTest: (toolName: string, args: Record<string, unknown>) =>
      ipcRenderer.invoke('llm:tools:test', toolName, args),
  },
  window: {
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    setButtonVisibility: (visible: boolean) =>
      ipcRenderer.invoke('window:setButtonVisibility', visible),
    onMaximized: (callback: () => void) => {
      ipcRenderer.on('window:maximized', callback)
      return () => ipcRenderer.removeListener('window:maximized', callback)
    },
    onUnmaximized: (callback: () => void) => {
      ipcRenderer.on('window:unmaximized', callback)
      return () => ipcRenderer.removeListener('window:unmaximized', callback)
    },
  },
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getFilePath: () => ipcRenderer.invoke('settings:get-file-path'),
    openInEditor: () => ipcRenderer.invoke('settings:open-in-editor'),
    onChange: (
      callback: (data: { key: string; value: unknown; previous: unknown }) => void
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { key: string; value: unknown; previous: unknown }
      ) => {
        callback(data)
      }
      ipcRenderer.on('settings:changed', handler)
      return () => ipcRenderer.removeListener('settings:changed', handler)
    },
  },
})
