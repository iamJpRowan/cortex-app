import { getDriver } from '@main/services/neo4j'
import type { ToolHandlers } from '@main/services/llm/tools/factory'

/**
 * Neo4j tool handlers. Keys must match the handler field in neo4j/tools.ts definitions.
 */
export const neo4jHandlers: ToolHandlers = {
  async neo4j_countNodes() {
    try {
      console.log('[Neo4j countNodes] Executing count query...')

      const driver = getDriver()
      const session = driver.session()

      try {
        const result = await session.run('MATCH (n) RETURN count(n) as count')
        const count = result.records[0]?.get('count')?.toNumber() ?? 0

        console.log(`[Neo4j countNodes] Found ${count} node(s)`)
        return `The Neo4j database contains ${count} node(s).`
      } finally {
        await session.close()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Neo4j countNodes] Error: ${errorMessage}`)
      throw new Error(`Failed to count nodes: ${errorMessage}`)
    }
  },
}
