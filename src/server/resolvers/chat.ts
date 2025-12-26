import { getNeo4jDriver } from '../neo4j/connection.js';
import { introspectSchema, formatSchemaForPrompt } from '../neo4j/schema.js';
import { createLLMClient } from '../llm/index.js';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';
import { pubsub } from '../pubsub.js';
import type { ChatStep } from '../../shared/types/ChatStep.js';
import { toolRegistry } from '../tools/index.js';
import { ToolExecutor } from '../tools/executor.js';

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
  requestId: string;
  steps: ChatStep[];
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
        requestId,
        steps: [
          {
            id: 'error',
            name: 'Error',
            status: 'ERROR',
            error: 'Neo4j not connected',
          },
        ],
      };
    }

    const llmClient = createLLMClient(config.llm, logger);
    const session = driver.session();

    try {
      // Step 1: Planning - decide what tools to use
      const planningStart = Date.now();
      const planningStep: ChatStep = {
        id: 'planning',
        name: 'Planning',
        status: 'RUNNING',
      };
      steps.push(planningStep);
      
      // Emit step update
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: planningStep,
      });

      const schema = await introspectSchema(driver, logger);
      const schemaString = formatSchemaForPrompt(schema);
      const toolDescriptions = toolRegistry.getToolDescriptions();
      
      await logger.debug('Planning with tools and schema', {
        toolCount: toolRegistry.getAll().length,
        nodeLabelCount: schema.nodeLabels.length,
      });

      // Get planning decision
      const plan = await llmClient.plan(message, toolDescriptions, schemaString);
      const planningDuration = (Date.now() - planningStart) / 1000;
      
      await logger.info('Planning completed', {
        tools: plan.tools,
        reasoning: plan.reasoning,
        requestId,
      });

      const planningCompleted: ChatStep = {
        id: 'planning',
        name: 'Planning',
        status: 'COMPLETED',
        duration: planningDuration,
        outputs: {
          plan: {
            tools: plan.tools,
            reasoning: plan.reasoning,
            parameters: plan.parameters,
          },
        },
      };
      steps[0] = planningCompleted;
      
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: planningCompleted,
      });

      // Validate plan
      const validTools = plan.tools.filter(toolName => toolRegistry.has(toolName));
      if (validTools.length === 0) {
        await logger.warn('No valid tools in plan, defaulting to query', { plan, requestId });
        validTools.push('execute_cypher_query');
      }

      // Step 2: Execute tools based on plan
      const toolExecutor = new ToolExecutor(logger, requestId);
      let cypherQuery: string | undefined;
      let records: Record<string, unknown>[] = [];
      let contextAnswer: string | undefined;

      // Generate query if needed (LLM step, not a tool)
      if (validTools.includes('execute_cypher_query')) {
        const queryStart = Date.now();
        const queryStep: ChatStep = {
          id: 'generate_query',
          name: 'Generating query',
          status: 'RUNNING',
        };
        steps.push(queryStep);
        pubsub.publish(`step:${requestId}`, { requestId, step: queryStep });

        cypherQuery = await llmClient.generateCypher(message, schemaString);
        const queryDuration = (Date.now() - queryStart) / 1000;
        
        await logger.info('Generated Cypher query', { cypherQuery });

        if (!cypherQuery || cypherQuery.trim().length === 0) {
          throw new Error('Generated query is empty');
        }
        
        if (!cypherQuery.match(/^\s*(MATCH|CREATE|MERGE|RETURN|CALL)/i)) {
          await logger.warn('Generated query may not be valid Cypher', { cypherQuery: String(cypherQuery) });
        }

        const queryCompleted: ChatStep = {
          id: 'generate_query',
          name: 'Generating query',
          status: 'COMPLETED',
          duration: queryDuration,
          outputs: {
            query: cypherQuery,
          },
        };
        steps[steps.length - 1] = queryCompleted;
        pubsub.publish(`step:${requestId}`, { requestId, step: queryCompleted });

        // Execute query using tool executor
        const queryTool = toolRegistry.get('execute_cypher_query');
        if (queryTool) {
          const toolContext = {
            logger,
            driver,
            session,
            llmClient,
            requestId,
          };
          const { result, step } = await toolExecutor.executeTool(
            queryTool,
            { query: cypherQuery },
            toolContext
          );
          
          steps.push(step);
          
          if (result.success && result.artifacts?.results) {
            records = (result.artifacts.results.data as Record<string, unknown>[]) || [];
          }
        }
      } else if (validTools.includes('answer_from_context')) {
        // Execute answer_from_context tool
        const contextTool = toolRegistry.get('answer_from_context');
        if (contextTool) {
          const toolContext = {
            logger,
            driver,
            session,
            llmClient,
            requestId,
          };
          const { result, step } = await toolExecutor.executeTool(
            contextTool,
            { message },
            toolContext
          );
          
          steps.push(step);
          
          if (result.success && result.artifacts?.text) {
            contextAnswer = result.artifacts.text;
          }
        }
      }

      // Step 4: Generate conversational response
      const responseStart = Date.now();
      const responseStep: ChatStep = {
        id: 'response',
        name: 'Generating response',
        status: 'RUNNING',
      };
      steps.push(responseStep);
      
      pubsub.publish(`step:${requestId}`, {
        requestId,
        step: responseStep,
      });

      let response: string;
      try {
        if (contextAnswer) {
          // Use answer from context tool
          response = contextAnswer;
        } else {
          // Use standard response generation with query results
          response = await llmClient.generateResponseFromResults(message, records, cypherQuery);
        }
        
        const responseDuration = (Date.now() - responseStart) / 1000;
        await logger.info('Generated conversational response');

        const responseCompleted: ChatStep = {
          id: 'response',
          name: 'Generating response',
          status: 'COMPLETED',
          duration: responseDuration,
          outputs: {
            text: response,
          },
        };
        steps[steps.length - 1] = responseCompleted;
        
        pubsub.publish(`step:${requestId}`, {
          requestId,
          step: responseCompleted,
        });
      } catch (llmError) {
        const responseDuration = (Date.now() - responseStart) / 1000;
        await logger.warn('LLM response generation failed, using fallback', { error: llmError });
        response = formatQueryResponse(records);

        const responseCompleted: ChatStep = {
          id: 'response',
          name: 'Generating response',
          status: 'COMPLETED',
          duration: responseDuration,
          outputs: {
            text: response,
          },
        };
        steps[steps.length - 1] = responseCompleted;
        
        pubsub.publish(`step:${requestId}`, {
          requestId,
          step: responseCompleted,
        });
      }

      return {
        response,
        requestId,
        steps,
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
          requestId,
          steps: steps.length > 0 ? steps : [
            {
              id: 'error',
              name: 'Error',
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
          requestId,
          steps: steps.length > 0 ? steps : [
            {
              id: 'error',
              name: 'Error',
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
        requestId,
        steps: steps.length > 0 ? steps : [
          {
            id: 'error',
            name: 'Error',
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
      requestId,
      steps: steps.length > 0 ? steps : [
        {
          id: 'error',
          name: 'Error',
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

