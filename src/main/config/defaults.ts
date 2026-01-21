import { app } from 'electron'
import { getDefaultModel } from '../services/ollama'

/**
 * Configuration interface for LLM service
 */
export interface LLMServiceConfig {
  llm: {
    model: string
    temperature: number
    systemPrompt: string
    baseUrl?: string
  }
  state: {
    dbPath: string
    enableWAL: boolean
  }
  tools: {
    enabled: string[]
  }
}

/**
 * Default configuration for LLM service
 * Uses structured defaults pattern - can be overridden for testing
 */
export const defaultLLMConfig: LLMServiceConfig = {
  llm: {
    model: getDefaultModel() || 'llama3.2', // Fallback if Ollama not initialized
    temperature: 0,
    systemPrompt: 'You are a helpful assistant that can use tools to answer questions. Use the available tools when needed to provide accurate information.',
    baseUrl: 'http://127.0.0.1:11434' // Use IPv4 to avoid IPv6 connection issues
  },
  state: {
    dbPath: app.getPath('userData') + '/conversations.db',
    enableWAL: true
  },
  tools: {
    enabled: [] // Empty means all registered tools are enabled
  }
}
