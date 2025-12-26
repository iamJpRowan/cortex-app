import { promises as fs } from 'fs';
import { join } from 'path';
import type { Conversation } from '../../shared/types/Conversation.js';
import { Logger } from '../logging/Logger.js';

/**
 * Conversation storage interface
 */
export interface ConversationStorage {
  load(conversationId: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  list(includeArchived?: boolean): Promise<Array<{ id: string; updatedAt: string; title?: string; archived?: boolean; pinned?: boolean }>>;
  delete(conversationId: string): Promise<void>;
  rename(conversationId: string, title: string): Promise<void>;
  archive(conversationId: string): Promise<void>;
  unarchive(conversationId: string): Promise<void>;
  pin(conversationId: string): Promise<void>;
  unpin(conversationId: string): Promise<void>;
}

/**
 * File-based conversation storage implementation
 */
export class FileConversationStorage implements ConversationStorage {
  private storageDir: string;
  private logger: Logger;

  constructor(storageDir: string, logger: Logger) {
    this.storageDir = storageDir;
    this.logger = logger;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      await this.logger.error('Failed to create conversation storage directory', { error, dir: this.storageDir });
      throw error;
    }
  }

  /**
   * Get file path for a conversation
   */
  private getConversationPath(conversationId: string): string {
    return join(this.storageDir, `${conversationId}.json`);
  }

  /**
   * Load a conversation by ID
   */
  async load(conversationId: string): Promise<Conversation | null> {
    try {
      const filePath = this.getConversationPath(conversationId);
      const data = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(data) as Conversation;
      
      await this.logger.debug('Loaded conversation', { conversationId, messageCount: conversation.messages.length });
      return conversation;
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        // File doesn't exist - return null (new conversation)
        return null;
      }
      await this.logger.error('Failed to load conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Save a conversation
   */
  async save(conversation: Conversation): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = this.getConversationPath(conversation.id);
      const data = JSON.stringify(conversation, null, 2);
      await fs.writeFile(filePath, data, 'utf-8');
      
      await this.logger.debug('Saved conversation', { conversationId: conversation.id, messageCount: conversation.messages.length });
    } catch (error) {
      await this.logger.error('Failed to save conversation', { error, conversationId: conversation.id });
      throw error;
    }
  }

  /**
   * List all conversations
   */
  async list(includeArchived = false): Promise<Array<{ id: string; updatedAt: string; title?: string; archived?: boolean; pinned?: boolean }>> {
    try {
      await this.ensureStorageDir();
      const files = await fs.readdir(this.storageDir);
      const conversations: Array<{ id: string; updatedAt: string; title?: string; archived?: boolean; pinned?: boolean }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const conversationId = file.replace('.json', '');
            const conversation = await this.load(conversationId);
            if (conversation && (includeArchived || !conversation.archived)) {
              conversations.push({
                id: conversation.id,
                updatedAt: conversation.updatedAt,
                title: conversation.title,
                archived: conversation.archived,
                pinned: conversation.pinned,
              });
            }
          } catch (error) {
            await this.logger.warn('Failed to load conversation file', { file, error });
          }
        }
      }

      // Sort: pinned first, then by updatedAt descending (most recent first)
      conversations.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });

      return conversations;
    } catch (error) {
      await this.logger.error('Failed to list conversations', { error });
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async delete(conversationId: string): Promise<void> {
    try {
      const filePath = this.getConversationPath(conversationId);
      await fs.unlink(filePath);
      await this.logger.debug('Deleted conversation', { conversationId });
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        // File doesn't exist - that's fine
        return;
      }
      await this.logger.error('Failed to delete conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Rename a conversation
   */
  async rename(conversationId: string, title: string): Promise<void> {
    try {
      const conversation = await this.load(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      conversation.title = title;
      conversation.updatedAt = new Date().toISOString();
      await this.save(conversation);
      await this.logger.debug('Renamed conversation', { conversationId, title });
    } catch (error) {
      await this.logger.error('Failed to rename conversation', { error, conversationId, title });
      throw error;
    }
  }

  /**
   * Archive a conversation
   */
  async archive(conversationId: string): Promise<void> {
    try {
      const conversation = await this.load(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      conversation.archived = true;
      conversation.updatedAt = new Date().toISOString();
      await this.save(conversation);
      await this.logger.debug('Archived conversation', { conversationId });
    } catch (error) {
      await this.logger.error('Failed to archive conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Unarchive a conversation
   */
  async unarchive(conversationId: string): Promise<void> {
    try {
      const conversation = await this.load(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      conversation.archived = false;
      conversation.updatedAt = new Date().toISOString();
      await this.save(conversation);
      await this.logger.debug('Unarchived conversation', { conversationId });
    } catch (error) {
      await this.logger.error('Failed to unarchive conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Pin a conversation
   */
  async pin(conversationId: string): Promise<void> {
    try {
      const conversation = await this.load(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      conversation.pinned = true;
      conversation.updatedAt = new Date().toISOString();
      await this.save(conversation);
      await this.logger.debug('Pinned conversation', { conversationId });
    } catch (error) {
      await this.logger.error('Failed to pin conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Unpin a conversation
   */
  async unpin(conversationId: string): Promise<void> {
    try {
      const conversation = await this.load(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      conversation.pinned = false;
      conversation.updatedAt = new Date().toISOString();
      await this.save(conversation);
      await this.logger.debug('Unpinned conversation', { conversationId });
    } catch (error) {
      await this.logger.error('Failed to unpin conversation', { error, conversationId });
      throw error;
    }
  }
}

