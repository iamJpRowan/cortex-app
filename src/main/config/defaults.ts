import { app } from 'electron'
import { getDefaultModel } from '../services/ollama'
import { getFullSystemPrompt } from './prompts'

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
 * Get default LLM configuration
 * Uses a function to ensure prompts are read fresh each time
 * (enables reload without restart)
 */
export function getDefaultLLMConfig(): LLMServiceConfig {
  return {
    llm: {
      model: getDefaultModel() || 'llama3.2', // Fallback if Ollama not initialized
      temperature: 0,
      systemPrompt: getFullSystemPrompt(),
      baseUrl: 'http://127.0.0.1:11434', // Use IPv4 to avoid IPv6 connection issues
    },
    state: {
      dbPath: app.getPath('userData') + '/conversations.db',
      enableWAL: true,
    },
    tools: {
      enabled: [], // Empty means all registered tools are enabled
    },
  }
}

/**
 * Default configuration for LLM service
 * @deprecated Use getDefaultLLMConfig() for fresh prompt loading
 */
export const defaultLLMConfig: LLMServiceConfig = {
  llm: {
    model: getDefaultModel() || 'llama3.2',
    temperature: 0,
    systemPrompt: getFullSystemPrompt(),
    baseUrl: 'http://127.0.0.1:11434',
  },
  state: {
    dbPath: app.getPath('userData') + '/conversations.db',
    enableWAL: true,
  },
  tools: {
    enabled: [], // Empty means all registered tools are enabled
  },
}
