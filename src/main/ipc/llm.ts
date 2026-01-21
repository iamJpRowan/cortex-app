import { ipcMain } from 'electron'
import { toolRegistry } from '../services/llm/tools/registry'
import { getLLMAgentService } from '../services/llm/agent'
// Import builtin tools to trigger auto-registration
import '../services/llm/tools/builtin'

/**
 * Register IPC handlers for LLM agent functionality
 */
export function registerLLMHandlers() {
  /**
   * Query the LLM agent with a message
   * Lazy initialization: agent is initialized on first query if not already initialized
   */
  ipcMain.handle('llm:query', async (_event, message: string, conversationId?: string) => {
    try {
      console.log(`[LLM IPC] Query received: ${message}`)
      
      // Get agent service (singleton)
      const agentService = getLLMAgentService()
      
      // Lazy initialization: initialize if not already done
      if (!agentService.isInitialized()) {
        console.log('[LLM IPC] Initializing agent (lazy initialization)...')
        try {
          await agentService.initialize()
          console.log('[LLM IPC] Agent initialized successfully')
        } catch (initError) {
          const errorMessage = initError instanceof Error ? initError.message : 'Unknown error'
          console.error(`[LLM IPC] Agent initialization failed: ${errorMessage}`)
          return {
            success: false,
            error: `Failed to initialize agent: ${errorMessage}`,
            suggestion: 'Check console logs for details. Common issues: SQLite database access, missing dependencies, or Ollama connection problems.'
          }
        }
      }
      
      // Execute query
      const result = await agentService.query(message, conversationId)
      
      console.log(`[LLM IPC] Query completed. Conversation ID: ${result.conversationId}`)
      
      return {
        success: true,
        response: result.response,
        conversationId: result.conversationId,
        trace: result.trace
      }
    } catch (error) {
      console.error('[LLM IPC] Query failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check console logs for detailed error information.'
      }
    }
  })

  /**
   * List all available tools
   */
  ipcMain.handle('llm:tools:list', async () => {
    try {
      const tools = toolRegistry.list()
      return {
        success: true,
        tools
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Test a tool directly (bypasses agent)
   */
  ipcMain.handle('llm:tools:test', async (_event, toolName: string, args: Record<string, any>) => {
    try {
      const tool = toolRegistry.get(toolName)
      
      if (!tool) {
        return {
          success: false,
          error: `Tool "${toolName}" not found`
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
        args
      }
    } catch (error) {
      console.error(`[LLM IPC] Tool test failed:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName
      }
    }
  })
}
