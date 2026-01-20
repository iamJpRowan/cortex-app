export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
    ollamaQuery: (prompt?: string) => Promise<{ success: boolean; response?: string; error?: string }>
    ollamaListModels: () => Promise<{ success: boolean; models?: string[]; error?: string }>
    ollamaGetDefaultModel: () => Promise<{ success: boolean; model: string | null }>
  }
}

declare global {
  interface Window {
    api: API
  }
}
