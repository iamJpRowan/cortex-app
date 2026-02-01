import { contextBridge, ipcRenderer } from 'electron'
import type {
  LLMQueryOptions,
  StreamEvent,
  StreamEventHandler,
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
} from '../shared/types'

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
    query: (message: string, options?: LLMQueryOptions) =>
      ipcRenderer.invoke('llm:query', message, options),
    /**
     * Start a streaming query.
     * Returns stream info immediately; events arrive via onStream callback.
     */
    queryStream: (message: string, options?: LLMQueryOptions) =>
      ipcRenderer.invoke('llm:queryStream', message, options),
    /**
     * Subscribe to streaming events.
     * Call this before queryStream to receive events.
     * Returns an unsubscribe function.
     */
    onStream: (callback: StreamEventHandler) => {
      const handler = (_event: Electron.IpcRendererEvent, data: StreamEvent) => {
        callback(data)
      }
      ipcRenderer.on('llm:stream', handler)
      return () => ipcRenderer.removeListener('llm:stream', handler)
    },
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
  conversations: {
    /** List conversations with optional filtering */
    list: (options?: ListConversationsOptions) =>
      ipcRenderer.invoke('conversations:list', options),
    /** Get a conversation by ID */
    get: (id: string) => ipcRenderer.invoke('conversations:get', id),
    /** Create a new conversation */
    create: (options?: CreateConversationOptions) =>
      ipcRenderer.invoke('conversations:create', options),
    /** Update a conversation */
    update: (id: string, updates: UpdateConversationOptions) =>
      ipcRenderer.invoke('conversations:update', id, updates),
    /** Delete a conversation */
    delete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
    /** Get messages for a conversation */
    getMessages: (id: string) => ipcRenderer.invoke('conversations:getMessages', id),
  },
})
