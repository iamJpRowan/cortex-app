import { getNeo4jDriver } from '../neo4j/connection.js';
import { introspectSchema, formatSchemaForPrompt } from '../neo4j/schema.js';
import { createLLMClient } from '../llm/index.js';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';
import { pubsub } from '../pubsub.js';
import type { ChatStep } from '../../shared/types/ChatStep.js';

export interface Context {
  logger: Logger;
  config: AppConfig;
}

export async function sendMessage(
  _parent: unknown,
  args: { message: string; requestId?: string },
  context: Context
): Promise<{ 
  response: string; 
  cypherQuery?: string;
  requestId: string;
  steps: ChatStep[];
  resultCount?: number;
}> {
  const { logger, config } = context;
  const { message, requestId: providedRequestId } = args;
  const requestId = providedRequestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const steps: ChatStep[] = [];

  await logger.info('Chat message received', { message, requestId });

  try {
    let driver;
    try {
      driver = getNeo4jDriver();
    } catch (error) {
      await logger.error('Neo4j not connected', { error });
      return {
        response: 'Error: Neo4j database is not connected. Please ensure Neo4j is running and the connection settings in .env are correct.',
        cypherQuery: undefined,
        requestId,
        steps: [
          {
            id: 'step_1',
            name: 'Generating query',
            status: 'ERROR',
            error: 'Neo4j not connected',
          },
        ],
      };
    }

    const llmClient = createLLMClient(config.llm, logger);
    const session = driver.session();

    try {
      // Step 1: Generate Cypher query
      const step1Start = Date.now();
      const step1: ChatStep = {
        id: 'step_1',
        name: 'Generating query',
        status: 'RUNNING',
      };
      steps.push(step1);
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: step1,
      });

      const schema = await introspectSchema(driver, logger);
      const schemaString = formatSchemaForPrompt(schema);
      
      await logger.debug('Using schema for query generation', {
        nodeLabelCount: schema.nodeLabels.length,
        relationshipTypeCount: schema.relationshipTypes.length,
      });

      const cypherQuery = await llmClient.generateCypher(message, schemaString);
      const step1Duration = (Date.now() - step1Start) / 1000;
      
      await logger.info('Generated Cypher query', { cypherQuery });

      if (!cypherQuery || cypherQuery.trim().length === 0) {
        throw new Error('Generated query is empty');
      }
      
      if (!cypherQuery.match(/^\s*(MATCH|CREATE|MERGE|RETURN|CALL)/i)) {
        await logger.warn('Generated query may not be valid Cypher', { cypherQuery: String(cypherQuery) });
      }

      const step1Completed: ChatStep = {
        id: 'step_1',
        name: 'Generating query',
        status: 'COMPLETED',
        duration: step1Duration,
        cypherQuery,
      };
      steps[0] = step1Completed;
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: step1Completed,
      });

      // Step 2: Execute query
      const step2Start = Date.now();
      const step2: ChatStep = {
        id: 'step_2',
        name: 'Searching database',
        status: 'RUNNING',
        cypherQuery,
      };
      steps.push(step2);
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: step2,
      });

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

      const step2Duration = (Date.now() - step2Start) / 1000;
      await logger.info('Query executed', { recordCount: records.length });

      const step2Completed: ChatStep = {
        id: 'step_2',
        name: 'Searching database',
        status: 'COMPLETED',
        duration: step2Duration,
        cypherQuery,
        resultCount: records.length,
      };
      steps[1] = step2Completed;
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: step2Completed,
      });

      // Step 3: Generate conversational response
      const step3Start = Date.now();
      const step3: ChatStep = {
        id: 'step_3',
        name: 'Generating response',
        status: 'RUNNING',
      };
      steps.push(step3);
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: step3,
      });

      let response: string;
      try {
        response = await llmClient.generateResponseFromResults(message, records, cypherQuery);
        const step3Duration = (Date.now() - step3Start) / 1000;
        await logger.info('Generated conversational response');

        const step3Completed: ChatStep = {
          id: 'step_3',
          name: 'Generating response',
          status: 'COMPLETED',
          duration: step3Duration,
        };
        steps[2] = step3Completed;
        
        // Emit step update
        pubsub.publish(`step:${requestId}`, {
          requestId,
          step: step3Completed,
        });
      } catch (llmError) {
        const step3Duration = (Date.now() - step3Start) / 1000;
        await logger.warn('LLM response generation failed, using fallback', { error: llmError });
        response = formatQueryResponse(records);

        const step3Completed: ChatStep = {
          id: 'step_3',
          name: 'Generating response',
          status: 'COMPLETED',
          duration: step3Duration,
        };
        steps[2] = step3Completed;
        
        // Emit step update
        pubsub.publish(`step:${requestId}`, {
          requestId,
          step: step3Completed,
        });
      }

      return {
        response,
        cypherQuery,
        requestId,
        steps,
        resultCount: records.length,
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    await logger.error('Error processing chat message', { error, message, requestId });
    
    // Mark current step as error if we have steps
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      if (lastStep && lastStep.status === 'RUNNING') {
        lastStep.status = 'ERROR';
        lastStep.error = errorMessage;
      }
    }
    
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
          requestId,
          steps: steps.length > 0 ? steps : [
            {
              id: 'step_1',
              name: 'Generating query',
              status: 'ERROR',
              error: errorMessage,
            },
          ],
        };
      }
      
      if (neo4jError.code?.startsWith('Neo.ClientError')) {
        return {
          response: `Database error: ${neo4jError.message || neo4jError.code}\n\n` +
                   `This might indicate an issue with the query or database connection.`,
          cypherQuery: undefined,
          requestId,
          steps: steps.length > 0 ? steps : [
            {
              id: 'step_2',
              name: 'Searching database',
              status: 'ERROR',
              error: errorMessage,
            },
          ],
        };
      }
    }
    
    // Handle LLM/network errors
    if (errorMessage.includes('Ollama') || errorMessage.includes('fetch')) {
      return {
        response: `Unable to connect to the AI service. Please ensure Ollama is running at ${config.llm.endpoint}`,
        cypherQuery: undefined,
        requestId,
        steps: steps.length > 0 ? steps : [
          {
            id: 'step_1',
            name: 'Generating query',
            status: 'ERROR',
            error: errorMessage,
          },
        ],
      };
    }
    
    // Generic error fallback
    return {
      response: `I encountered an error processing your request: ${errorMessage}\n\n` +
               `Please try rephrasing your question or check the server logs for more details.`,
      cypherQuery: undefined,
      requestId,
      steps: steps.length > 0 ? steps : [
        {
          id: 'step_1',
          name: 'Processing',
          status: 'ERROR',
          error: errorMessage,
        },
      ],
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

