import type { Context } from './chat.js';
import { FileConversationStorage } from '../storage/conversations.js';
import type { Conversation } from '../../shared/types/Conversation.js';

/**
 * Get conversation storage instance from context
 */
function getConversationStorage(context: Context): FileConversationStorage {
  return new FileConversationStorage(context.config.storage.conversationsPath, context.logger);
}

/**
 * List all conversations
 */
export async function listConversations(
  _parent: unknown,
  args: { includeArchived?: boolean },
  context: Context
): Promise<Array<{ id: string; updatedAt: string; title?: string; archived?: boolean; pinned?: boolean; messageCount: number }>> {
  const storage = getConversationStorage(context);
  const conversations = await storage.list(args.includeArchived || false);
  
  // Load full conversations to get message count
  const result = await Promise.all(
    conversations.map(async (conv) => {
      const full = await storage.load(conv.id);
      return {
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
        archived: conv.archived || false,
        pinned: conv.pinned || false,
        messageCount: full?.messages.length || 0,
      };
    })
  );
  
  return result;
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<Conversation | null> {
  const storage = getConversationStorage(context);
  return await storage.load(args.id);
}

/**
 * Rename a conversation
 */
export async function renameConversation(
  _parent: unknown,
  args: { id: string; title: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  await storage.rename(args.id, args.title);
  const conversation = await storage.load(args.id);
  if (!conversation) {
    throw new Error(`Conversation ${args.id} not found`);
  }
  return conversation;
}

/**
 * Archive a conversation
 */
export async function archiveConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  await storage.archive(args.id);
  const conversation = await storage.load(args.id);
  if (!conversation) {
    throw new Error(`Conversation ${args.id} not found`);
  }
  return conversation;
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  await storage.unarchive(args.id);
  const conversation = await storage.load(args.id);
  if (!conversation) {
    throw new Error(`Conversation ${args.id} not found`);
  }
  return conversation;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<boolean> {
  const storage = getConversationStorage(context);
  await storage.delete(args.id);
  return true;
}

/**
 * Pin a conversation
 */
export async function pinConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  await storage.pin(args.id);
  const conversation = await storage.load(args.id);
  if (!conversation) {
    throw new Error(`Conversation ${args.id} not found`);
  }
  return conversation;
}

/**
 * Unpin a conversation
 */
export async function unpinConversation(
  _parent: unknown,
  args: { id: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  await storage.unpin(args.id);
  const conversation = await storage.load(args.id);
  if (!conversation) {
    throw new Error(`Conversation ${args.id} not found`);
  }
  return conversation;
}

/**
 * Create or update a conversation (for drafts)
 */
export async function createOrUpdateConversation(
  _parent: unknown,
  args: { id?: string; title?: string; draft?: string },
  context: Context
): Promise<Conversation> {
  const storage = getConversationStorage(context);
  const conversationId = args.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let conversation = await storage.load(conversationId);
  
  if (!conversation) {
    // Create new conversation
    conversation = {
      id: conversationId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      pinned: false,
    };
  }
  
  // Update title if provided
  if (args.title !== undefined) {
    conversation.title = args.title;
  }
  
  // Update timestamp
  conversation.updatedAt = new Date().toISOString();
  
  // Save conversation (draft is stored client-side, not in server)
  await storage.save(conversation);
  
  return conversation;
}

