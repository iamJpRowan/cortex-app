import { ChatOllama } from '@langchain/ollama'
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { LLMServiceConfig, defaultLLMConfig } from '../../config/defaults'
import { toolRegistry } from './tools/registry'
import { initializeStatePersistence } from './state'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { getDefaultModel } from '../ollama'
import { createAgent, ReactAgent } from 'langchain'
import type {
  LLMQueryOptions,
  TraceEntry,
  StreamEventHandler,
} from '../../../shared/types'

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

    // Get tools from registry using getToolsForAgent()
    // This provides a single touch point for future tool permission filtering
    const tools = toolRegistry.getToolsForAgent()

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
  private extractTrace(messages: BaseMessage[]): TraceEntry[] {
    const trace: TraceEntry[] = []

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
   * Build system prompt including agent instructions and context
   */
  private buildSystemPrompt(options: LLMQueryOptions): string | undefined {
    const parts: string[] = []

    // Add agent instructions if provided
    if (options.agent?.instructions) {
      parts.push(options.agent.instructions)
    }

    // Add context if provided
    if (options.context) {
      const contextParts: string[] = []
      if (options.context.viewId) {
        contextParts.push(`Current view: ${options.context.viewId}`)
      }
      if (options.context.summary) {
        contextParts.push(`Context: ${options.context.summary}`)
      }
      if (options.context.details && Object.keys(options.context.details).length > 0) {
        contextParts.push(`Details: ${JSON.stringify(options.context.details)}`)
      }
      if (contextParts.length > 0) {
        parts.push(`\n\n## Current Application Context\n${contextParts.join('\n')}`)
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : undefined
  }

  /**
   * Query the agent with a message
   *
   * @param message The user's message
   * @param options Query options including conversationId, context, agent, model
   */
  async query(
    message: string,
    options?: LLMQueryOptions
  ): Promise<{
    response: string
    conversationId: string
    trace: TraceEntry[]
  }> {
    if (!this.executor || !this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { conversationId, context, agent, model } = options ?? {}

    const config = conversationId
      ? { configurable: { thread_id: conversationId } }
      : { configurable: { thread_id: `conv-${Date.now()}` } }

    console.log(`[LLMAgent] Query: ${message}`)

    // Log context and agent info for debugging
    if (context?.viewId) {
      console.log(`[LLMAgent] Context from: ${context.viewId}`)
    }
    if (agent?.id) {
      console.log(`[LLMAgent] Agent: ${agent.name} (${agent.id})`)
    }
    if (model) {
      console.log(`[LLMAgent] Model override: ${model}`)
    }

    // Build messages with context/instructions if provided
    const systemPrompt = this.buildSystemPrompt({ context, agent, model })
    const messages: BaseMessage[] = []

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt))
    }
    messages.push(new HumanMessage(message))

    // TODO: When Multi-Provider Model Selection is implemented:
    // - If model is provided, create a temporary LLM instance with that model
    // - Route to appropriate provider based on model prefix (ollama:, openai:, etc.)
    void model // Acknowledge for future use

    try {
      const result = await this.executor.invoke(
        {
          messages,
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
   * Query the agent with streaming response.
   *
   * Streams tokens and trace events as they occur, calling the provided
   * event handler for each event. This enables real-time UI updates.
   *
   * @param message The user's message
   * @param streamId Unique stream ID for correlating events
   * @param options Query options including conversationId, context, agent, model
   * @param onEvent Callback for handling stream events
   * @returns Promise that resolves when streaming is complete
   */
  async queryStream(
    message: string,
    streamId: string,
    options: LLMQueryOptions | undefined,
    onEvent: StreamEventHandler
  ): Promise<void> {
    if (!this.executor || !this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { conversationId, context, agent, model } = options ?? {}

    // Use provided conversationId or generate new one
    const convId = conversationId ?? `conv-${Date.now()}`

    const config = { configurable: { thread_id: convId } }

    console.log(`[LLMAgent] Streaming query: ${message} (streamId: ${streamId})`)

    // Log context and agent info for debugging
    if (context?.viewId) {
      console.log(`[LLMAgent] Context from: ${context.viewId}`)
    }
    if (agent?.id) {
      console.log(`[LLMAgent] Agent: ${agent.name} (${agent.id})`)
    }
    if (model) {
      console.log(`[LLMAgent] Model override: ${model}`)
    }

    // Build messages with context/instructions if provided
    const systemPrompt = this.buildSystemPrompt({ context, agent, model })
    const messages: BaseMessage[] = []

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt))
    }
    messages.push(new HumanMessage(message))

    // Acknowledge model override for future use
    void model

    // Emit start event
    onEvent({
      type: 'start',
      streamId,
      conversationId: convId,
    })

    const trace: TraceEntry[] = []
    let accumulated = ''

    try {
      // Use streamEvents for comprehensive streaming
      const stream = await this.executor.streamEvents(
        { messages },
        { ...config, version: 'v2' }
      )

      for await (const event of stream) {
        // Handle different event types from LangGraph
        if (event.event === 'on_chat_model_stream') {
          // Token streaming from the LLM
          const chunk = event.data?.chunk
          if (chunk?.content && typeof chunk.content === 'string') {
            accumulated += chunk.content
            onEvent({
              type: 'token',
              streamId,
              conversationId: convId,
              token: chunk.content,
              accumulated,
            })
          }
        } else if (event.event === 'on_tool_start') {
          // Tool invocation started
          const toolName = event.name || 'unknown'
          const toolInput = event.data?.input
          const traceEntry: TraceEntry = {
            type: 'tool_call',
            toolName,
            args: toolInput as Record<string, unknown>,
            timestamp: Date.now(),
          }
          trace.push(traceEntry)
          onEvent({
            type: 'trace',
            streamId,
            conversationId: convId,
            trace: traceEntry,
          })
          console.log(`[LLMAgent] Tool call: ${toolName}`)
        } else if (event.event === 'on_tool_end') {
          // Tool invocation completed
          const toolName = event.name || 'unknown'
          const toolOutput = event.data?.output

          // Extract the actual result content from the tool output
          // Tool output may be a string, a LangChain message object, or other structure
          let resultContent: string
          if (typeof toolOutput === 'string') {
            resultContent = toolOutput
          } else if (toolOutput?.content !== undefined) {
            // LangChain ToolMessage has a content property
            resultContent =
              typeof toolOutput.content === 'string'
                ? toolOutput.content
                : JSON.stringify(toolOutput.content)
          } else if (toolOutput?.kwargs?.content !== undefined) {
            // Serialized LangChain message format
            resultContent =
              typeof toolOutput.kwargs.content === 'string'
                ? toolOutput.kwargs.content
                : JSON.stringify(toolOutput.kwargs.content)
          } else {
            // Fallback: stringify the output but try to extract meaningful data
            resultContent = JSON.stringify(toolOutput)
          }

          const traceEntry: TraceEntry = {
            type: 'tool_result',
            toolName,
            result: resultContent,
            timestamp: Date.now(),
          }
          trace.push(traceEntry)
          onEvent({
            type: 'trace',
            streamId,
            conversationId: convId,
            trace: traceEntry,
          })
          console.log(`[LLMAgent] Tool result from ${toolName}`)
        }
      }

      // Add final assistant message to trace
      if (accumulated.trim()) {
        trace.push({
          type: 'assistant_message',
          content: accumulated,
          timestamp: Date.now(),
        })
      }

      // Emit completion event
      onEvent({
        type: 'complete',
        streamId,
        conversationId: convId,
        response: accumulated || 'No response',
        trace,
      })

      console.log(`[LLMAgent] Streaming complete. Response length: ${accumulated.length}`)
    } catch (error) {
      console.error('[LLMAgent] Streaming query failed:', error)

      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      let suggestion = 'Check console logs for detailed error information.'

      // Provide clearer error messages for common issues
      if (error instanceof Error) {
        const errMsg = error.message.toLowerCase()
        const errorWithCause = error as Error & {
          cause?: { code?: string; message?: string }
        }
        const cause = errorWithCause.cause

        if (
          errMsg.includes('fetch failed') ||
          errMsg.includes('econnrefused') ||
          (cause &&
            (cause.code === 'ECONNREFUSED' || cause.message?.includes('ECONNREFUSED')))
        ) {
          errorMessage = 'Ollama server is not running or not accessible.'
          suggestion = 'Please start the Ollama server with: ollama serve'
        }

        const modelName = this.config.llm.model || 'llama3.2'
        const errorWithStatus = errorWithCause as Error & { status_code?: number }
        if (
          (errMsg.includes('model') &&
            (errMsg.includes('not found') || errMsg.includes('does not exist'))) ||
          (errorWithStatus.status_code === 404 && errMsg.includes('model'))
        ) {
          errorMessage = `Model "${modelName}" not found in Ollama.`
          suggestion = `Please pull the model with: ollama pull ${modelName}`
        }
      }

      onEvent({
        type: 'error',
        streamId,
        conversationId: convId,
        error: errorMessage,
        suggestion,
      })
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
