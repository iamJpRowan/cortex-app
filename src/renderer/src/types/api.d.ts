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
        args?: Record<string, any>
        result?: string
        content?: string
        timestamp?: number
      }>
      error?: string
      suggestion?: string
    }>
    toolsList: () => Promise<{ success: boolean; tools?: Array<{ name: string; metadata: any }>; error?: string }>
    toolsTest: (toolName: string, args: Record<string, any>) => Promise<{
      success: boolean
      toolName?: string
      result?: any
      args?: Record<string, any>
      error?: string
    }>
  }
}

declare global {
  interface Window {
    api: API
  }
}
