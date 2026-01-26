import { ChatOllama } from '@langchain/ollama'
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
} from '@langchain/core/messages'
import { LLMServiceConfig, defaultLLMConfig } from '../../config/defaults'
import { toolRegistry } from './tools/registry'
import { initializeStatePersistence } from './state'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { getDefaultModel } from '../ollama'
import { createAgent, ReactAgent } from 'langchain'

/**
 * LLM Agent Service
 * Manages LangGraph agent with tool support and conversation state
 */
export class LLMAgentService {
  private llm: ChatOllama | null = null
  private checkpointer: SqliteSaver | null = null
  private executor: ReactAgent | null = null
  private config: LLMServiceConfig

  constructor(config?: Partial<LLMServiceConfig>) {
    // Merge with defaults
    this.config = {
      ...defaultLLMConfig,
      ...config,
      llm: {
        ...defaultLLMConfig.llm,
        ...config?.llm,
      },
      state: {
        ...defaultLLMConfig.state,
        ...config?.state,
      },
      tools: {
        ...defaultLLMConfig.tools,
        ...config?.tools,
      },
    }

    // Normalize baseUrl to use IPv4 (127.0.0.1) instead of localhost to avoid IPv6 issues
    if (this.config.llm.baseUrl && this.config.llm.baseUrl.includes('localhost')) {
      this.config.llm.baseUrl = this.config.llm.baseUrl.replace('localhost', '127.0.0.1')
    } else if (!this.config.llm.baseUrl) {
      this.config.llm.baseUrl = 'http://127.0.0.1:11434'
    }

    console.log(
      '[LLMAgent] Service created (model will be discovered during initialization)'
    )
  }

  /**
   * Select the best matching model from installed Ollama models
   * Prefers models matching the configured name, falls back to first available
   */
  private selectModel(installedModels: string[], preferredName?: string): string {
    if (installedModels.length === 0) {
      throw new Error(
        'No models installed in Ollama. Please pull a model:\n  ollama pull llama3.2:3b'
      )
    }

    // If preferred name is provided, try to find exact or partial match
    if (preferredName) {
      // Try exact match first
      const exactMatch = installedModels.find(m => m === preferredName)
      if (exactMatch) {
        return exactMatch
      }

      // Try partial match (e.g., "llama3.2" matches "llama3.2:3b")
      const baseName = preferredName.split(':')[0]
      const partialMatch = installedModels.find(
        m => m === baseName || m.startsWith(baseName + ':') || m.includes(baseName)
      )
      if (partialMatch) {
        return partialMatch
      }
    }

    // Fall back to first available model
    return installedModels[0]
  }

  /**
   * Initialize the agent with tools and state persistence
   * Proactively queries Ollama for installed models to ensure we use an exact match
   */
  async initialize(): Promise<void> {
    // Initialize state persistence
    this.checkpointer = await initializeStatePersistence(this.config.state)

    // Query Ollama for installed models BEFORE creating ChatOllama
    // This ensures we use the exact model name (including tags like :3b)
    let selectedModel: string
    try {
      const { Ollama } = await import('ollama')
      const ollamaClient = new Ollama({
        host: this.config.llm.baseUrl || 'http://127.0.0.1:11434',
      })
      const modelsResponse = await ollamaClient.list()

      if (!modelsResponse.models || modelsResponse.models.length === 0) {
        throw new Error(
          'No models installed in Ollama.\n' +
            'Please pull a model:\n' +
            '  ollama pull llama3.2:3b'
        )
      }

      const installedModels = modelsResponse.models.map(m => m.name)
      const preferredModel = this.config.llm.model || getDefaultModel() || undefined

      selectedModel = this.selectModel(installedModels, preferredModel)
      console.log(
        `[LLMAgent] Selected model: ${selectedModel} (from ${installedModels.length} available)`
      )

      // Update config with the actual model name
      this.config.llm.model = selectedModel
    } catch (error) {
      if (error instanceof Error && error.message.includes('No models installed')) {
        throw error
      }
      // If Ollama query fails, provide helpful error
      throw new Error(
        `Failed to query Ollama for installed models: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
          'Please ensure Ollama is running:\n' +
          '  ollama serve'
      )
    }

    // Now create ChatOllama with the verified model name
    this.llm = new ChatOllama({
      model: selectedModel,
      baseUrl: this.config.llm.baseUrl || 'http://127.0.0.1:11434',
      temperature: this.config.llm.temperature,
    })

    // Get tools from registry
    const tools = toolRegistry.getAll()

    if (tools.length === 0) {
      console.warn(
        '[LLMAgent] No tools registered. Agent will work but cannot use tools.'
      )
    } else {
      console.log(`[LLMAgent] Initialized with ${tools.length} tool(s)`)
    }

    // Create agent using LangChain's createAgent (v1.0+ API)
    // Pass checkpointer directly to enable state persistence
    this.executor = createAgent({
      model: this.llm,
      tools: tools,
      systemPrompt: this.config.llm.systemPrompt,
      checkpointer: this.checkpointer,
    })

    console.log('[LLMAgent] Agent executor initialized')
  }

  /**
   * Extract execution trace from agent result messages
   * Identifies tool calls and their results for audit trail
   */
  private extractTrace(messages: BaseMessage[]): Array<{
    type: 'tool_call' | 'tool_result' | 'assistant_message'
    toolName?: string
    args?: Record<string, unknown>
    result?: string
    content?: string
    timestamp?: number
  }> {
    const trace: Array<{
      type: 'tool_call' | 'tool_result' | 'assistant_message'
      toolName?: string
      args?: Record<string, unknown>
      result?: string
      content?: string
      timestamp?: number
    }> = []

    for (const message of messages) {
      // Check for AIMessage with tool calls
      if (
        message instanceof AIMessage &&
        message.tool_calls &&
        message.tool_calls.length > 0
      ) {
        for (const toolCall of message.tool_calls) {
          trace.push({
            type: 'tool_call',
            toolName: toolCall.name,
            args: toolCall.args as Record<string, unknown>,
            timestamp: Date.now(),
          })
          console.log(`[LLMAgent] Tool call: ${toolCall.name} with args:`, toolCall.args)
        }
      }

      // Check for ToolMessage (tool results)
      if (message instanceof ToolMessage) {
        trace.push({
          type: 'tool_result',
          toolName: message.name,
          result:
            typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content),
          timestamp: Date.now(),
        })
        console.log(`[LLMAgent] Tool result from ${message.name}:`, message.content)
      }

      // Check for final assistant message
      if (
        message instanceof AIMessage &&
        (!message.tool_calls || message.tool_calls.length === 0)
      ) {
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content)
        if (content && content.trim()) {
          trace.push({
            type: 'assistant_message',
            content: content,
            timestamp: Date.now(),
          })
        }
      }
    }

    return trace
  }

  /**
   * Query the agent with a message
   */
  async query(
    message: string,
    conversationId?: string
  ): Promise<{
    response: string
    conversationId: string
    trace: Array<{
      type: 'tool_call' | 'tool_result' | 'assistant_message'
      toolName?: string
      args?: Record<string, unknown>
      result?: string
      content?: string
      timestamp?: number
    }>
  }> {
    if (!this.executor || !this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const config = conversationId
      ? { configurable: { thread_id: conversationId } }
      : { configurable: { thread_id: `conv-${Date.now()}` } }

    console.log(`[LLMAgent] Query: ${message}`)

    try {
      const result = await this.executor.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        config
      )

      // Extract the final response (last non-tool message)
      let response = 'No response'
      for (let i = result.messages.length - 1; i >= 0; i--) {
        const msg = result.messages[i]
        if (
          msg instanceof AIMessage &&
          (!msg.tool_calls || msg.tool_calls.length === 0)
        ) {
          const content = msg.content
          if (content) {
            response = typeof content === 'string' ? content : JSON.stringify(content)
            break
          }
        }
      }

      const convId = config.configurable.thread_id

      // Extract trace from messages
      const trace = this.extractTrace(result.messages)

      console.log(`[LLMAgent] Response: ${response}`)
      console.log(`[LLMAgent] Trace contains ${trace.length} step(s)`)

      return {
        response,
        conversationId: convId,
        trace,
      }
    } catch (error) {
      console.error('[LLMAgent] Query failed:', error)

      // Provide clearer error messages for common issues
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        const errorWithCause = error as Error & {
          cause?: { code?: string; message?: string }
        }
        const cause = errorWithCause.cause

        // Check for connection refused errors (Ollama not running)
        if (
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('econnrefused') ||
          (cause &&
            (cause.code === 'ECONNREFUSED' || cause.message?.includes('ECONNREFUSED')))
        ) {
          throw new Error(
            'Ollama server is not running or not accessible.\n' +
              'Please start the Ollama server:\n' +
              '  ollama serve\n\n' +
              'If Ollama is already running, check that it is accessible at http://127.0.0.1:11434'
          )
        }

        // Check for model not found errors (from Ollama ResponseError or error message)
        const modelName = this.config.llm.model || 'llama3.2'
        const errorWithStatus = errorWithCause as Error & { status_code?: number }
        if (
          (errorMessage.includes('model') &&
            (errorMessage.includes('not found') ||
              errorMessage.includes('does not exist'))) ||
          (errorWithStatus.status_code === 404 && errorMessage.includes('model'))
        ) {
          throw new Error(
            `Model "${modelName}" not found in Ollama.\n` +
              `Please pull the model:\n` +
              `  ollama pull ${modelName}`
          )
        }
      }

      throw error
    }
  }

  /**
   * Get the checkpointer instance
   */
  getCheckpointer(): SqliteSaver | null {
    return this.checkpointer
  }

  /**
   * Check if agent is initialized
   */
  isInitialized(): boolean {
    return this.executor !== null
  }
}

/**
 * Singleton instance (initialized on first use)
 */
let agentService: LLMAgentService | null = null

/**
 * Get or create the LLM agent service instance
 */
export function getLLMAgentService(config?: Partial<LLMServiceConfig>): LLMAgentService {
  if (!agentService) {
    agentService = new LLMAgentService(config)
  }
  return agentService
}
