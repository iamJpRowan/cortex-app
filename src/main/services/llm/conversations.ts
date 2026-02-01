import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

/**
 * Conversation metadata stored in SQLite.
 * Messages are stored by LangGraph checkpointer; this tracks metadata.
 */
export interface ConversationRecord {
  id: string
  title: string
  agentId: string | null
  currentModel: string | null
  createdAt: number
  updatedAt: number
  messageCount: number
}

/**
 * Options for listing conversations.
 */
export interface ListConversationsOptions {
  search?: string
  startDate?: number
  endDate?: number
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt'
  orderDir?: 'asc' | 'desc'
}

/**
 * Options for creating a conversation.
 */
export interface CreateConversationOptions {
  id?: string
  title?: string
  agentId?: string
  currentModel?: string
}

/**
 * Updates for a conversation.
 */
export interface UpdateConversationOptions {
  title?: string
  agentId?: string
  currentModel?: string
  messageCount?: number
}

/**
 * ConversationService manages conversation metadata in SQLite.
 *
 * This service stores metadata (title, agent, model, timestamps) separately
 * from the message content which is stored by LangGraph's checkpointer.
 */
export class ConversationService {
  private db: Database.Database | null = null
  private dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(app.getPath('userData'), 'conversations.db')
  }

  /**
   * Initialize the database and create tables if needed.
   */
  initialize(): void {
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.db = new Database(this.dbPath)

    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL')

    // Create conversations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        agent_id TEXT,
        current_model TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0
      )
    `)

    // Create index for search and ordering
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
      ON conversations(updated_at DESC)
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at
      ON conversations(created_at DESC)
    `)

    console.log('[ConversationService] Initialized with database:', this.dbPath)
  }

  /**
   * Ensure the database is initialized.
   */
  private ensureInitialized(): Database.Database {
    if (!this.db) {
      throw new Error('ConversationService not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * Generate a default title based on timestamp.
   */
  private generateDefaultTitle(): string {
    const now = new Date()
    return `Chat - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  /**
   * List conversations with optional filtering.
   */
  list(options?: ListConversationsOptions): ConversationRecord[] {
    const db = this.ensureInitialized()

    const {
      search,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      orderBy = 'updatedAt',
      orderDir = 'desc',
    } = options || {}

    // Build query
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (search) {
      conditions.push('title LIKE ?')
      params.push(`%${search}%`)
    }

    if (startDate !== undefined) {
      conditions.push('created_at >= ?')
      params.push(startDate)
    }

    if (endDate !== undefined) {
      conditions.push('created_at <= ?')
      params.push(endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderColumn = orderBy === 'createdAt' ? 'created_at' : 'updated_at'
    const orderDirection = orderDir.toUpperCase()

    const query = `
      SELECT id, title, agent_id, current_model, created_at, updated_at, message_count
      FROM conversations
      ${whereClause}
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT ? OFFSET ?
    `

    params.push(limit, offset)

    const rows = db.prepare(query).all(...params) as Array<{
      id: string
      title: string
      agent_id: string | null
      current_model: string | null
      created_at: number
      updated_at: number
      message_count: number
    }>

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      agentId: row.agent_id,
      currentModel: row.current_model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
    }))
  }

  /**
   * Get a conversation by ID.
   */
  get(id: string): ConversationRecord | null {
    const db = this.ensureInitialized()

    const row = db
      .prepare(
        `SELECT id, title, agent_id, current_model, created_at, updated_at, message_count
         FROM conversations WHERE id = ?`
      )
      .get(id) as
      | {
          id: string
          title: string
          agent_id: string | null
          current_model: string | null
          created_at: number
          updated_at: number
          message_count: number
        }
      | undefined

    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      agentId: row.agent_id,
      currentModel: row.current_model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
    }
  }

  /**
   * Create a new conversation.
   */
  create(options?: CreateConversationOptions): ConversationRecord {
    const db = this.ensureInitialized()

    const now = Date.now()
    const id = options?.id || `conv-${now}`
    const title = options?.title || this.generateDefaultTitle()

    db.prepare(
      `INSERT INTO conversations (id, title, agent_id, current_model, created_at, updated_at, message_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(id, title, options?.agentId || null, options?.currentModel || null, now, now)

    console.log(`[ConversationService] Created conversation: ${id}`)

    return {
      id,
      title,
      agentId: options?.agentId || null,
      currentModel: options?.currentModel || null,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    }
  }

  /**
   * Update a conversation.
   */
  update(id: string, updates: UpdateConversationOptions): void {
    const db = this.ensureInitialized()

    const setClauses: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [Date.now()]

    if (updates.title !== undefined) {
      setClauses.push('title = ?')
      params.push(updates.title)
    }

    if (updates.agentId !== undefined) {
      setClauses.push('agent_id = ?')
      params.push(updates.agentId)
    }

    if (updates.currentModel !== undefined) {
      setClauses.push('current_model = ?')
      params.push(updates.currentModel)
    }

    if (updates.messageCount !== undefined) {
      setClauses.push('message_count = ?')
      params.push(updates.messageCount)
    }

    params.push(id)

    db.prepare(`UPDATE conversations SET ${setClauses.join(', ')} WHERE id = ?`).run(
      ...params
    )

    console.log(`[ConversationService] Updated conversation: ${id}`)
  }

  /**
   * Delete a conversation.
   * Note: This only deletes metadata. Checkpointer data should be cleaned separately.
   */
  delete(id: string): void {
    const db = this.ensureInitialized()

    db.prepare('DELETE FROM conversations WHERE id = ?').run(id)

    console.log(`[ConversationService] Deleted conversation: ${id}`)
  }

  /**
   * Increment message count for a conversation.
   */
  incrementMessageCount(id: string, increment: number = 1): void {
    const db = this.ensureInitialized()

    db.prepare(
      `UPDATE conversations
       SET message_count = message_count + ?, updated_at = ?
       WHERE id = ?`
    ).run(increment, Date.now(), id)
  }

  /**
   * Ensure a conversation exists, creating it if needed.
   * Called when a query references a conversation ID that doesn't exist yet.
   */
  ensureExists(
    id: string,
    options?: Omit<CreateConversationOptions, 'id'>
  ): ConversationRecord {
    const existing = this.get(id)
    if (existing) {
      return existing
    }

    return this.create({ ...options, id })
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[ConversationService] Database closed')
    }
  }
}

// Singleton instance
let conversationService: ConversationService | null = null

/**
 * Get or create the ConversationService instance.
 */
export function getConversationService(): ConversationService {
  if (!conversationService) {
    conversationService = new ConversationService()
    conversationService.initialize()
  }
  return conversationService
}
