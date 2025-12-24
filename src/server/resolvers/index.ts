import { sendMessage } from './chat.js';
import type { Context } from './chat.js';
import { pubsub } from '../pubsub.js';
import type { ChatStep } from '../../shared/types/ChatStep.js';
import { getNeo4jDriver } from '../neo4j/connection.js';
import { introspectSchema } from '../neo4j/schema.js';

async function getGraphSchema(context: Context, forceRefresh = false) {
  const { logger } = context;
  
  try {
    const driver = getNeo4jDriver();
    const schema = await introspectSchema(driver, logger, forceRefresh);
    const session = driver.session();
    
    try {
      // Get counts for each node label
      const labelCounts: Record<string, number> = {};
      for (const label of schema.nodeLabels) {
        try {
          // Use parameterized query to avoid injection issues
          const result = await session.run(
            `MATCH (n:\`${label.replace(/`/g, '``')}\`) RETURN count(n) as count`
          );
          const count = result.records[0]?.get('count') || 0;
          labelCounts[label] = typeof count === 'number' ? count : Number(count);
        } catch (error) {
          await logger.warn(`Failed to get count for label ${label}`, { error });
          labelCounts[label] = 0;
        }
      }
      
      // Get counts for each relationship type
      const relCounts: Record<string, number> = {};
      for (const relType of schema.relationshipTypes) {
        try {
          // Use parameterized query to avoid injection issues
          const result = await session.run(
            `MATCH ()-[r:\`${relType.replace(/`/g, '``')}\`]-() RETURN count(r) as count`
          );
          const count = result.records[0]?.get('count') || 0;
          relCounts[relType] = typeof count === 'number' ? count : Number(count);
        } catch (error) {
          await logger.warn(`Failed to get count for relationship ${relType}`, { error });
          relCounts[relType] = 0;
        }
      }
      
      // Transform schema to match GraphQL types
      return {
        nodeLabels: schema.nodeLabels.map(label => ({
          name: label,
          count: labelCounts[label] || 0,
        })),
        relationshipTypes: schema.relationshipTypes.map(relType => ({
          name: relType,
          count: relCounts[relType] || 0,
        })),
        allProperties: schema.allProperties.map(prop => ({
          name: prop.name,
          type: prop.types.length > 0 ? prop.types.join(' | ') : 'Unknown',
        })),
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    await logger.error('Failed to get graph schema', { error });
    // Return empty schema on error
    return {
      nodeLabels: [],
      relationshipTypes: [],
      allProperties: [],
    };
  }
}

export const resolvers = {
  Query: {
    health: () => 'OK',
    graphSchema: (_parent: unknown, args: { forceRefresh?: boolean }, context: Context) => 
      getGraphSchema(context, args.forceRefresh || false),
  },
  Mutation: {
    sendMessage: (
      _parent: unknown,
      args: { message: string; requestId?: string },
      context: Context
    ) => sendMessage(_parent, args, context),
  },
  Subscription: {
    chatStepUpdates: {
      subscribe: async function* (_parent: unknown, args: { requestId: string }) {
        const topic = `step:${args.requestId}`;
        const asyncIterator = pubsub.asyncIterator<{
          requestId: string;
          step: ChatStep;
        }>(topic);
        
        for await (const payload of asyncIterator) {
          yield {
            chatStepUpdates: payload,
          };
        }
      },
    },
  },
};

