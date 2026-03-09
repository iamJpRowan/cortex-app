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
  TurnBlock,
} from '@shared/types'
import { interleaveToolCallsWithResults } from '@shared/lib/chat-blocks'
import type { PrefixedModelId } from './providers/types'
import { parseModelId } from './providers/types'
import { providerRegistry, getModelsWithMetadata } from './providers'
import { isModelBlocked } from './providers/tool-support-blocklist'
import { getProviderConfigWithDecryptedKeys } from './providers/secure-config'
import { getSettingsService } from '@main/services/settings'
import {
  wrapAskTool,
  runWithStreamContext,
  cancelConversationApprovals,
} from './tools/ask-interceptor'
import type { PendingApproval } from '@shared/types'

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

/** Token usage shape we emit and store. */
type TokenUsageShape = {
  input?: number
  output?: number
  thinking?: number
}

/** Max length for tool result/error in trace (avoids huge IPC payloads and renderer freezes). */
const MAX_TOOL_RESULT_DISPLAY_LENGTH = 4096

/** Max length for accumulated content in error/cancelled events (avoid sending huge payloads to renderer). */
const MAX_ACCUMULATED_IN_EVENT_LENGTH = 8192

/** Max length for error message when logging (avoid blocking on huge API JSON). */
const MAX_ERROR_LOG_LENGTH = 500

/** Max length for error message in stream event (avoid huge payload to renderer). */
const MAX_ERROR_MESSAGE_IN_EVENT_LENGTH = 2000

function truncateForDisplay(
  s: string,
  maxLen: number = MAX_TOOL_RESULT_DISPLAY_LENGTH
): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + '\n\n… (truncated)'
}

/**
 * Merge new usage into existing. Only sets fields present in `next` so providers
 * that send usage in multiple chunks (e.g. Anthropic: input in message_start,
 * output in message_delta) accumulate correctly.
 */
function mergeTokenUsage(
  current: TokenUsageShape | undefined,
  next: TokenUsageShape
): TokenUsageShape {
  return {
    input: next.input ?? current?.input,
    output: next.output ?? current?.output,
    thinking: next.thinking ?? current?.thinking,
  }
}

/**
 * Extract token usage from provider-specific shapes:
 * - usage_metadata / response_metadata.usage: input_tokens, output_tokens (or prompt_tokens, completion_tokens)
 * - response_metadata (Ollama): prompt_eval_count, eval_count
 */
function extractTokenUsage(msg: {
  usage_metadata?: Record<string, unknown>
  response_metadata?: Record<string, unknown>
}): TokenUsageShape | undefined {
  const usage =
    msg.usage_metadata ??
    (msg.response_metadata?.usage as Record<string, unknown> | undefined)
  if (usage && typeof usage === 'object') {
    const u = usage as Record<string, unknown>
    const input =
      typeof u.input_tokens === 'number'
        ? u.input_tokens
        : typeof u.prompt_tokens === 'number'
          ? u.prompt_tokens
          : typeof u.inputTokens === 'number'
            ? u.inputTokens
            : undefined
    const output =
      typeof u.output_tokens === 'number'
        ? u.output_tokens
        : typeof u.completion_tokens === 'number'
          ? u.completion_tokens
          : typeof u.outputTokens === 'number'
            ? u.outputTokens
            : undefined
    if (input !== undefined || output !== undefined) {
      return {
        input: typeof input === 'number' ? input : undefined,
        output: typeof output === 'number' ? output : undefined,
      }
    }
  }
  // Ollama: usage can be in response_metadata as prompt_eval_count / eval_count
  const rm = msg.response_metadata
  if (rm && typeof rm === 'object') {
    const r = rm as Record<string, unknown>
    const input =
      typeof r.prompt_eval_count === 'number' ? r.prompt_eval_count : undefined
    const output = typeof r.eval_count === 'number' ? r.eval_count : undefined
    if (input !== undefined || output !== undefined) {
      return {
        input,
        output,
      }
    }
  }
  return undefined
}

/**
 * LLM Agent Service
 * Manages LangGraph agent with tool support and conversation state.
 * Uses provider registry for multi-model support; caches executor per model.
 */
type AgentExecutor = ReactAgent

export class LLMAgentService {
  private checkpointer: SqliteSaver | null = null
  private executorCache = new Map<string, AgentExecutor>()
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
   * Get or create executor for the given prefixed model id and conversation mode.
   * Cache key is (modelId, modeId) so different modes get different executor instances
   * with the correct filtered tool set. When the user changes mode, the next message
   * misses the cache and a new executor is built with the new mode's tool set.
   */
  private async getExecutorForModel(
    prefixedModelId: PrefixedModelId,
    modeId?: string | null
  ): Promise<AgentExecutor> {
    const cacheKey = `${prefixedModelId}::${modeId ?? ''}`
    let executor = this.executorCache.get(cacheKey)
    if (executor) return executor

    const getConfig = (id: string) => this.getProviderConfig(id)
    const llm = await providerRegistry.getLLM(prefixedModelId, getConfig)
    const { tools, askToolNames } = toolRegistry.getToolsForAgent({ modeId })
    if (tools.length === 0) {
      console.warn(
        '[LLMAgent] No tools registered. Agent will work but cannot use tools.'
      )
    }

    // Wrap ask tools so they pause for user approval at runtime (Phase 9).
    const wrappedTools = tools.map(tool =>
      askToolNames.includes(tool.name) ? wrapAskTool(tool) : tool
    )
    if (askToolNames.length > 0) {
      console.log(`[LLMAgent] Ask tools wrapped for runtime approval: ${askToolNames.join(', ')}`)
    }

    executor = createAgent({
      model: llm,
      tools: wrappedTools,
      systemPrompt: this.config.llm.systemPrompt,
      checkpointer: this.checkpointer!,
    })
    this.executorCache.set(cacheKey, executor)
    console.log(`[LLMAgent] Cached executor for model: ${prefixedModelId}, mode: ${modeId ?? '(none)'}`)
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

    const { conversationId, context, agent, model, modeId } = options ?? {}
    const modelId = await this.resolveModelId(options)
    const executor = await this.getExecutorForModel(modelId, modeId)

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
    signal?: AbortSignal,
    onPendingApproval?: (approval: PendingApproval) => void
  ): Promise<void> {
    if (!this.checkpointer) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { conversationId, context, agent, model, modeId } = options ?? {}
    const modelId = await this.resolveModelId(options)
    const executor = await this.getExecutorForModel(modelId, modeId)

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
    const blocks: TurnBlock[] = []
    let currentSegment = ''
    let finalResponse = ''
    let lastMessageCount = -1
    const processedToolCalls = new Set<string>()
    const toolCallStartTimes = new Map<string, number>()
    /** Accumulate thinking from message chunks; flush when we see text. */
    const reasoningByIndex = new Map<number, string>()
    /** Start time for reasoning (set on first chunk) for duration. */
    let reasoningStartTime: number | null = null
    /** Skip emitting reasoning in values if we already emitted from messages stream. */
    let reasoningEmittedFromMessages = false
    /** Last time we emitted incremental reasoning (for periodic emit). */
    let lastReasoningEmitTime = 0
    const REASONING_EMIT_INTERVAL_MS = 400
    /** Token usage from stream metadata when provided by the provider. */
    let lastTokenUsage: { input?: number; output?: number; thinking?: number } | undefined

    /** Full text so far (all segments + current segment) for token events and final response. */
    const getAccumulated = (): string => {
      const textParts = blocks
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map(b => b.text)
      if (currentSegment) {
        textParts.push(currentSegment)
      }
      return textParts.join('\n\n')
    }

    /**
     * Flush current segment to blocks, push trace entry, emit trace event with completedSegment.
     * For tool_result: clear segment but do not add to blocks or send completedSegment, so echoed
     * tool output in the stream never appears as response text (tool result is shown in trace only).
     */
    const emitTraceEntry = (entry: TraceEntry): void => {
      const completedSegment = currentSegment
      currentSegment = ''
      const isToolResult = entry.type === 'tool_result'
      if (completedSegment && !isToolResult) {
        blocks.push({ type: 'text', text: completedSegment })
      }
      blocks.push({ type: 'trace', entry })
      trace.push(entry)
      onEvent({
        type: 'trace',
        streamId,
        conversationId: convId,
        trace: entry,
        completedSegment: !isToolResult ? completedSegment || undefined : undefined,
      })
    }

    /** Emit current accumulated reasoning as one trace entry (does not clear or set final flag). */
    const emitReasoningSoFar = () => {
      if (reasoningByIndex.size === 0 || reasoningEmittedFromMessages) return
      const indices = Array.from(reasoningByIndex.keys()).sort((a, b) => a - b)
      const parts: string[] = []
      for (const idx of indices) {
        const text = reasoningByIndex.get(idx)?.trim()
        if (text) parts.push(text)
      }
      const merged = parts.join('\n\n').trim()
      if (!merged) return
      const now = Date.now()
      const duration = reasoningStartTime != null ? now - reasoningStartTime : undefined
      emitTraceEntry({
        type: 'reasoning',
        content: merged,
        timestamp: now,
        duration,
      })
      lastReasoningEmitTime = now
    }

    const flushReasoningFromChunks = () => {
      if (reasoningByIndex.size === 0) return
      if (reasoningEmittedFromMessages) {
        reasoningByIndex.clear()
        return
      }
      reasoningEmittedFromMessages = true
      const indices = Array.from(reasoningByIndex.keys()).sort((a, b) => a - b)
      const now = Date.now()
      for (const idx of indices) {
        const text = reasoningByIndex.get(idx)?.trim()
        if (text) {
          const duration =
            reasoningStartTime != null ? now - reasoningStartTime : undefined
          emitTraceEntry({
            type: 'reasoning',
            content: text,
            timestamp: now,
            duration,
          })
        }
      }
      reasoningByIndex.clear()
    }

    try {
      // Run the stream inside the approval context so ask-tool wrappers can find
      // the active conversationId and fire the onPendingApproval callback.
      await runWithStreamContext(convId, onPendingApproval ?? (() => {}), async () => {
      const stream = await executor.stream(
        { messages },
        { ...config, streamMode: ['messages', 'values'] }
      )

      for await (const chunk of stream) {
        // The chunk format depends on which mode emitted it
        // [0] = stream mode identifier, [1] = data
        const [mode, data] = chunk as unknown as [string, unknown]

        if (mode === 'messages') {
          // Token streaming from LLM - data is [messageChunk, metadata] or similar
          const raw = data as [unknown, unknown] | unknown
          const msgChunk = Array.isArray(raw) ? raw[0] : raw
          const metadata = Array.isArray(raw) ? raw[1] : undefined
          const content =
            msgChunk && typeof msgChunk === 'object' && 'content' in msgChunk
              ? (msgChunk as { content?: unknown }).content
              : undefined
          // Extract token usage from chunk or metadata (usage_metadata, response_metadata, Ollama shape)
          const chunkUsage =
            msgChunk && typeof msgChunk === 'object'
              ? extractTokenUsage(
                  msgChunk as {
                    usage_metadata?: Record<string, unknown>
                    response_metadata?: Record<string, unknown>
                  }
                )
              : undefined
          const metaUsage =
            metadata && typeof metadata === 'object' && 'usage' in metadata
              ? extractTokenUsage({
                  usage_metadata: (metadata as { usage?: Record<string, unknown> })
                    .usage as Record<string, unknown>,
                })
              : undefined
          const usage = chunkUsage ?? metaUsage
          if (usage) lastTokenUsage = mergeTokenUsage(lastTokenUsage, usage)
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
                if (reasoningStartTime == null) reasoningStartTime = Date.now()
                const prev = reasoningByIndex.get(idx) ?? ''
                reasoningByIndex.set(idx, prev + b.thinking)
              } else if (b.type === 'text' && typeof b.text === 'string') {
                sawText = true
              }
            }
            if (sawText) {
              flushReasoningFromChunks()
            } else if (reasoningByIndex.size > 0) {
              const now = Date.now()
              if (now - lastReasoningEmitTime >= REASONING_EMIT_INTERVAL_MS) {
                emitReasoningSoFar()
              }
            }
          }
          const token = messageContentToString(content)
          if (token) {
            currentSegment += token
            const accumulated = getAccumulated()
            onEvent({
              type: 'token',
              streamId,
              conversationId: convId,
              token,
              accumulated,
              currentSegment,
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
              const aiMsg = msg as AIMessage & {
                usage_metadata?: Record<string, unknown>
                response_metadata?: Record<string, unknown>
              }
              const msgUsage = extractTokenUsage(aiMsg)
              if (msgUsage) lastTokenUsage = mergeTokenUsage(lastTokenUsage, msgUsage)
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
                  emitTraceEntry(traceEntry)
                  console.log(`[LLMAgent] Tool call: ${toolCall.name} (${toolCallId})`)
                }
              }

              // Capture final response and any reasoning (emit only if not already from messages stream)
              const parsed = parseAIContent(aiMsg.content)
              if (!reasoningEmittedFromMessages) {
                for (const thinking of parsed.thinkingBlocks) {
                  if (thinking.trim()) {
                    emitTraceEntry({
                      type: 'reasoning',
                      content: thinking.trim(),
                      timestamp: Date.now(),
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
                result: truncateForDisplay(content),
                timestamp: endTime,
                duration,
                error: isError ? truncateForDisplay(content) : undefined,
              }
              emitTraceEntry(traceEntry)
              const durationStr = duration ? ` (${duration}ms)` : ''
              if (isError) {
                console.error(
                  `[LLMAgent] Tool error from ${toolName}${durationStr}:`,
                  content
                )
              } else {
                console.log(`[LLMAgent] Tool result from ${toolName}${durationStr}`)
              }
            }
          }

          lastMessageCount = allMessages.length
        }
      }
      }) // end runWithStreamContext

      // Flush any reasoning left in buffer (e.g. stream ended before text chunk)
      flushReasoningFromChunks()

      // Flush final segment and set response from full accumulated text
      if (currentSegment.trim()) {
        blocks.push({ type: 'text', text: currentSegment.trim() })
      }
      finalResponse = getAccumulated().trim()

      // Add final assistant message to trace
      if (finalResponse) {
        trace.push({
          type: 'assistant_message',
          content: finalResponse,
          timestamp: Date.now(),
        })
      }

      // Emit completion event (include model and token usage when available)
      onEvent({
        type: 'complete',
        streamId,
        conversationId: convId,
        response: finalResponse || 'No response',
        trace,
        blocks: blocks.length > 0 ? blocks : undefined,
        model: modelId,
        tokensUsed: lastTokenUsage,
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
        const cancelledAccumulated = getAccumulated().trim()
        const cancelledForEvent =
          cancelledAccumulated.length <= MAX_ACCUMULATED_IN_EVENT_LENGTH
            ? cancelledAccumulated || undefined
            : cancelledAccumulated.slice(-MAX_ACCUMULATED_IN_EVENT_LENGTH).trimStart() +
              '\n\n… (earlier content omitted)'
        onEvent({
          type: 'cancelled',
          streamId,
          conversationId: convId,
          accumulated: cancelledForEvent || undefined,
        })
        return
      }

      // Log a short message to avoid blocking the event loop on huge error serialization
      const rawMessage = error instanceof Error ? error.message : String(error)
      const shortError =
        rawMessage.length > MAX_ERROR_LOG_LENGTH
          ? rawMessage.slice(0, MAX_ERROR_LOG_LENGTH) + '…'
          : rawMessage
      console.error(
        '[LLMAgent] Streaming query failed:',
        error instanceof Error ? error.name : 'Error',
        shortError
      )

      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      let suggestion = 'Check console logs for detailed error information.'

      // Provide clearer error messages for common issues
      if (error instanceof Error) {
        const errMsg = error.message.toLowerCase()
        const errorWithCause = error as Error & {
          cause?: { code?: string; message?: string }
          status?: number
          status_code?: number
        }
        const cause = errorWithCause.cause
        const status = errorWithCause.status ?? errorWithCause.status_code

        if (
          errMsg.includes('fetch failed') ||
          errMsg.includes('econnrefused') ||
          (cause &&
            (cause.code === 'ECONNREFUSED' || cause.message?.includes('ECONNREFUSED')))
        ) {
          errorMessage = 'Ollama server is not running or not accessible.'
          suggestion = 'Please start the Ollama server with: ollama serve'
        }

        if (
          (errMsg.includes('model') &&
            (errMsg.includes('not found') || errMsg.includes('does not exist'))) ||
          (status === 404 && errMsg.includes('model'))
        ) {
          errorMessage = `Model not found (${modelId}).`
          const part = modelId.includes(':') ? modelId.split(':')[1] : modelId
          suggestion = `Please pull the model, e.g.: ollama pull ${part}`
        }

        // Rate limit (429) – avoid retries and give clear guidance
        if (status === 429 || errMsg.includes('rate_limit')) {
          errorMessage = 'Rate limit exceeded for this model.'
          suggestion =
            'Wait a minute and try again, or use a different model (e.g. a smaller one).'
        }

        // Prompt too long (400) – avoid sending huge accumulated to renderer
        if (
          status === 400 ||
          errMsg.includes('prompt is too long') ||
          errMsg.includes('too long') ||
          errMsg.includes('maximum')
        ) {
          errorMessage = 'Conversation is too long for this model.'
          suggestion =
            'Start a new chat or use "Restore from here" on an earlier message to shorten the context.'
        }
      }

      const accumulatedTrimmed = getAccumulated().trim()
      const accumulatedForEvent =
        accumulatedTrimmed.length <= MAX_ACCUMULATED_IN_EVENT_LENGTH
          ? accumulatedTrimmed || undefined
          : accumulatedTrimmed.slice(-MAX_ACCUMULATED_IN_EVENT_LENGTH).trimStart() +
            '\n\n… (earlier content omitted)'

      // Keep error message bounded so renderer never receives a huge string
      const errorForEvent =
        errorMessage.length <= MAX_ERROR_MESSAGE_IN_EVENT_LENGTH
          ? errorMessage
          : errorMessage.slice(0, MAX_ERROR_MESSAGE_IN_EVENT_LENGTH) + '…'

      onEvent({
        type: 'error',
        streamId,
        conversationId: convId,
        error: errorForEvent,
        suggestion,
        accumulated: accumulatedForEvent || undefined,
      })
    } finally {
      // Cancel any pending approvals so the stream does not hang on error/cancel/completion.
      cancelConversationApprovals(convId)
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

      let turnBlocks: TurnBlock[] = []
      const turnTextSegments: string[] = []
      let turnModel: string | undefined
      let turnTokensUsed: ChatMessage['tokensUsed']

      const pushAssistantTurn = () => {
        if (turnBlocks.length === 0) return
        const content = turnTextSegments.join('\n\n')
        const model =
          messageModels && assistantIndex < messageModels.length
            ? messageModels[assistantIndex]
            : turnModel
        assistantIndex += 1
        const ts = timestampMap.get(outputIndex) ?? fallbackTs
        const blocks = interleaveToolCallsWithResults(turnBlocks)
        messages.push({
          id: `msg-${conversationId}-${messageIndex++}`,
          role: 'assistant',
          content: content || ' ',
          timestamp: ts,
          blocks: [...blocks],
          ...(model ? { model } : {}),
          ...(turnTokensUsed ? { tokensUsed: turnTokensUsed } : {}),
        })
        outputIndex++
        turnBlocks = []
        turnTextSegments.length = 0
        turnModel = undefined
        turnTokensUsed = undefined
      }

      for (const msg of channelValues.messages) {
        const msgType = this.getMessageType(msg)

        if (msgType === 'system') continue

        if (msgType === 'human') {
          pushAssistantTurn()
          const content = messageContentToString(msg.content)
          messages.push({
            id: `msg-${conversationId}-${messageIndex++}`,
            role: 'user',
            content,
            timestamp: timestampMap.get(outputIndex) ?? fallbackTs,
          })
          outputIndex++
        } else if (msgType === 'ai') {
          const aiMsg = msg as AIMessage & {
            usage_metadata?: Record<string, unknown>
            response_metadata?: Record<string, unknown>
          }
          const parsed = parseAIContent(aiMsg.content)
          const tokensUsed = extractTokenUsage(aiMsg)
          if (tokensUsed) turnTokensUsed = tokensUsed
          if (messageModels && assistantIndex < messageModels.length) {
            turnModel = messageModels[assistantIndex]
          }
          // Reasoning first (from thinking blocks)
          for (const thinking of parsed.thinkingBlocks) {
            if (thinking.trim()) {
              turnBlocks.push({
                type: 'trace',
                entry: {
                  type: 'reasoning',
                  content: thinking.trim(),
                  timestamp: Date.now(),
                },
              })
            }
          }
          // Then text segment
          if (parsed.textContent.trim()) {
            turnBlocks.push({ type: 'text', text: parsed.textContent.trim() })
            turnTextSegments.push(parsed.textContent.trim())
          }
          // Then tool calls
          if (aiMsg.tool_calls?.length) {
            for (const toolCall of aiMsg.tool_calls) {
              turnBlocks.push({
                type: 'trace',
                entry: {
                  type: 'tool_call',
                  toolCallId: toolCall.id,
                  toolName: toolCall.name,
                  args: toolCall.args as Record<string, unknown>,
                  timestamp: Date.now(),
                },
              })
            }
          }
        } else if (msgType === 'tool') {
          const toolMsg = msg as ToolMessage
          const content = messageContentToString(toolMsg.content)
          turnBlocks.push({
            type: 'trace',
            entry: {
              type: 'tool_result',
              toolCallId: toolMsg.tool_call_id,
              toolName: toolMsg.name || 'unknown',
              result: truncateForDisplay(content),
              timestamp: Date.now(),
            },
          })
        }
      }

      pushAssistantTurn()

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
