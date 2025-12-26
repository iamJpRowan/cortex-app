import type { Driver, Session } from 'neo4j-driver';
import type { Logger } from '../logging/Logger.js';
import type { OllamaClient } from '../llm/ollama.js';

/**
 * Context passed to tools during execution
 */
export interface ToolContext {
  logger: Logger;
  driver: Driver;
  session: Session;
  llmClient: OllamaClient;
  requestId: string;
  explicitContext?: {
    nodes?: Array<{
      id: string;
      labels?: string[];
      properties?: Record<string, unknown>;
    }>;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    results?: Record<string, unknown>[];
    query?: string; // Cypher query (renamed from cypherQuery for consistency)
  }>;
}

/**
 * Artifact type that a tool can produce
 */
export type ArtifactType = 'query' | 'results' | 'text' | 'plan' | 'data';

/**
 * Artifact definition - describes what a tool outputs
 */
export interface Artifact {
  type: ArtifactType;
  name: string;
  description: string;
}

/**
 * Result returned from tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  // Structured outputs based on tool's artifact definitions
  artifacts?: {
    query?: string;           // Generated Cypher query
    results?: {               // Query execution results
      count: number;
      data?: unknown[];
    };
    text?: string;            // Generated text/response
    plan?: {                  // Planning decision
      tools: string[];
      reasoning: string;
      parameters?: Record<string, Record<string, unknown>>;
    };
    data?: unknown;           // Generic data output
  };
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

/**
 * Tool definition - the heart of the tooling system
 */
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, ToolParameter>;
  // Define what artifacts this tool produces
  outputs?: {
    artifacts: Artifact[];
  };
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

