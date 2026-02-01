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
}

/**
 * Trace entry types for execution audit trail.
 */
export type TraceEntryType = 'tool_call' | 'tool_result' | 'assistant_message'

/**
 * A single entry in the execution trace.
 *
 * Traces provide an audit trail of what the agent did during query processing,
 * including tool calls, their results, and the final response.
 */
export interface TraceEntry {
  /** Type of trace entry */
  type: TraceEntryType

  /** Tool name (for tool_call and tool_result types) */
  toolName?: string

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
 * Stored alongside conversation messages in the checkpointer.
 */
export interface ConversationMetadata {
  /** Unique conversation identifier */
  id: string

  /** User-defined or auto-generated title */
  title?: string

  /** Current/default model for the conversation */
  currentModel?: string

  /** Current agent ID for the conversation */
  currentAgentId?: string

  /** When the conversation was created */
  createdAt: number

  /** When the conversation was last updated */
  updatedAt: number

  /** Number of messages in the conversation */
  messageCount?: number
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Types of streaming events sent from main process to renderer.
 */
export type StreamEventType = 'start' | 'token' | 'trace' | 'complete' | 'error'

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
}

/**
 * Event sent when a trace entry is available.
 */
export interface StreamTraceEvent extends StreamEventBase {
  type: 'trace'

  /** The trace entry */
  trace: TraceEntry
}

/**
 * Event sent when streaming completes successfully.
 */
export interface StreamCompleteEvent extends StreamEventBase {
  type: 'complete'

  /** Final complete response */
  response: string

  /** Complete execution trace */
  trace: TraceEntry[]
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
