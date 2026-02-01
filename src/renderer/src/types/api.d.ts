import type {
  LLMQueryOptions,
  LLMQueryResult,
  TraceEntry,
  StreamEvent,
  StreamEventHandler,
  StreamQueryResult,
} from '../../../shared/types'

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
}
