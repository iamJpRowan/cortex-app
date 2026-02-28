import { contextBridge, ipcRenderer } from 'electron'
import type {
  LLMQueryOptions,
  StreamEvent,
  StreamEventHandler,
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
} from '@shared/types'

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
    /**
     * Cancel an active stream by stream ID.
     */
    cancelStream: (streamId: string) => ipcRenderer.invoke('llm:cancelStream', streamId),
    toolsList: () => ipcRenderer.invoke('llm:tools:list'),
    toolsTest: (toolName: string, args: Record<string, unknown>) =>
      ipcRenderer.invoke('llm:tools:test', toolName, args),
    /**
     * Reload the LLM agent configuration.
     * Resets the agent so next query uses fresh prompts from disk.
     */
    reloadAgent: () => ipcRenderer.invoke('llm:reloadAgent'),
    /**
     * List all models with metadata, grouped by provider (tool-capable only).
     */
    listModels: () => ipcRenderer.invoke('llm:listModels'),
    /**
     * List discoverable models for a provider (full list from API), for the enable-models UI.
     */
    listDiscoverableModels: (providerId: string) =>
      ipcRenderer.invoke('llm:listDiscoverableModels', providerId),
    /**
     * Test connection to a provider. Returns { success, modelCount? } or { success: false, error }.
     */
    testProvider: (providerId: string) =>
      ipcRenderer.invoke('llm:testProvider', providerId),
    /**
     * Dev/testing: encrypt a provider API key (same path future Settings UI will use).
     * @param providerId e.g. 'anthropic'
     * @param plainKey Plain API key (e.g. sk-ant-...)
     * @param writeToSettings If true, merge into llm.providers and save (default false)
     * @returns { success, fragment?, written? } or { success: false, error }
     */
    encryptProviderKey: (
      providerId: string,
      plainKey: string,
      writeToSettings?: boolean
    ) =>
      ipcRenderer.invoke(
        'llm:encrypt-provider-key',
        providerId,
        plainKey,
        writeToSettings ?? false
      ),
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
    /**
     * Get checkpoint ID for "restore from here" at the given message index.
     * Returns { success, checkpointId, messageCount } or { success: false, error }.
     */
    getCheckpointIdForRestore: (conversationId: string, lastOutputMessageIndex: number) =>
      ipcRenderer.invoke(
        'conversations:getCheckpointIdForRestore',
        conversationId,
        lastOutputMessageIndex
      ),
    /** Set restore point; next load and submit use this checkpoint. */
    setRestorePoint: (
      conversationId: string,
      checkpointId: string,
      messageCount: number
    ) =>
      ipcRenderer.invoke(
        'conversations:setRestorePoint',
        conversationId,
        checkpointId,
        messageCount
      ),
    /** Subscribe to title updates (e.g. from auto-generated titles). */
    onTitleUpdated: (
      callback: (data: { conversationId: string; title: string }) => void
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { conversationId: string; title: string }
      ) => callback(data)
      ipcRenderer.on('conversations:titleUpdated', handler)
      return () => ipcRenderer.removeListener('conversations:titleUpdated', handler)
    },
    /** Subscribe when title generation starts (for "Generating title..." indicator). */
    onTitleGenerating: (callback: (data: { conversationId: string }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { conversationId: string }
      ) => callback(data)
      ipcRenderer.on('conversations:titleGenerating', handler)
      return () => ipcRenderer.removeListener('conversations:titleGenerating', handler)
    },
  },
  modes: {
    list: () => ipcRenderer.invoke('modes:list'),
    listAll: () => ipcRenderer.invoke('modes:listAll'),
    get: (id: string) => ipcRenderer.invoke('modes:get', id),
    save: (id: string, content: Record<string, string | undefined>) =>
      ipcRenderer.invoke('modes:save', id, content),
    duplicate: (sourceId: string, newId: string) =>
      ipcRenderer.invoke('modes:duplicate', sourceId, newId),
    reset: (id: string) => ipcRenderer.invoke('modes:reset', id),
    delete: (id: string) => ipcRenderer.invoke('modes:delete', id),
    getBuiltinDefault: (id: string) => ipcRenderer.invoke('modes:getBuiltinDefault', id),
    setDisabled: (id: string, disabled: boolean) =>
      ipcRenderer.invoke('modes:setDisabled', id, disabled),
    getFilePath: (id: string) => ipcRenderer.invoke('modes:getFilePath', id),
    openInEditor: (id: string) => ipcRenderer.invoke('modes:openInEditor', id),
  },
  /** Subscribe to file-backed config changes (e.g. modes dir edited externally). */
  userConfig: {
    onChange: (callback: (data: { domain: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { domain: string }) =>
        callback(data)
      ipcRenderer.on('user-config:changed', handler)
      return () => ipcRenderer.removeListener('user-config:changed', handler)
    },
  },
})
