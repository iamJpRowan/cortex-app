import { getDriver } from '@main/services/neo4j'
import type { ToolHandlers } from '@main/services/llm/tools/factory'

const MAX_ROWS_RETURNED = 100

/**
 * Convert a Neo4j record value to a JSON-serializable value.
 * Handles Integer, Node, Relationship, and other driver types.
 */
function valueToJson(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber()
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    const obj = value as Record<string, unknown>
    if ('labels' in obj && 'properties' in obj && 'identity' in obj) {
      return {
        _type: 'Node',
        labels: obj.labels,
        properties: obj.properties,
        identity:
          (obj as { identity: { toNumber?: () => number } }).identity?.toNumber?.() ??
          obj.identity,
      }
    }
    if ('type' in obj && 'properties' in obj && 'startNodeElementId' in obj) {
      return {
        _type: 'Relationship',
        type: obj.type,
        properties: obj.properties,
        startNodeElementId: obj.startNodeElementId,
        endNodeElementId: obj.endNodeElementId,
      }
    }
  }
  if (Array.isArray(value)) return value.map(valueToJson)
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = valueToJson(v)
    return out
  }
  return value
}

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

  async neo4j_runCypher(input: unknown): Promise<string> {
    const { query } = input as { query: string }
    try {
      console.log('[Neo4j runCypher] Executing query...')

      const driver = getDriver()
      const session = driver.session()

      try {
        const result = await session.run(query)
        const keys = result.records[0]?.keys ?? []
        const rows = result.records.slice(0, MAX_ROWS_RETURNED).map(record => {
          const row: Record<string, unknown> = {}
          for (const key of keys) row[String(key)] = valueToJson(record.get(key))
          return row
        })
        const total = result.records.length
        const truncated = total > MAX_ROWS_RETURNED

        let updates = ''
        try {
          const summary = result.summary
          const counters = summary?.counters
          if (counters && typeof counters.updates === 'function') {
            const u = counters.updates() as {
              nodesCreated?: number
              nodesDeleted?: number
              relationshipsCreated?: number
              relationshipsDeleted?: number
            }
            const nCreate = u.nodesCreated ?? 0
            const nDelete = u.nodesDeleted ?? 0
            const rCreate = u.relationshipsCreated ?? 0
            const rDelete = u.relationshipsDeleted ?? 0
            if (nCreate + nDelete + rCreate + rDelete > 0) {
              updates = ` ${nCreate} nodes created, ${nDelete} deleted; ${rCreate} relationships created, ${rDelete} deleted.`
            }
          }
        } catch {
          // Ignore summary/counters API differences
        }

        let message = `Query returned ${total} row(s).`
        if (truncated) message += ` Showing first ${MAX_ROWS_RETURNED} rows.`
        message += updates
        message += `\n\nRows:\n${JSON.stringify(rows, null, 2)}`
        return message
      } finally {
        await session.close()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Neo4j runCypher] Error: ${errorMessage}`)
      throw new Error(`Cypher execution failed: ${errorMessage}`)
    }
  },
}
