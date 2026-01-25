export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
    ollamaQuery: (prompt?: string) => Promise<{ success: boolean; response?: string; error?: string }>
    ollamaListModels: () => Promise<{ success: boolean; models?: string[]; error?: string }>
    ollamaGetDefaultModel: () => Promise<{ success: boolean; model: string | null }>
  }
  llm: {
    query: (message: string, conversationId?: string) => Promise<{
      success: boolean
      response?: string
      conversationId?: string
      trace?: Array<{
        type: 'tool_call' | 'tool_result' | 'assistant_message'
        toolName?: string
        args?: Record<string, unknown>
        result?: string
        content?: string
        timestamp?: number
      }>
      error?: string
      suggestion?: string
    }>
    toolsList: () => Promise<{ success: boolean; tools?: Array<{ name: string; metadata: unknown }>; error?: string }>
    toolsTest: (toolName: string, args: Record<string, unknown>) => Promise<{
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
    onMaximized: (callback: () => void) => () => void
    onUnmaximized: (callback: () => void) => () => void
  }
}

declare global {
  interface Window {
    api: API
  }
}
