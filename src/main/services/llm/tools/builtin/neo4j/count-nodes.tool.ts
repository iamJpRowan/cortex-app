import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { getDriver } from '../../../../neo4j'

/**
 * Neo4j count-nodes tool
 * Counts the total number of nodes in the Neo4j database
 * Used to verify Neo4j integration and provide graph statistics
 */
export const countNodesTool = new DynamicStructuredTool({
  name: 'count_nodes',
  description:
    'Counts the total number of nodes in the Neo4j graph database. Useful for getting graph statistics or verifying database connectivity.',
  schema: z.object({
    // No parameters needed for simple count
  }),
  func: async () => {
    try {
      console.log('[CountNodesTool] Executing count query...')

      const driver = getDriver()
      const session = driver.session()

      try {
        const result = await session.run('MATCH (n) RETURN count(n) as count')
        const count = result.records[0]?.get('count')?.toNumber() ?? 0

        console.log(`[CountNodesTool] Found ${count} node(s)`)
        return `The Neo4j database contains ${count} node(s).`
      } finally {
        await session.close()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[CountNodesTool] Error: ${errorMessage}`)
      throw new Error(`Failed to count nodes: ${errorMessage}`)
    }
  },
})
