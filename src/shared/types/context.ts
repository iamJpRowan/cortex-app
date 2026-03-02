/**
 * AI Context Type Definitions
 *
 * Defines the contract for how views expose context to the AI.
 * This enables the "single AI surface" pattern where the chat interface
 * receives context from the active view to provide relevant assistance.
 *
 * Implementation of context collection is deferred to Chat Sidebar Integration
 * where it has demonstrable value. This file defines the interfaces only.
 *
 * @see docs/product/backlog/chat-interface-mvp.md
 * @see docs/product/backlog/chat-sidebar-integration.md
 */

/**
 * Context provided by a view to the AI.
 *
 * Views can implement getContextForAI() to provide relevant context
 * about their current state. This context is included in LLM queries
 * to enable more relevant and helpful responses.
 */
export interface AppContext {
  /**
   * Identifier for the view providing context.
   * Example: 'settings', 'chat', 'graph-explorer'
   */
  viewId?: string

  /**
   * Brief summary of the current view state.
   * Should be concise and suitable for inclusion in LLM context.
   * Example: 'User is viewing Neo4j connection settings'
   */
  summary?: string

  /**
   * Detailed context information.
   * Can include structured data, current selections, or other relevant state.
   * Example: { selectedNode: 'Person:123', expandedProperties: ['name', 'age'] }
   */
  details?: Record<string, unknown>
}

/**
 * Contract interface for views that provide context to the AI.
 *
 * Views implementing this interface can contribute context when the user
 * interacts with the chat sidebar. The context collector will call
 * getContextForAI() on the active view to gather relevant information.
 *
 * @example
 * ```typescript
 * const SettingsView: React.FC & ContextProvider = () => {
 *   // ... component implementation
 * }
 *
 * SettingsView.getContextForAI = () => ({
 *   viewId: 'settings',
 *   summary: 'User is viewing application settings',
 *   details: { activeSection: 'appearance' }
 * })
 * ```
 */
export interface ContextProvider {
  /**
   * Returns the current context for AI consumption.
   * Called by the context collector when gathering context for LLM queries.
   */
  getContextForAI: () => AppContext
}

/**
 * Context collector registry interface.
 *
 * The context collector gathers context from registered providers.
 * Implementation is deferred to Chat Sidebar Integration.
 *
 * This interface defines the contract for:
 * 1. Registering context providers (views)
 * 2. Collecting context from the active provider
 * 3. Aggregating context from multiple sources if needed
 */
export interface ContextCollector {
  /**
   * Register a context provider.
   * @param id Unique identifier for the provider
   * @param provider The context provider to register
   */
  register(id: string, provider: ContextProvider): void

  /**
   * Unregister a context provider.
   * @param id The identifier of the provider to unregister
   */
  unregister(id: string): void

  /**
   * Set the currently active provider.
   * @param id The identifier of the active provider
   */
  setActive(id: string): void

  /**
   * Get context from the active provider.
   * @returns The current context, or undefined if no active provider
   */
  getContext(): AppContext | undefined

  /**
   * Get context from all registered providers.
   * @returns Array of contexts from all providers
   */
  getAllContexts(): AppContext[]
}
