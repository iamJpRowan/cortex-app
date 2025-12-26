import type { Tool, ToolContext, ToolResult } from './types.js';

/**
 * Tool: Execute a Cypher query against the Neo4j database
 */
export const executeCypherQueryTool: Tool = {
  name: 'execute_cypher_query',
  description: 'Execute a Cypher query to search the graph database. Use this when you need to find nodes, relationships, or analyze graph patterns.',
  parameters: {
    query: {
      type: 'string',
      description: 'The Cypher query to execute',
      required: true,
    },
  },
  outputs: {
    artifacts: [
      {
        type: 'results',
        name: 'query_results',
        description: 'The results returned from executing the Cypher query',
      },
    ],
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { logger, session } = context;
    const query = params.query as string;

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Query parameter is required and must be a string',
      };
    }

    try {
      await logger.info('Executing Cypher query tool', { query, requestId: context.requestId });

      const result = await session.run(query);
      const records = result.records.map((record) => {
        const obj: Record<string, unknown> = {};
        record.keys.forEach((key) => {
          if (typeof key === 'string') {
            obj[key] = record.get(key);
          }
        });
        return obj;
      });

      await logger.info('Cypher query tool executed successfully', {
        resultCount: records.length,
        requestId: context.requestId,
      });

      return {
        success: true,
        data: records,
        artifacts: {
          results: {
            count: records.length,
            data: records,
          },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error('Cypher query tool execution failed', {
        error: errorMessage,
        query,
        requestId: context.requestId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

