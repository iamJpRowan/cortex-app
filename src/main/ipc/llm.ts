import { ipcMain, BrowserWindow } from 'electron'
import { toolRegistry } from '../services/llm/tools/registry'
import { getLLMAgentService, resetAgentService } from '../services/llm/agent'
import type { LLMQueryOptions, StreamQueryResult } from '../../shared/types'
// Import builtin tools to trigger auto-registration
import '../services/llm/tools/builtin'

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

        // Start streaming in background (don't await)
        // Events will be sent via webContents.send
        // Pass streamId to agent service so all events use the same ID
        agentService
          .queryStream(message, streamId, { ...options, conversationId }, streamEvent => {
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
}
