import { z } from 'zod'
import type { ToolDefinition } from '@main/services/llm/tools/definition-types'

/**
 * Neo4j tool definitions (data only; no LangChain or registry imports).
 * Handlers are in handlers.ts and bound at registration.
 */

const countNodesSchema = z.object({
  // No parameters needed for simple count
})

const runCypherSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'A Cypher query to run (e.g. MATCH (n) RETURN n LIMIT 10, or CREATE, MERGE, etc.). Use parameterized style for values when possible.'
    ),
})

export const neo4jToolDefinitions: ToolDefinition[] = [
  {
    name: 'neo4j_count_nodes',
    description:
      'Counts the total number of nodes in the Neo4j graph database. Useful for getting graph statistics or verifying database connectivity.',
    schema: countNodesSchema,
    handler: 'neo4j_countNodes',
    metadata: {
      scope: 'external',
      access: 'read',
      connectionType: 'Neo4j',
      displayName: 'Count nodes',
      icon: 'calculator',
    },
  },
  {
    name: 'neo4j_run_cypher',
    description:
      'Runs a Cypher query on the Neo4j graph database. Use for read queries (MATCH, RETURN), writes (CREATE, MERGE, DELETE), or schema (CREATE INDEX). Returns result rows as JSON-friendly objects; large result sets are truncated.',
    schema: runCypherSchema,
    handler: 'neo4j_runCypher',
    metadata: {
      scope: 'external',
      access: 'write',
      connectionType: 'Neo4j',
      risk: 'caution',
      permissionExplanation: 'Can read and modify Neo4j data; agent supplies the query.',
      displayName: 'Run Cypher',
      icon: 'network',
    },
  },
]
