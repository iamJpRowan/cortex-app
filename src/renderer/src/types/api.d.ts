import type {
  LLMQueryOptions,
  LLMQueryResult,
  TraceEntry,
  StreamEvent,
  StreamEventHandler,
  StreamQueryResult,
  ListModelsResult,
  ConversationMetadata,
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
  ChatMessage,
} from '@shared/types'

export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
    ollamaQuery: (
      prompt?: string
    ) => Promise<{ success: boolean; response?: string; error?: string }>
    ollamaListModels: () => Promise<{
      success: boolean
      models?: string[]
      error?: string
    }>
    ollamaGetDefaultModel: () => Promise<{ success: boolean; model: string | null }>
  }
  llm: {
    /**
     * Query the LLM agent with a message (non-streaming)
     *
     * @param message The user's message to send to the agent
     * @param options Optional parameters for the query
     */
    query: (message: string, options?: LLMQueryOptions) => Promise<LLMQueryResult>
    /**
     * Start a streaming query.
     * Returns stream info immediately; events arrive via onStream callback.
     *
     * @param message The user's message
     * @param options Optional parameters for the query
     */
    queryStream: (
      message: string,
      options?: LLMQueryOptions
    ) => Promise<{ success: boolean } & Partial<StreamQueryResult> & { error?: string }>
    /**
     * Subscribe to streaming events.
     * Call this before queryStream to receive events.
     * Returns an unsubscribe function.
     *
     * @param callback Function called for each stream event
     */
    onStream: (callback: StreamEventHandler) => () => void
    /**
     * Cancel an active stream by stream ID.
     */
    cancelStream: (streamId: string) => Promise<void>
    toolsList: () => Promise<{
      success: boolean
      tools?: Array<{ name: string; metadata: unknown }>
      error?: string
    }>
    toolsTest: (
      toolName: string,
      args: Record<string, unknown>
    ) => Promise<{
      success: boolean
      toolName?: string
      result?: unknown
      args?: Record<string, unknown>
      error?: string
    }>
    /**
     * Reload the LLM agent configuration.
     * Resets the agent so next query uses fresh prompts from disk.
     */
    reloadAgent: () => Promise<{
      success: boolean
      message?: string
      error?: string
    }>
    /**
     * List all models with metadata, grouped by provider (tool-capable only).
     */
    listModels: () => Promise<ListModelsResult>
    /** List discoverable models for a provider (full list from API), for the enable-models UI. */
    listDiscoverableModels: (
      providerId: string
    ) => Promise<import('@shared/types').ModelMetadata[]>
    /**
     * Test connection to a provider.
     * Returns { success, modelCount? } or { success: false, error }.
     */
    testProvider: (
      providerId: string
    ) => Promise<
      { success: true; modelCount?: number } | { success: false; error: string }
    >
    /**
     * Encrypt and optionally save a provider API key (e.g. Anthropic).
     * @param writeToSettings If true, merge into llm.providers and save.
     */
    encryptProviderKey: (
      providerId: string,
      plainKey: string,
      writeToSettings?: boolean
    ) => Promise<
      | { success: true; fragment?: Record<string, unknown>; written?: boolean }
      | { success: false; error: string }
    >
  }
  window: {
    close: () => Promise<void>
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    // Note: isMaximized, onMaximized, onUnmaximized are available but not currently used
    // They can be added back when Windows/Linux window controls are implemented
    isMaximized: () => Promise<boolean>
    setButtonVisibility: (visible: boolean) => Promise<void>
    onMaximized: (callback: () => void) => () => void
    onUnmaximized: (callback: () => void) => () => void
  }
  settings: {
    get: (key?: string) => Promise<{
      success: boolean
      data?: unknown
      error?: string
    }>
    set: (
      key: string,
      value: unknown
    ) => Promise<{
      success: boolean
      data?: unknown
      error?: string
    }>
    getFilePath: () => Promise<{
      success: boolean
      data?: string
      error?: string
    }>
    openInEditor: () => Promise<{
      success: boolean
      error?: string
    }>
    onChange: (
      callback: (data: { key: string; value: unknown; previous: unknown }) => void
    ) => () => void
  }
  conversations: {
    /** List conversations with optional filtering */
    list: (options?: ListConversationsOptions) => Promise<{
      success: boolean
      conversations?: ConversationMetadata[]
      error?: string
    }>
    /** Get a conversation by ID */
    get: (id: string) => Promise<{
      success: boolean
      conversation?: ConversationMetadata
      error?: string
    }>
    /** Create a new conversation */
    create: (options?: CreateConversationOptions) => Promise<{
      success: boolean
      conversation?: ConversationMetadata
      error?: string
    }>
    /** Update a conversation */
    update: (
      id: string,
      updates: UpdateConversationOptions
    ) => Promise<{
      success: boolean
      conversation?: ConversationMetadata
      error?: string
    }>
    /** Delete a conversation */
    delete: (id: string) => Promise<{
      success: boolean
      error?: string
    }>
    /** Get messages for a conversation */
    getMessages: (id: string) => Promise<{
      success: boolean
      messages?: ChatMessage[]
      error?: string
    }>
    /** Get checkpoint ID for "restore from here" at the given message index. */
    getCheckpointIdForRestore: (
      conversationId: string,
      lastOutputMessageIndex: number
    ) => Promise<{
      success: boolean
      checkpointId?: string | null
      messageCount?: number | null
      error?: string
    }>
    /** Set restore point; next load and submit use this checkpoint. */
    setRestorePoint: (
      conversationId: string,
      checkpointId: string,
      messageCount: number
    ) => Promise<{ success: boolean; error?: string }>
    /** Subscribe to title updates (e.g. from auto-generated titles). */
    onTitleUpdated: (
      callback: (data: { conversationId: string; title: string }) => void
    ) => () => void
    /** Subscribe when title generation starts (for "Generating title..." indicator). */
    onTitleGenerating: (
      callback: (data: { conversationId: string }) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    api: API
  }
}

// Re-export shared types for convenience
export type {
  LLMQueryOptions,
  LLMQueryResult,
  TraceEntry,
  StreamEvent,
  StreamEventHandler,
  StreamQueryResult,
  ListModelsResult,
  ConversationMetadata,
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
  ChatMessage,
}
