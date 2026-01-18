export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
  }
}

declare global {
  interface Window {
    api: API
  }
}
