import { ipcMain, BrowserWindow, safeStorage } from 'electron'
import { toolRegistry } from '@main/services/llm/tools/registry'
import { getLLMAgentService, resetAgentService } from '@main/services/llm/agent'
import { getConversationService } from '@main/services/llm/conversations'
import { generateChatTitle } from '@main/services/llm/title-generator'
import {
  getModelsWithMetadata,
  getDiscoverableModels,
} from '@main/services/llm/providers/model-list-service'
import { providerRegistry } from '@main/services/llm/providers/registry'
import { getProviderConfigWithDecryptedKeys } from '@main/services/llm/providers/secure-config'
import { getSettingsService } from '@main/services/settings'
import type { LLMProvidersConfig } from '@main/services/settings'
import type { LLMQueryOptions, StreamQueryResult, ListModelsResult } from '@shared/types'
// Import builtin tools to trigger auto-registration
import '@main/services/llm/tools/builtin'

/**
 * Register IPC handlers for LLM agent functionality
 */
export function registerLLMHandlers() {
  /**
   * Query the LLM agent with a message
   * Lazy initialization: agent is initialized on first query if not already initialized
   *
   * @param message The user's message to send to the agent
   * @param options Optional parameters for the query
   * @param options.conversationId Continue an existing conversation
   * @param options.context Context from the active view
   * @param options.agent Agent configuration to use
   * @param options.model Model to use for this query
   */
  ipcMain.handle(
    'llm:query',
    async (_event, message: string, options?: LLMQueryOptions) => {
      try {
        const { conversationId, context, agent, model } = options ?? {}

        console.log(`[LLM IPC] Query received: ${message}`)
        if (context?.viewId) {
          console.log(`[LLM IPC] Context from view: ${context.viewId}`)
        }
        if (agent?.id) {
          console.log(`[LLM IPC] Using agent: ${agent.name} (${agent.id})`)
        }
        if (model) {
          console.log(`[LLM IPC] Using model: ${model}`)
        }

        // Get agent service (singleton)
        const agentService = getLLMAgentService()

        // Lazy initialization: initialize if not already done
        if (!agentService.isInitialized()) {
          console.log('[LLM IPC] Initializing agent (lazy initialization)...')
          try {
            await agentService.initialize()
            console.log('[LLM IPC] Agent initialized successfully')
          } catch (initError) {
            const errorMessage =
              initError instanceof Error ? initError.message : 'Unknown error'
            console.error(`[LLM IPC] Agent initialization failed: ${errorMessage}`)
            return {
              success: false,
              error: `Failed to initialize agent: ${errorMessage}`,
              suggestion:
                'Check console logs for details. Common issues: SQLite database access, missing dependencies, or Ollama connection problems.',
            }
          }
        }

        // Execute query with options
        const result = await agentService.query(message, {
          conversationId,
          context,
          agent,
          model,
        })

        console.log(
          `[LLM IPC] Query completed. Conversation ID: ${result.conversationId}`
        )

        return {
          success: true,
          response: result.response,
          conversationId: result.conversationId,
          trace: result.trace,
        }
      } catch (error) {
        console.error('[LLM IPC] Query failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          suggestion: 'Check console logs for detailed error information.',
        }
      }
    }
  )

  /**
   * Query the LLM agent with streaming response.
   *
   * Initiates a streaming query and sends events to the renderer via
   * webContents.send('llm:stream', event). Returns immediately with
   * stream ID for correlation.
   *
   * Events sent:
   * - start: Streaming has begun
   * - token: A token has been generated
   * - trace: A trace entry is available (tool call, result)
   * - complete: Streaming finished successfully
   * - error: An error occurred
   *
   * @param message The user's message
   * @param options Query options
   * @returns StreamQueryResult with streamId and conversationId
   */
  ipcMain.handle(
    'llm:queryStream',
    async (event, message: string, options?: LLMQueryOptions) => {
      // Get the sender window to send events back
      const webContents = event.sender
      const window = BrowserWindow.fromWebContents(webContents)

      if (!window) {
        return {
          success: false,
          error: 'Could not find sender window',
        }
      }

      try {
        console.log(`[LLM IPC] Streaming query received: ${message}`)

        // Get agent service (singleton)
        const agentService = getLLMAgentService()

        // Lazy initialization
        if (!agentService.isInitialized()) {
          console.log('[LLM IPC] Initializing agent for streaming...')
          try {
            await agentService.initialize()
            console.log('[LLM IPC] Agent initialized successfully')
          } catch (initError) {
            const errorMessage =
              initError instanceof Error ? initError.message : 'Unknown error'
            console.error(`[LLM IPC] Agent initialization failed: ${errorMessage}`)
            return {
              success: false,
              error: `Failed to initialize agent: ${errorMessage}`,
              suggestion: 'Check console logs for details.',
            }
          }
        }

        // Generate IDs - these will be passed to agent service for consistency
        const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const conversationId = options?.conversationId ?? `conv-${Date.now()}`

        // For first message (messageCount === 0), start title generation immediately (before stream)
        // Handles both: sending into empty state (no convId) and "New Chat" button (has convId)
        try {
          const convService = getConversationService()
          convService.ensureExists(conversationId)
          const conv = convService.get(conversationId)
          if (conv && conv.messageCount === 0) {
            if (!window.isDestroyed()) {
              window.webContents.send('conversations:titleGenerating', {
                conversationId,
              })
            }
            generateChatTitle(message)
              .then(title => {
                if (title && !window.isDestroyed()) {
                  convService.update(conversationId, { title })
                  window.webContents.send('conversations:titleUpdated', {
                    conversationId,
                    title,
                  })
                }
              })
              .catch(err => console.warn('[LLM IPC] Title generation failed:', err))
          }
        } catch (err) {
          console.error('[LLM IPC] Failed to start title generation:', err)
        }

        // Start streaming in background (don't await)
        // Events will be sent via webContents.send
        // Pass streamId to agent service so all events use the same ID
        agentService
          .queryStream(message, streamId, { ...options, conversationId }, streamEvent => {
            // On stream complete, persist model to conversation for Phase 5a
            if (
              streamEvent.type === 'complete' &&
              'model' in streamEvent &&
              streamEvent.model
            ) {
              try {
                const convService = getConversationService()
                convService.ensureExists(streamEvent.conversationId)
                const conv = convService.get(streamEvent.conversationId)
                if (conv) {
                  const nextModels = [...conv.messageModels, streamEvent.model!]
                  convService.update(streamEvent.conversationId, {
                    currentModel: streamEvent.model,
                    messageModels: nextModels,
                    messageCount: nextModels.length,
                  })
                }
              } catch (err) {
                console.error('[LLM IPC] Failed to update conversation model:', err)
              }
            }
            // Send event to renderer
            if (!window.isDestroyed()) {
              window.webContents.send('llm:stream', streamEvent)
            }
          })
          .catch(err => {
            console.error('[LLM IPC] Streaming error:', err)
            if (!window.isDestroyed()) {
              window.webContents.send('llm:stream', {
                type: 'error',
                streamId,
                conversationId,
                error: err instanceof Error ? err.message : 'Unknown error',
              })
            }
          })

        // Return immediately with stream info
        const result: StreamQueryResult = {
          streamId,
          conversationId,
        }

        console.log(`[LLM IPC] Streaming started: ${streamId}`)

        return {
          success: true,
          ...result,
        }
      } catch (error) {
        console.error('[LLM IPC] Failed to start streaming:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  /**
   * List all available tools
   */
  ipcMain.handle('llm:tools:list', async () => {
    try {
      const tools = toolRegistry.list()
      return {
        success: true,
        tools,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Test a tool directly (bypasses agent)
   */
  ipcMain.handle(
    'llm:tools:test',
    async (_event, toolName: string, args: Record<string, unknown>) => {
      try {
        const tool = toolRegistry.get(toolName)

        if (!tool) {
          return {
            success: false,
            error: `Tool "${toolName}" not found`,
          }
        }

        console.log(`[LLM IPC] Testing tool: ${toolName} with args:`, args)

        // Invoke the tool directly
        const result = await tool.invoke(args)

        console.log(`[LLM IPC] Tool result:`, result)

        return {
          success: true,
          toolName,
          result,
          args,
        }
      } catch (error) {
        console.error(`[LLM IPC] Tool test failed:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          toolName,
        }
      }
    }
  )

  /**
   * Reload the LLM agent configuration
   *
   * Resets the agent singleton so the next query will create a fresh
   * instance with updated configuration (including re-reading prompt files).
   * Useful for development iteration on prompts without restarting the server.
   */
  ipcMain.handle('llm:reloadAgent', async () => {
    try {
      console.log('[LLM IPC] Reloading agent configuration...')
      resetAgentService()
      console.log('[LLM IPC] Agent reset - will reinitialize on next query')
      return {
        success: true,
        message: 'Agent configuration reloaded. Changes will take effect on next query.',
      }
    } catch (error) {
      console.error('[LLM IPC] Failed to reload agent:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Dev/testing: encrypt a provider API key and optionally write to settings.
   * Same path the future Provider Configuration UI will use.
   * From renderer DevTools: await api.llm.encryptProviderKey('anthropic', 'sk-ant-...', true)
   */
  /**
   * List all models with metadata, grouped by provider (tool-capable only).
   * Cache invalidated when llm.providers or llm.defaultModel changes.
   */
  ipcMain.handle('llm:listModels', async () => {
    try {
      return await getModelsWithMetadata()
    } catch (error) {
      console.error('[LLM IPC] listModels failed:', error)
      const empty: ListModelsResult = { byProvider: {}, all: [] }
      return empty
    }
  })

  /**
   * List all discoverable models for a provider (full list from API), for the "enable models" UI.
   * Not filtered by enabledModelIds.
   */
  ipcMain.handle('llm:listDiscoverableModels', async (_event, providerId: string) => {
    if (!providerId || typeof providerId !== 'string') {
      return []
    }
    try {
      return await getDiscoverableModels(providerId)
    } catch (error) {
      console.error('[LLM IPC] listDiscoverableModels failed:', error)
      return []
    }
  })

  /**
   * Test connection to a single provider. Returns success and model count or error.
   * Used by Provider Configuration UI.
   */
  ipcMain.handle('llm:testProvider', async (_event, providerId: string) => {
    if (!providerId || typeof providerId !== 'string') {
      return { success: false, error: 'providerId is required' }
    }
    try {
      const settings = getSettingsService()
      const getProviderConfig = (id: string) => {
        const p = (settings.get('llm.providers') ?? {}) as LLMProvidersConfig
        const r =
          typeof p[id] === 'object' && p[id] !== null
            ? (p[id] as Record<string, unknown>)
            : undefined
        return getProviderConfigWithDecryptedKeys(r)
      }
      const modelIds = await providerRegistry.listModels(providerId, getProviderConfig)
      return { success: true, modelCount: modelIds.length }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`[LLM IPC] testProvider(${providerId}) failed:`, message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(
    'llm:encrypt-provider-key',
    async (
      _event,
      providerId: string,
      plainKey: string,
      writeToSettings: boolean = false
    ) => {
      if (!providerId || typeof plainKey !== 'string' || !plainKey.trim()) {
        return {
          success: false,
          error: 'providerId and plainKey (non-empty string) are required',
        }
      }
      if (!safeStorage.isEncryptionAvailable()) {
        return {
          success: false,
          error: 'Encryption is not available on this system',
        }
      }
      try {
        const encrypted = safeStorage.encryptString(plainKey.trim()).toString('base64')
        const fragment = { [providerId]: { apiKeyEncrypted: encrypted } }
        if (writeToSettings) {
          const settings = getSettingsService()
          const current = (settings.get('llm.providers') ?? {}) as LLMProvidersConfig
          const merged: LLMProvidersConfig = { ...current, ...fragment }
          settings.set('llm.providers', merged)
          console.log(
            `[LLM IPC] Encrypted provider key for: ${providerId} (written to settings)`
          )
        } else {
          console.log(`[LLM IPC] Encrypted provider key for: ${providerId}`)
        }
        return {
          success: true,
          fragment,
          written: writeToSettings,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )
}
