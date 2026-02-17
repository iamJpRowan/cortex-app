import { z } from 'zod'
import type { ToolDefinition } from '@main/services/llm/tools/definition-types'

/**
 * Neo4j tool definitions (data only; no LangChain or registry imports).
 * Handlers are in handlers.ts and bound at registration.
 */

const countNodesSchema = z.object({
  // No parameters needed for simple count
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
    },
  },
]
