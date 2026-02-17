import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { LLMServiceConfig, getDefaultLLMConfig } from '@main/config/defaults'
import { toolRegistry } from './tools/registry'
import { initializeStatePersistence } from './state'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { createAgent, type ReactAgent } from 'langchain'
import type {
  LLMQueryOptions,
  TraceEntry,
  StreamEventHandler,
  ChatMessage,
} from '@shared/types'
import type { PrefixedModelId } from './providers/types'
import { parseModelId } from './providers/types'
import { providerRegistry, getModelsWithMetadata } from './providers'
import { isModelBlocked } from './providers/tool-support-blocklist'
import { getProviderConfigWithDecryptedKeys } from './providers/secure-config'
import { getSettingsService } from '@main/services/settings'

/**
 * Normalize message content to a plain string for display.
 * Handles string content (e.g. Ollama) and content-block arrays (e.g. Anthropic: [{ type: 'text', text: '...' }]).
 */
function messageContentToString(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        'text' in block &&
        typeof (block as { text: unknown }).text === 'string'
      ) {
        parts.push((block as { text: string }).text)
      }
    }
    return parts.join('')
  }
  return JSON.stringify(content)
}

/** Result of parsing AI message content: text for response, thinking blocks for reasoning trace. */
interface ParsedAIContent {
  textContent: string
  thinkingBlocks: string[]
}

/**
 * Parse AI message content that may be block-based (e.g. Anthropic extended thinking).
 * Extracts text blocks for the final response and thinking blocks for reasoning trace.
 * Handles both final API shape and LangChain streaming merge (blocks with index, thinking_delta).
 */
function parseAIContent(content: unknown): ParsedAIContent {
  const result: ParsedAIContent = { textContent: '', thinkingBlocks: [] }
  if (content == null) return result
  if (typeof content === 'string') {
    result.textContent = content
    return result
  }
  if (!Array.isArray(content)) return result
  // Merge thinking by index (streaming sends multiple chunks per block)
  const thinkingByIndex = new Map<number, string>()
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    const idx = typeof b.index === 'number' ? b.index : 0
    if (
      (b.type === 'thinking' || b.type === 'thinking_delta') &&
      typeof b.thinking === 'string'
    ) {
      const prev = thinkingByIndex.get(idx) ?? ''
      thinkingByIndex.set(idx, prev + b.thinking)
    } else if (b.type === 'text' && typeof b.text === 'string') {
      result.textContent += b.text
    }
  }
  const indices = Array.from(thinkingByIndex.keys()).sort((a, b) => a - b)
  for (const i of indices) {
    const text = thinkingByIndex.get(i)?.trim()
    if (text) result.thinkingBlocks.push(text)
  }
  return result
}

/**
 * LLM Agent Service
 * Manages LangGraph agent with tool support and conversation state.
 * Uses provider registry for multi-model support; caches executor per model.
 */
type AgentExecutor = ReactAgent

export class LLMAgentService {
  private checkpointer: SqliteSaver | null = null
  private executorCache = new Map<PrefixedModelId, AgentExecutor>()
  private config: LLMServiceConfig
  private settingsUnsubscribe: (() => void) | null = null

  constructor(config?: Partial<LLMServiceConfig>) {
    const defaults = getDefaultLLMConfig()
    this.config = {
      ...defaults,
      ...config,
      llm: {
        ...defaults.llm,
        ...config?.llm,
      },
      state: {
        ...defaults.state,
        ...config?.state,
      },
      tools: {
        ...defaults.tools,
        ...config?.tools,
      },
    }
    console.log('[LLMAgent] Service created (model per query via provider registry)')
  }

  private getProviderConfig(providerId: string): unknown {
    const providers = getSettingsService().get('llm.providers') ?? {}
    const raw = providers[providerId]
    const rawObj =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : undefined
    return getProviderConfigWithDecryptedKeys(rawObj)
  }

  /**
   * Resolve prefixed model id: options.model, settings default, or Ollama fallback.
   * Rejects blocklisted models (no tool support) with a clear error.
   */
  private async resolveModelId(options?: LLMQueryOptions): Promise<PrefixedModelId> {
    let modelId: PrefixedModelId | null = null
    if (options?.model && String(options.model).trim()) {
      modelId = options.model.trim() as PrefixedModelId
    } else {
      const defaultModel = getSettingsService().get('llm.defaultModel')
      if (defaultModel && String(defaultModel).trim()) {
        const candidate = defaultModel.trim() as PrefixedModelId
        const { all } = await getModelsWithMetadata()
        if (all.some(m => m.id === candidate)) {
          modelId = candidate
        }
      }
    }
    if (modelId) {
      const parsed = parseModelId(modelId)
      if (parsed && isModelBlocked(parsed.providerId, parsed.modelId)) {
        throw new Error(
          `Model "${modelId}" does not support tool calling.\n` +
            'Please choose a model that supports tools (e.g. ollama:llama3.2:3b, ollama:qwen3).'
        )
      }
      return modelId
    }
    const { all } = await getModelsWithMetadata()
    if (all.length > 0) {
      return all[0].id
    }
    throw new Error(
      'No enabled models. Enable at least one model per provider in Settings (LLM Providers).'
    )
  }

  /**
   * Get or create executor for the given prefixed model id. Caches by model id.
   */
  private async getExecutorForModel(
    prefixedModelId: PrefixedModelId
  ): Promise<AgentExecutor> {
    let executor = this.executorCache.get(prefixedModelId)
    if (executor) return executor

    const getConfig = (id: string) => this.getProviderConfig(id)
    const llm = await providerRegistry.getLLM(prefixedModelId, getConfig)
    const tools = toolRegistry.getToolsForAgent()
    if (tools.length === 0) {
      console.warn(
        '[LLMAgent] No tools registered. Agent will work but cannot use tools.'
      )
    }
    executor = createAgent({
      model: llm,
      tools,
      systemPrompt: this.config.llm.systemPrompt,
      checkpointer: this.checkpointer!,
    })
    this.executorCache.set(prefixedModelId, executor)
    console.log(`[LLMAgent] Cached executor for model: ${prefixedModelId}`)
    return executor
  }

  private clearCaches(): void {
    this.executorCache.clear()
    providerRegistry.clearCache()
  }

  /**
   * Initialize state persistence and subscribe to settings changes.
   * No single LLM/executor; those are created per model on first query.
   */
  async initialize(): Promise<void> {
    this.checkpointer = await initializeStatePersistence(this.config.state)
    const settings = getSettingsService()
    this.settingsUnsubscribe = () => {
      settings.removeAllListeners('change')
    }
    settings.on('change', (data: { key: string }) => {
      if (data.key === 'llm.providers' || data.key === 'llm.defaultModel') {
        this.clearCaches()
      }
    })
    console.log('[LLMAgent] Initialized (checkpointer + registry; executor per model)')
  }

  /**
   * Determine message type from class instances or plain objects.
   * Checkpointer deserializes to plain objects; this helper handles both.
   *
   * @see https://v03.api.js.langchain.com/functions/_langchain_core.messages.mapStoredMessagesToChatMessages.html
   */
  private getMessageType(
    msg: BaseMessage | { _getType?: () => string; lc_id?: string[] }
  ): 'human' | 'ai' | 'system' | 'tool' | 'unknown' {
    // Fresh messages from streaming - use instanceof
    if (msg instanceof HumanMessage) return 'human'
    if (msg instanceof AIMessage) return 'ai'
    if (msg instanceof SystemMessage) return 'system'
    if (msg instanceof ToolMessage) return 'tool'

    // Deserialized messages - try _getType method first
    if (typeof msg._getType === 'function') {
      const type = msg._getType()
      if (type === 'human') return 'human'
      if (type === 'ai') return 'ai'
      if (type === 'system') return 'system'
      if (type === 'tool') return 'tool'
    }

    // Last resort - check lc_id serialization format
    if (msg.lc_id && Array.isArray(msg.lc_id)) {
      const id = msg.lc_id.join('.')
      if (id.includes('HumanMessage')) return 'human'
      if (id.includes('AIMessage')) return 'ai'
      if (id.includes('SystemMessage')) return 'system'
      if (id.includes('ToolMessage')) return 'tool'
    }

    return 'unknown'
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
          result: messageContentToString(message.content),
          timestamp: Date.now(),
        })
        console.log(`[LLMAgent] Tool result from ${message.name}:`, message.content)
      }

      // Check for final assistant message
      if (
        message instanceof AIMessage &&
        (!message.tool_calls || message.tool_calls.length === 0)
      ) {
        const content = messageContentToString(message.content)
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
    if (!this.checkpointer) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { conversationId, context, agent, model } = options ?? {}
    const modelId = await this.resolveModelId(options)
    const executor = await this.getExecutorForModel(modelId)

    const config = conversationId
      ? { configurable: { thread_id: conversationId } }
      : { configurable: { thread_id: `conv-${Date.now()}` } }

    console.log(`[LLMAgent] Query: ${message} (model: ${modelId})`)

    if (context?.viewId) {
      console.log(`[LLMAgent] Context from: ${context.viewId}`)
    }
    if (agent?.id) {
      console.log(`[LLMAgent] Agent: ${agent.name} (${agent.id})`)
    }

    const systemPrompt = this.buildSystemPrompt({ context, agent, model })
    const messages: BaseMessage[] = []

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt))
    }
    messages.push(new HumanMessage(message))

    try {
      const result = await executor.invoke(
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
          const content = messageContentToString(msg.content)
          if (content && content.trim()) {
            response = content
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
        const errorWithStatus = errorWithCause as Error & { status_code?: number }
        if (
          (errorMessage.includes('model') &&
            (errorMessage.includes('not found') ||
              errorMessage.includes('does not exist'))) ||
          (errorWithStatus.status_code === 404 && errorMessage.includes('model'))
        ) {
          const modelPart = modelId.includes(':') ? modelId.split(':')[1] : modelId
          throw new Error(
            `Model not found (${modelId}).\nPlease pull the model, e.g.: ollama pull ${modelPart}`
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
   * @param signal Optional AbortSignal to cancel the stream
   * @returns Promise that resolves when streaming is complete
   */
  async queryStream(
    message: string,
    streamId: string,
    options: LLMQueryOptions | undefined,
    onEvent: StreamEventHandler,
    signal?: AbortSignal
  ): Promise<void> {
    if (!this.checkpointer) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { conversationId, context, agent, model } = options ?? {}
    const modelId = await this.resolveModelId(options)
    const executor = await this.getExecutorForModel(modelId)

    const convId = conversationId ?? `conv-${Date.now()}`
    const config: {
      configurable: { thread_id: string; checkpoint_id?: string }
      signal?: AbortSignal
    } = {
      configurable: { thread_id: convId },
    }
    if (options?.checkpointId) {
      config.configurable.checkpoint_id = options.checkpointId
    }
    if (signal) {
      config.signal = signal
    }

    console.log(
      `[LLMAgent] Streaming query: ${message} (streamId: ${streamId}, model: ${modelId})`
    )

    if (context?.viewId) {
      console.log(`[LLMAgent] Context from: ${context.viewId}`)
    }
    if (agent?.id) {
      console.log(`[LLMAgent] Agent: ${agent.name} (${agent.id})`)
    }

    const systemPrompt = this.buildSystemPrompt({ context, agent, model })
    const messages: BaseMessage[] = []

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt))
    }
    messages.push(new HumanMessage(message))

    onEvent({
      type: 'start',
      streamId,
      conversationId: convId,
    })

    const trace: TraceEntry[] = []
    let finalResponse = ''
    let accumulated = ''
    let lastMessageCount = -1
    const processedToolCalls = new Set<string>()
    const toolCallStartTimes = new Map<string, number>()
    /** Accumulate thinking from message chunks; flush when we see text. */
    const reasoningByIndex = new Map<number, string>()
    /** Skip emitting reasoning in values if we already emitted from messages stream. */
    let reasoningEmittedFromMessages = false

    const flushReasoningFromChunks = () => {
      if (reasoningByIndex.size === 0) return
      if (reasoningEmittedFromMessages) {
        reasoningByIndex.clear()
        return
      }
      reasoningEmittedFromMessages = true
      const indices = Array.from(reasoningByIndex.keys()).sort((a, b) => a - b)
      for (const idx of indices) {
        const text = reasoningByIndex.get(idx)?.trim()
        if (text) {
          onEvent({
            type: 'trace',
            streamId,
            conversationId: convId,
            trace: {
              type: 'reasoning',
              content: text,
              timestamp: Date.now(),
            },
          })
        }
      }
      reasoningByIndex.clear()
    }

    try {
      const stream = await executor.stream(
        { messages },
        { ...config, streamMode: ['messages', 'values'] }
      )

      for await (const chunk of stream) {
        // The chunk format depends on which mode emitted it
        // [0] = stream mode identifier, [1] = data
        const [mode, data] = chunk as unknown as [string, unknown]

        if (mode === 'messages') {
          // Token streaming from LLM - data is [messageChunk, metadata]
          const [msgChunk] = data as [{ content?: unknown }, unknown]
          const content = msgChunk?.content
          // Process block-based content for reasoning (emit during stream)
          if (Array.isArray(content)) {
            let sawText = false
            for (const block of content) {
              if (!block || typeof block !== 'object') continue
              const b = block as Record<string, unknown>
              const idx = typeof b.index === 'number' ? b.index : 0
              if (
                (b.type === 'thinking' || b.type === 'thinking_delta') &&
                typeof b.thinking === 'string'
              ) {
                const prev = reasoningByIndex.get(idx) ?? ''
                reasoningByIndex.set(idx, prev + b.thinking)
              } else if (b.type === 'text' && typeof b.text === 'string') {
                sawText = true
              }
            }
            if (sawText) flushReasoningFromChunks()
          }
          const token = messageContentToString(content)
          if (token) {
            accumulated += token
            onEvent({
              type: 'token',
              streamId,
              conversationId: convId,
              token,
              accumulated,
            })
          }
        } else if (mode === 'values') {
          // Step update - data contains full state
          const stateData = data as { messages?: BaseMessage[] }
          const allMessages = stateData.messages || []

          // On first values chunk, capture initial message count
          if (lastMessageCount === -1) {
            lastMessageCount = allMessages.length
            continue
          }

          // Process new messages for tool calls and results
          for (let i = lastMessageCount; i < allMessages.length; i++) {
            const msg = allMessages[i]
            const msgType = this.getMessageType(msg)

            if (msgType === 'ai') {
              const aiMsg = msg as AIMessage
              // Check for tool calls
              if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                for (const toolCall of aiMsg.tool_calls) {
                  // Use tool call ID for deduplication and correlation
                  const toolCallId = toolCall.id || `${toolCall.name}-${Date.now()}`
                  if (processedToolCalls.has(toolCallId)) continue
                  processedToolCalls.add(toolCallId)

                  const startTime = Date.now()
                  // Track start time by tool call ID for duration calculation
                  toolCallStartTimes.set(toolCallId, startTime)

                  const traceEntry: TraceEntry = {
                    type: 'tool_call',
                    toolCallId,
                    toolName: toolCall.name,
                    args: toolCall.args as Record<string, unknown>,
                    timestamp: startTime,
                  }
                  trace.push(traceEntry)
                  onEvent({
                    type: 'trace',
                    streamId,
                    conversationId: convId,
                    trace: traceEntry,
                  })
                  console.log(`[LLMAgent] Tool call: ${toolCall.name} (${toolCallId})`)
                }
              }

              // Capture final response and any reasoning (emit only if not already from messages stream)
              const parsed = parseAIContent(aiMsg.content)
              if (!reasoningEmittedFromMessages) {
                for (const thinking of parsed.thinkingBlocks) {
                  if (thinking.trim()) {
                    const reasoningEntry: TraceEntry = {
                      type: 'reasoning',
                      content: thinking.trim(),
                      timestamp: Date.now(),
                    }
                    onEvent({
                      type: 'trace',
                      streamId,
                      conversationId: convId,
                      trace: reasoningEntry,
                    })
                  }
                }
                if (parsed.thinkingBlocks.some(t => t.trim())) {
                  reasoningEmittedFromMessages = true
                }
              }
              if (parsed.textContent.trim() && !aiMsg.tool_calls?.length) {
                finalResponse = parsed.textContent.trim()
              }
            } else if (msgType === 'tool') {
              const toolMsg = msg as ToolMessage
              // Tool result
              const content = messageContentToString(toolMsg.content)

              const toolName = toolMsg.name || 'unknown'
              const toolCallId = toolMsg.tool_call_id
              const endTime = Date.now()

              // Calculate duration from start time using tool call ID
              const startTime = toolCallId
                ? toolCallStartTimes.get(toolCallId)
                : undefined
              const duration = startTime ? endTime - startTime : undefined
              if (toolCallId) toolCallStartTimes.delete(toolCallId)

              // Detect tool errors - prefer status field, fall back to content parsing
              const isError =
                toolMsg.status === 'error' ||
                (toolMsg.status === undefined &&
                  (content.includes('Error invoking tool') ||
                    content.includes('did not match expected schema') ||
                    content.startsWith('Error:')))

              const traceEntry: TraceEntry = {
                type: 'tool_result',
                toolCallId,
                toolName,
                result: content,
                timestamp: endTime,
                duration,
                error: isError ? content : undefined,
              }
              trace.push(traceEntry)
              onEvent({
                type: 'trace',
                streamId,
                conversationId: convId,
                trace: traceEntry,
              })
              const durationStr = duration ? ` (${duration}ms)` : ''
              if (isError) {
                console.error(
                  `[LLMAgent] Tool error from ${toolName}${durationStr}:`,
                  content
                )
              } else {
                console.log(`[LLMAgent] Tool result from ${toolName}${durationStr}`)
              }
              // Reset accumulated for next LLM response after tool
              accumulated = ''
            }
          }

          lastMessageCount = allMessages.length
        }
      }

      // Flush any reasoning left in buffer (e.g. stream ended before text chunk)
      flushReasoningFromChunks()

      // Use accumulated tokens as final response if we have them
      if (accumulated.trim()) {
        finalResponse = accumulated
      }

      // Add final assistant message to trace
      if (finalResponse.trim()) {
        trace.push({
          type: 'assistant_message',
          content: finalResponse,
          timestamp: Date.now(),
        })
      }

      // Emit completion event (include model for conversation/message tracking)
      onEvent({
        type: 'complete',
        streamId,
        conversationId: convId,
        response: finalResponse || 'No response',
        trace,
        model: modelId,
      })

      console.log(
        `[LLMAgent] Streaming complete. Response length: ${finalResponse.length}`
      )
    } catch (error) {
      // User cancelled: emit cancelled event with partial content
      const isAbort =
        signal?.aborted ||
        (error instanceof Error &&
          (error.name === 'AbortError' || error.message === 'The operation was aborted'))

      if (isAbort) {
        onEvent({
          type: 'cancelled',
          streamId,
          conversationId: convId,
          accumulated: accumulated.trim() || undefined,
        })
        return
      }

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

        const errorWithStatus = errorWithCause as Error & { status_code?: number }
        if (
          (errMsg.includes('model') &&
            (errMsg.includes('not found') || errMsg.includes('does not exist'))) ||
          (errorWithStatus.status_code === 404 && errMsg.includes('model'))
        ) {
          errorMessage = `Model not found (${modelId}).`
          const part = modelId.includes(':') ? modelId.split(':')[1] : modelId
          suggestion = `Please pull the model, e.g.: ollama pull ${part}`
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
   * Build a map of output message index -> timestamp from checkpoint history.
   * Each checkpoint's ts is when that step completed (user sent or agent finished).
   */
  private async buildMessageTimestampMap(
    conversationId: string
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>()
    const config = { configurable: { thread_id: conversationId } }
    const checkpoints: {
      checkpoint: { ts: string }
      channelValues: { messages?: BaseMessage[] }
    }[] = []

    for await (const tuple of this.checkpointer!.list(config)) {
      if (!tuple?.checkpoint) continue
      const cv = tuple.checkpoint.channel_values as { messages?: BaseMessage[] }
      checkpoints.push({ checkpoint: tuple.checkpoint, channelValues: cv })
    }

    // Oldest first so we assign each message the first checkpoint that contains it
    checkpoints.sort(
      (a, b) => new Date(a.checkpoint.ts).getTime() - new Date(b.checkpoint.ts).getTime()
    )

    for (const { checkpoint, channelValues: cv } of checkpoints) {
      if (!cv?.messages || !Array.isArray(cv.messages)) continue
      let outIndex = 0
      for (const msg of cv.messages) {
        const msgType = this.getMessageType(msg)
        if (msgType === 'system') continue
        if (msgType === 'human') {
          if (!map.has(outIndex)) map.set(outIndex, new Date(checkpoint.ts).getTime())
          outIndex++
        } else if (msgType === 'ai') {
          const aiMsg = msg as AIMessage
          const content = messageContentToString(aiMsg.content)
          if (content && content.trim()) {
            if (!map.has(outIndex)) map.set(outIndex, new Date(checkpoint.ts).getTime())
            outIndex++
          }
        } else if (msgType === 'tool') {
          // Tool results don't add output messages
        }
      }
    }
    return map
  }

  /**
   * Get the checkpoint ID and message count for "restore from here" at the given
   * last output message index (0-based index in [user0, asst0, user1, asst1, ...]).
   * Returns the checkpoint that contains exactly (lastOutputMessageIndex + 1) output messages.
   */
  async getCheckpointIdForRestore(
    conversationId: string,
    lastOutputMessageIndex: number
  ): Promise<{ checkpointId: string; messageCount: number } | null> {
    if (!this.checkpointer) {
      throw new Error('Checkpointer not initialized. Call initialize() first.')
    }

    const config = { configurable: { thread_id: conversationId } }
    const checkpoints: {
      checkpointId: string
      checkpoint: { ts: string }
      channelValues: { messages?: BaseMessage[] }
    }[] = []

    for await (const tuple of this.checkpointer.list(config)) {
      if (!tuple?.checkpoint) continue
      const checkpointId = (
        tuple as { config?: { configurable?: { checkpoint_id?: string } } }
      ).config?.configurable?.checkpoint_id
      if (!checkpointId) continue
      const cv = tuple.checkpoint.channel_values as { messages?: BaseMessage[] }
      checkpoints.push({
        checkpointId,
        checkpoint: tuple.checkpoint,
        channelValues: cv,
      })
    }

    checkpoints.sort(
      (a, b) => new Date(a.checkpoint.ts).getTime() - new Date(b.checkpoint.ts).getTime()
    )

    const targetCount = lastOutputMessageIndex + 1
    for (const { checkpointId: cid, channelValues: cv } of checkpoints) {
      if (!cv?.messages || !Array.isArray(cv.messages)) continue
      let outCount = 0
      for (const msg of cv.messages) {
        const msgType = this.getMessageType(msg)
        if (msgType === 'system') continue
        if (msgType === 'human') {
          outCount++
        } else if (msgType === 'ai') {
          const aiMsg = msg as AIMessage
          const content = messageContentToString(aiMsg.content)
          if (content && content.trim()) outCount++
        }
      }
      if (outCount === targetCount) {
        return { checkpointId: cid, messageCount: targetCount }
      }
    }
    return null
  }

  /**
   * Get conversation messages from the checkpointer.
   *
   * Reads the checkpoint state for a conversation and extracts
   * messages in a format suitable for UI display.
   * Uses checkpoint history to set timestamps: user = when sent, agent = when response finished.
   *
   * @param conversationId The conversation thread ID
   * @param messageModels Optional list of model ids per assistant message (by order);
   *        merged from conversation metadata for per-message attribution when loading history.
   * @param headCheckpointId When set (restore from here), load from this checkpoint instead of latest.
   * @returns Array of chat messages
   */
  async getConversationMessages(
    conversationId: string,
    messageModels?: string[],
    headCheckpointId?: string | null
  ): Promise<ChatMessage[]> {
    if (!this.checkpointer) {
      throw new Error('Checkpointer not initialized. Call initialize() first.')
    }

    try {
      const configurable: { thread_id: string; checkpoint_id?: string } = {
        thread_id: conversationId,
      }
      if (headCheckpointId) {
        configurable.checkpoint_id = headCheckpointId
      }
      const checkpoint = await this.checkpointer.getTuple({
        configurable,
      })

      if (!checkpoint || !checkpoint.checkpoint) {
        console.log(`[LLMAgent] No checkpoint found for: ${conversationId}`)
        return []
      }

      // Extract messages from the checkpoint state
      const state = checkpoint.checkpoint
      const channelValues = state.channel_values as
        | {
            messages?: BaseMessage[]
          }
        | undefined

      if (!channelValues?.messages || !Array.isArray(channelValues.messages)) {
        console.log(`[LLMAgent] No messages in checkpoint for: ${conversationId}`)
        return []
      }

      const timestampMap = await this.buildMessageTimestampMap(conversationId)
      const fallbackTs = Date.now()

      const messages: ChatMessage[] = []
      let messageIndex = 0
      let assistantIndex = 0
      let outputIndex = 0

      // Track pending trace entries for current assistant turn
      let pendingTrace: TraceEntry[] = []

      for (const msg of channelValues.messages) {
        const msgType = this.getMessageType(msg)

        // Skip system messages (they're internal context)
        if (msgType === 'system') {
          continue
        }

        if (msgType === 'human') {
          // New user message - reset pending trace
          pendingTrace = []

          const content = messageContentToString(msg.content)

          messages.push({
            id: `msg-${conversationId}-${messageIndex++}`,
            role: 'user',
            content,
            timestamp: timestampMap.get(outputIndex) ?? fallbackTs,
          })
          outputIndex++
        } else if (msgType === 'ai') {
          const aiMsg = msg as AIMessage
          const toolCalls = aiMsg.tool_calls

          // If this AI message has tool calls, add them to pending trace
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              pendingTrace.push({
                type: 'tool_call',
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                args: toolCall.args as Record<string, unknown>,
                timestamp: Date.now(),
              })
            }
          }

          // If this AI message has content (final response), add it with trace
          const content = messageContentToString(aiMsg.content)

          if (content && content.trim()) {
            const model =
              messageModels && assistantIndex < messageModels.length
                ? messageModels[assistantIndex]
                : undefined
            assistantIndex += 1
            messages.push({
              id: `msg-${conversationId}-${messageIndex++}`,
              role: 'assistant',
              content,
              timestamp: timestampMap.get(outputIndex) ?? fallbackTs,
              trace: pendingTrace.length > 0 ? [...pendingTrace] : undefined,
              ...(model ? { model } : {}),
            })
            outputIndex++
            // Reset trace after attaching to response
            pendingTrace = []
          }
        } else if (msgType === 'tool') {
          // Tool result - add to pending trace
          const toolMsg = msg as ToolMessage
          const content = messageContentToString(toolMsg.content)

          pendingTrace.push({
            type: 'tool_result',
            toolCallId: toolMsg.tool_call_id,
            toolName: toolMsg.name || 'unknown',
            result: content,
            timestamp: Date.now(),
          })
        }
      }

      console.log(
        `[LLMAgent] Retrieved ${messages.length} messages for: ${conversationId}`
      )
      return messages
    } catch (error) {
      console.error('[LLMAgent] Failed to get conversation messages:', error)
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
   * True when checkpointer is ready; executors are created per model on demand.
   */
  isInitialized(): boolean {
    return this.checkpointer !== null
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

/**
 * Reset the agent service singleton
 * Forces the next getLLMAgentService() call to create a fresh instance
 * with updated configuration (including re-reading prompt files)
 *
 * Used by the 'Reload LLM Agent' command for development iteration
 */
export function resetAgentService(): void {
  if (agentService) {
    console.log('[LLMAgent] Resetting agent service (will reinitialize on next query)')
    agentService = null
  }
}
