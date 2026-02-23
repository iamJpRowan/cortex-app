/**
 * LLM Type Definitions
 *
 * Defines types for LLM interactions, including query options,
 * conversation metadata, and message structures.
 *
 * These types are designed to be forward-compatible with:
 * - Multi-Provider Model Selection (model tracking)
 * - Custom Agents (agent parameter)
 * - Chat Sidebar Integration (context parameter)
 *
 * @see docs/backlog/chat-interface-mvp.md
 * @see docs/backlog/multi-provider-model-selection.md
 */

import type { Agent } from './agent'
import type { AppContext } from './context'

/**
 * Options for LLM query requests.
 *
 * Uses an options object pattern for extensibility.
 * New parameters can be added without breaking existing callers.
 */
export interface LLMQueryOptions {
  /**
   * Conversation ID for continuing an existing conversation.
   * If not provided, a new conversation is started.
   */
  conversationId?: string

  /**
   * Context from the active view to include in the query.
   * Enables more relevant and contextual responses.
   */
  context?: AppContext

  /**
   * Agent configuration to use for this query.
   * If not provided, uses the default agent.
   */
  agent?: Agent

  /**
   * Model to use for this query.
   * If not provided, uses the agent's default or global default.
   */
  model?: string

  /**
   * Checkpoint ID to resume from (for "restore from here").
   * When set, the stream runs from this checkpoint instead of the latest.
   */
  checkpointId?: string
}

/**
 * Trace entry types for execution audit trail.
 * reasoning = provider extended thinking (e.g. Anthropic); emitted to UI only, not persisted.
 */
export type TraceEntryType =
  | 'tool_call'
  | 'tool_result'
  | 'assistant_message'
  | 'reasoning'

/**
 * A single entry in the execution trace.
 *
 * Traces provide an audit trail of what the agent did during query processing,
 * including tool calls, their results, and the final response.
 */
export interface TraceEntry {
  /** Type of trace entry */
  type: TraceEntryType

  /** Tool call ID for correlating calls with results */
  toolCallId?: string

  /** Tool name (for tool_call and tool_result types) */
  toolName?: string

  /**
   * @deprecated Do not set when creating trace entries. Resolved at render time from
   * the current tool registry (by toolName). Kept optional for backward compatibility
   * with existing chat history.
   */
  displayName?: string

  /**
   * @deprecated Do not set when creating trace entries. Resolved at render time from
   * the current tool registry (by toolName). Kept optional for backward compatibility.
   */
  icon?: string

  /** Arguments passed to the tool (for tool_call type) */
  args?: Record<string, unknown>

  /** Result from the tool (for tool_result type) */
  result?: string

  /** Message content (for assistant_message type) */
  content?: string

  /** Timestamp of the trace entry */
  timestamp?: number

  /** Duration in milliseconds (for completed operations) */
  duration?: number

  /** Error message if the operation failed */
  error?: string
}

/**
 * Result of an LLM query.
 */
export interface LLMQueryResult {
  /** Whether the query succeeded */
  success: boolean

  /** The agent's response text */
  response?: string

  /** Conversation ID (new or existing) */
  conversationId?: string

  /** Execution trace for audit and display */
  trace?: TraceEntry[]

  /** Error message if the query failed */
  error?: string

  /** Suggestion for resolving the error */
  suggestion?: string
}

/**
 * Message role for chat display.
 */
export type ChatMessageRole = 'user' | 'assistant' | 'system'

/**
 * A single block in an assistant turn: either a text segment or a trace step.
 * Enables "message, tool, message, tool" ordering in the UI.
 */
export type TurnBlock =
  | { type: 'text'; text: string }
  | { type: 'trace'; entry: TraceEntry }

/**
 * A chat message for UI display.
 *
 * Represents a single message in a conversation, extracted from
 * the LangGraph checkpointer for display in the chat UI.
 *
 * Assistant messages may use structured `blocks` (ordered text + trace) for
 * "message, tool, message, tool" display. When `blocks` is present, `content`
 * is derived for copy/fallback; legacy messages have only `content` and `trace`.
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string

  /** Role of the message sender */
  role: ChatMessageRole

  /**
   * Message content (plain or markdown).
   * When `blocks` is set, derived as concatenation of text blocks (with \n\n).
   * Required for user messages; optional for assistant when `blocks` is present.
   */
  content: string

  /**
   * Ordered list of text segments and trace steps for this turn.
   * When present, UI renders in order (message, tool, message, tool).
   * Omitted for legacy messages (use content + trace instead).
   */
  blocks?: TurnBlock[]

  /** Timestamp when the message was created */
  timestamp: number

  /** Execution trace for this message (legacy; use blocks when present) */
  trace?: TraceEntry[]

  /** Whether this message is currently streaming */
  isStreaming?: boolean

  /** Model that generated this message (assistant messages only) */
  model?: string

  /** Token usage for this message when available (assistant messages only) */
  tokensUsed?: TokenUsage
}

/**
 * Message metadata for tracking model usage.
 *
 * Each message in a conversation can track which model generated it,
 * enabling per-message model attribution and usage analytics.
 */
export interface MessageMetadata {
  /** Model that generated this message */
  model?: string

  /** Agent that was active when this message was generated */
  agentId?: string

  /** Timestamp when the message was created */
  createdAt?: number

  /** Token count for this message (input + output) */
  tokenCount?: number
}

/**
 * Conversation metadata for storage and display.
 *
 * Stored in SQLite alongside message state from LangGraph checkpointer.
 */
export interface ConversationMetadata {
  /** Unique conversation identifier */
  id: string

  /** User-defined or auto-generated title */
  title: string

  /** Current/default model for the conversation */
  currentModel?: string | null

  /** Current agent ID for the conversation */
  agentId?: string | null

  /** When the conversation was created */
  createdAt: number

  /** When the conversation was last updated */
  updatedAt: number

  /** Number of messages in the conversation */
  messageCount: number
}

// ============================================================================
// Model discovery (Phase 3: Model Discovery & Metadata)
// ============================================================================

/**
 * Capabilities supported by a model (for display and filtering).
 */
export interface ModelCapabilities {
  /** Model supports tool/function calling */
  tools?: boolean
  /** Model supports vision/image inputs */
  vision?: boolean
}

/**
 * Metadata for a single model (discovery list and selector).
 * All fields except id are optional; unknown models get defaults from discovery.
 */
export interface ModelMetadata {
  /** Prefixed model id (e.g. ollama:llama3.2:3b, anthropic:claude-3-5-sonnet-20241022) */
  id: string
  /** Human-readable label for UI */
  label?: string
  /** Context window size in tokens, if known */
  contextWindow?: number
  /** Cost per input token (USD), if known */
  costPerTokenInput?: number
  /** Cost per output token (USD), if known */
  costPerTokenOutput?: number
  /** Capabilities (tools, vision) */
  capabilities?: ModelCapabilities
  /** Short privacy/data note for UI (e.g. "Local only", "Data sent to provider") */
  privacyNote?: string
}

/**
 * Result of listing models: grouped by provider for the model selector.
 */
export interface ListModelsResult {
  /** Provider id -> list of models with metadata (tool-capable only) */
  byProvider: Record<string, ModelMetadata[]>
  /** Flat list of all models (convenience) */
  all: ModelMetadata[]
}

/**
 * Options for listing conversations.
 */
export interface ListConversationsOptions {
  /** Search filter for title */
  search?: string

  /** Filter by start date (timestamp) */
  startDate?: number

  /** Filter by end date (timestamp) */
  endDate?: number

  /** Maximum number of results */
  limit?: number

  /** Offset for pagination */
  offset?: number

  /** Field to order by */
  orderBy?: 'createdAt' | 'updatedAt'

  /** Order direction */
  orderDir?: 'asc' | 'desc'
}

/**
 * Options for creating a conversation.
 */
export interface CreateConversationOptions {
  /** Optional ID (auto-generated if not provided) */
  id?: string

  /** Optional title (auto-generated if not provided) */
  title?: string

  /** Optional agent ID */
  agentId?: string

  /** Optional model */
  currentModel?: string
}

/**
 * Options for updating a conversation.
 */
export interface UpdateConversationOptions {
  /** New title */
  title?: string

  /** New agent ID */
  agentId?: string

  /** New model */
  currentModel?: string

  /** Update message count */
  messageCount?: number
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Types of streaming events sent from main process to renderer.
 */
export type StreamEventType =
  | 'start'
  | 'token'
  | 'trace'
  | 'complete'
  | 'error'
  | 'cancelled'

/**
 * Base streaming event structure.
 */
export interface StreamEventBase {
  /** Unique ID to correlate events with the originating request */
  streamId: string

  /** Type of event */
  type: StreamEventType

  /** Conversation ID for this stream */
  conversationId: string
}

/**
 * Event sent when streaming starts.
 */
export interface StreamStartEvent extends StreamEventBase {
  type: 'start'
}

/**
 * Event sent for each token in the response.
 */
export interface StreamTokenEvent extends StreamEventBase {
  type: 'token'

  /** The token text */
  token: string

  /** Accumulated content so far (optional, for convenience) */
  accumulated?: string

  /**
   * Content of the current segment only (text since last trace).
   * When present, use for building structured blocks during streaming.
   */
  currentSegment?: string
}

/**
 * Event sent when a trace entry is available.
 */
export interface StreamTraceEvent extends StreamEventBase {
  type: 'trace'

  /** The trace entry */
  trace: TraceEntry

  /**
   * Text segment that just ended before this trace (e.g. pre-tool commentary).
   * When present, frontend pushes this as a text block then the trace block.
   */
  completedSegment?: string
}

/**
 * Event sent when streaming completes successfully.
 */
/** Token usage for a completion (when provided by the provider). */
export interface TokenUsage {
  input?: number
  output?: number
  /** Thinking/reasoning tokens when reported separately (e.g. Anthropic) */
  thinking?: number
}

export interface StreamCompleteEvent extends StreamEventBase {
  type: 'complete'

  /** Final complete response (all text segments joined with \n\n) */
  response: string

  /** Complete execution trace */
  trace: TraceEntry[]

  /**
   * Ordered blocks (text segments + trace steps) for this turn.
   * When present, use for "message, tool, message, tool" display.
   */
  blocks?: TurnBlock[]

  /** Model that was used for this response (for conversation/message tracking) */
  model?: string

  /** Token usage for this response when provided by the LLM provider */
  tokensUsed?: TokenUsage
}

/**
 * Event sent when an error occurs.
 */
export interface StreamErrorEvent extends StreamEventBase {
  type: 'error'

  /** Error message */
  error: string

  /** Suggestion for resolving the error */
  suggestion?: string

  /** Accumulated content before the error (for showing partial response) */
  accumulated?: string
}

/**
 * Event sent when the user cancels the stream.
 */
export interface StreamCancelledEvent extends StreamEventBase {
  type: 'cancelled'

  /** Accumulated content up to cancellation (for showing partial response) */
  accumulated?: string
}

/**
 * Union type of all streaming events.
 */
export type StreamEvent =
  | StreamStartEvent
  | StreamTokenEvent
  | StreamTraceEvent
  | StreamCompleteEvent
  | StreamErrorEvent
  | StreamCancelledEvent

/**
 * Callback type for handling stream events.
 */
export type StreamEventHandler = (event: StreamEvent) => void

/**
 * Result of starting a streaming query.
 * Returns stream ID for correlation and unsubscribe function.
 */
export interface StreamQueryResult {
  /** Unique stream ID for correlating events */
  streamId: string

  /** Conversation ID (new or existing) */
  conversationId: string
}
