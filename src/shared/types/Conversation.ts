import type { ChatStep } from './ChatStep.js';

/**
 * Conversation message entry
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string for serialization
  // Derived context - results from queries in this message
  results?: Record<string, unknown>[];
  query?: string; // Cypher query that produced results
  // Steps associated with this message (for assistant messages)
  steps?: ChatStep[];
}

/**
 * Context node - explicitly provided node (e.g., from @ mention)
 */
export interface ContextNode {
  id: string;
  labels?: string[];
  properties?: Record<string, unknown>;
}

/**
 * Conversation structure
 */
export interface Conversation {
  id: string;
  title?: string; // Optional title, auto-generated from first message
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean; // Whether conversation is archived
  pinned?: boolean; // Whether conversation is pinned to top
}

