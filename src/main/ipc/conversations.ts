import { ipcMain } from 'electron'
import { getConversationService } from '@main/services/llm/conversations'
import { getLLMAgentService } from '@main/services/llm/agent'
import { getSettingsService } from '@main/services/settings'
import type {
  ListConversationsOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
} from '@shared/types'

/**
 * Register IPC handlers for conversation management.
 */
export function registerConversationHandlers() {
  /**
   * List conversations with optional filtering.
   */
  ipcMain.handle(
    'conversations:list',
    async (_event, options?: ListConversationsOptions) => {
      try {
        const service = getConversationService()
        const conversations = service.list(options)

        return {
          success: true,
          conversations,
        }
      } catch (error) {
        console.error('[Conversations IPC] List failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  /**
   * Get a conversation by ID.
   */
  ipcMain.handle('conversations:get', async (_event, id: string) => {
    try {
      const service = getConversationService()
      const conversation = service.get(id)

      if (!conversation) {
        return {
          success: false,
          error: `Conversation "${id}" not found`,
        }
      }

      return {
        success: true,
        conversation,
      }
    } catch (error) {
      console.error('[Conversations IPC] Get failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Create a new conversation.
   * Default modeId comes from agents.defaultModeId when not provided.
   */
  ipcMain.handle(
    'conversations:create',
    async (_event, options?: CreateConversationOptions) => {
      try {
        const service = getConversationService()
        const defaultModeId = getSettingsService().get('agents.defaultModeId') as string
        const opts: CreateConversationOptions = {
          ...options,
          modeId: options?.modeId ?? defaultModeId,
        }
        const conversation = service.create(opts)

        return {
          success: true,
          conversation,
        }
      } catch (error) {
        console.error('[Conversations IPC] Create failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  /**
   * Update a conversation.
   */
  ipcMain.handle(
    'conversations:update',
    async (_event, id: string, updates: UpdateConversationOptions) => {
      try {
        const service = getConversationService()

        // Check if conversation exists
        const existing = service.get(id)
        if (!existing) {
          return {
            success: false,
            error: `Conversation "${id}" not found`,
          }
        }

        service.update(id, updates)

        // Return updated conversation
        const updated = service.get(id)

        return {
          success: true,
          conversation: updated,
        }
      } catch (error) {
        console.error('[Conversations IPC] Update failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  /**
   * Delete a conversation.
   */
  ipcMain.handle('conversations:delete', async (_event, id: string) => {
    try {
      const service = getConversationService()

      // Check if conversation exists
      const existing = service.get(id)
      if (!existing) {
        return {
          success: false,
          error: `Conversation "${id}" not found`,
        }
      }

      service.delete(id)

      // TODO: Also delete from LangGraph checkpointer
      // This requires access to the checkpointer's internal tables

      return {
        success: true,
      }
    } catch (error) {
      console.error('[Conversations IPC] Delete failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Get messages for a conversation from the LangGraph checkpointer.
   * Merges per-message model attribution from conversation metadata (Phase 5a).
   * When the conversation has a restore point (headCheckpointId), loads from that checkpoint.
   */
  ipcMain.handle('conversations:getMessages', async (_event, id: string) => {
    try {
      const agentService = getLLMAgentService()
      const conversationService = getConversationService()

      // Ensure agent is initialized (needed for checkpointer)
      if (!agentService.isInitialized()) {
        console.log('[Conversations IPC] Initializing agent for getMessages...')
        await agentService.initialize()
      }

      const conv = conversationService.get(id)
      const messageModels = conv?.messageModels?.length ? conv.messageModels : undefined
      const headCheckpointId = conv?.headCheckpointId ?? undefined
      const messages = await agentService.getConversationMessages(
        id,
        messageModels,
        headCheckpointId
      )

      return {
        success: true,
        messages,
      }
    } catch (error) {
      console.error('[Conversations IPC] GetMessages failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messages: [],
      }
    }
  })

  /**
   * Get checkpoint ID for "restore from here" at the given message index.
   * lastOutputMessageIndex is the 0-based index in the display list (user0, asst0, user1, asst1, ...).
   */
  ipcMain.handle(
    'conversations:getCheckpointIdForRestore',
    async (_event, conversationId: string, lastOutputMessageIndex: number) => {
      try {
        const agentService = getLLMAgentService()
        if (!agentService.isInitialized()) {
          await agentService.initialize()
        }
        const result = await agentService.getCheckpointIdForRestore(
          conversationId,
          lastOutputMessageIndex
        )
        return {
          success: true,
          checkpointId: result?.checkpointId ?? null,
          messageCount: result?.messageCount ?? null,
        }
      } catch (error) {
        console.error('[Conversations IPC] getCheckpointIdForRestore failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          checkpointId: null,
          messageCount: null,
        }
      }
    }
  )

  /**
   * Set restore point for a conversation. Next load and submit use this checkpoint.
   */
  ipcMain.handle(
    'conversations:setRestorePoint',
    async (
      _event,
      conversationId: string,
      checkpointId: string,
      messageCount: number
    ) => {
      try {
        const service = getConversationService()
        const conv = service.get(conversationId)
        if (!conv) {
          return { success: false, error: 'Conversation not found' }
        }
        service.setRestorePoint(conversationId, checkpointId, messageCount)
        return { success: true }
      } catch (error) {
        console.error('[Conversations IPC] setRestorePoint failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  console.log('[IPC] Conversation handlers registered')
}
