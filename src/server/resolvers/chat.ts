import { getNeo4jDriver } from '../neo4j/connection.js';
import { createLLMClient } from '../llm/index.js';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';

export interface Context {
  logger: Logger;
  config: AppConfig;
}

export async function sendMessage(
  _parent: unknown,
  args: { message: string },
  context: Context
): Promise<{ response: string; cypherQuery?: string }> {
  const { logger, config } = context;
  const { message } = args;

  await logger.info('Chat message received', { message });

  try {
    let driver;
    try {
      driver = getNeo4jDriver();
    } catch (error) {
      await logger.error('Neo4j not connected', { error });
      return {
        response: 'Error: Neo4j database is not connected. Please ensure Neo4j is running and the connection settings in .env are correct.',
        cypherQuery: undefined,
      };
    }

    const llmClient = createLLMClient(config.llm, logger);
    const session = driver.session();

    try {
      // Generate Cypher query from natural language
      const cypherQuery = await llmClient.generateCypher(message);
      await logger.info('Generated Cypher query', { cypherQuery });

      // Basic validation: ensure query is not empty and looks like Cypher
      if (!cypherQuery || cypherQuery.trim().length === 0) {
        throw new Error('Generated query is empty');
      }
      
      if (!cypherQuery.match(/^\s*(MATCH|CREATE|MERGE|RETURN|CALL)/i)) {
        await logger.warn('Generated query may not be valid Cypher', { cypherQuery: String(cypherQuery) });
      }

      // Execute query
      const result = await session.run(cypherQuery);
      const records = result.records.map((record) => {
        const obj: Record<string, unknown> = {};
        record.keys.forEach((key) => {
          if (typeof key === 'string') {
            obj[key] = record.get(key);
          }
        });
        return obj;
      });

      await logger.info('Query executed', { recordCount: records.length });

      // Format response
      const response = formatQueryResponse(records);

      return {
        response,
        cypherQuery,
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    await logger.error('Error processing chat message', { error, message });
    
    // Handle different error types with user-friendly messages
    if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
      const neo4jError = error as { code: string; message?: string };
      
      if (neo4jError.code === 'Neo.ClientError.Statement.SyntaxError') {
        return {
          response: `I generated an invalid Cypher query. This might be because:\n\n` +
                   `- The query syntax was incorrect\n` +
                   `- The graph structure doesn't match what I expected\n` +
                   `- I misunderstood your question\n\n` +
                   `Please try rephrasing your question or be more specific about what you're looking for.`,
          cypherQuery: undefined,
        };
      }
      
      if (neo4jError.code?.startsWith('Neo.ClientError')) {
        return {
          response: `Database error: ${neo4jError.message || neo4jError.code}\n\n` +
                   `This might indicate an issue with the query or database connection.`,
          cypherQuery: undefined,
        };
      }
    }
    
    // Handle LLM/network errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Ollama') || errorMessage.includes('fetch')) {
      return {
        response: `Unable to connect to the AI service. Please ensure Ollama is running at ${config.llm.endpoint}`,
        cypherQuery: undefined,
      };
    }
    
    // Generic error fallback
    return {
      response: `I encountered an error processing your request: ${errorMessage}\n\n` +
               `Please try rephrasing your question or check the server logs for more details.`,
      cypherQuery: undefined,
    };
  }
}

function formatQueryResponse(records: Record<string, unknown>[]): string {
  if (records.length === 0) {
    return 'No results found for your query.';
  }

  // For large result sets, provide a summary
  if (records.length > 50) {
    return `Found ${records.length} results. Showing first 10:\n\n${JSON.stringify(records.slice(0, 10), null, 2)}\n\n... and ${records.length - 10} more results.`;
  }

  if (records.length === 1) {
    // Try to extract meaningful information from the result
    const result = records[0];
    if (!result) {
      return 'Found 1 result (empty).';
    }
    
    const keys = Object.keys(result);
    
    // If result has a single key with a node/object, try to format it nicely
    if (keys.length === 1) {
      const firstKey = keys[0];
      const firstValue = firstKey ? result[firstKey] : undefined;
      if (firstValue && typeof firstValue === 'object') {
        const node = firstValue as Record<string, unknown>;
        if (node && 'properties' in node && 'labels' in node) {
          const labels = Array.isArray(node.labels) ? (node.labels as string[]).join(':') : '';
          const props = node.properties as Record<string, unknown>;
          return `Found 1 ${labels || 'node'}:\n\n${JSON.stringify(props, null, 2)}`;
        }
      }
    }
    
    return `Found 1 result:\n\n${JSON.stringify(result, null, 2)}`;
  }

  return `Found ${records.length} results:\n\n${JSON.stringify(records, null, 2)}`;
}

