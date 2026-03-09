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
  // Model discovery (Phase 3)
  ModelCapabilities,
  ModelMetadata,
  ListModelsResult,
  // Chat message types
  ChatMessageRole,
  ChatMessage,
  TurnBlock,
  // Conversation types
  ConversationMetadata,
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
  // Permission modes and runtime approval (Tool Permission System)
  PermissionLevel,
  PermissionMode,
  PendingApproval,
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
  TokenUsage,
} from './llm'
