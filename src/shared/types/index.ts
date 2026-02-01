/**
 * Shared Type Definitions
 *
 * Re-exports all shared types for convenient imports.
 *
 * @example
 * ```typescript
 * import { Agent, AppContext, LLMQueryOptions } from '@shared/types'
 * ```
 */

// Agent types
export type { Agent, AgentToolPermissions } from './agent'
export { DEFAULT_AGENT } from './agent'

// Context types
export type { AppContext, ContextProvider, ContextCollector } from './context'

// LLM types
export type {
  LLMQueryOptions,
  LLMQueryResult,
  TraceEntry,
  TraceEntryType,
  MessageMetadata,
  ConversationMetadata,
  // Streaming types
  StreamEventType,
  StreamEventBase,
  StreamStartEvent,
  StreamTokenEvent,
  StreamTraceEvent,
  StreamCompleteEvent,
  StreamErrorEvent,
  StreamEvent,
  StreamEventHandler,
  StreamQueryResult,
} from './llm'
