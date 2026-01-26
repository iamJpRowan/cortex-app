import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { LLMServiceConfig } from '../../config/defaults'

/**
 * Initialize SQLite database for conversation state
 * Sets up WAL mode and returns LangGraph's SqliteSaver
 */
export async function initializeStatePersistence(
  config: LLMServiceConfig['state']
): Promise<SqliteSaver> {
  const dbPath = config.dbPath

  // Ensure directory exists
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Initialize database with WAL mode if enabled
  if (config.enableWAL) {
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.close()
    console.log(`[State] SQLite database initialized with WAL mode: ${dbPath}`)
  } else {
    console.log(`[State] SQLite database initialized: ${dbPath}`)
  }

  // Create SqliteSaver with connection string
  // Setup is called automatically when needed (put/get/list methods)
  const checkpointer = SqliteSaver.fromConnString(dbPath)

  console.log('[State] Conversation state persistence initialized')
  return checkpointer
}
