import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { createNeo4jConnection, closeNeo4jConnection } from './neo4j/connection.js';
import { Logger } from './logging/Logger.js';
import { loadConfig } from './config.js';

async function startServer() {
  let config;
  let logger;
  
  try {
    config = loadConfig();
    logger = new Logger(config.logging);
  } catch (error) {
    console.error('Failed to load configuration:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  try {
    // Initialize Neo4j connection (non-blocking - server will start even if this fails)
    try {
      await createNeo4jConnection(config.neo4j, logger);
      await logger.info('Neo4j connection established');
    } catch (error) {
      await logger.warn('Neo4j connection failed, server will start but queries may fail', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    const { url } = await startStandaloneServer(server, {
      listen: { port: config.server.port },
      context: async () => {
        return {
          logger,
          config,
        };
      },
    });

    await logger.info(`🚀 Server ready at ${url}`);
    console.log(`🚀 Server ready at ${url}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (logger) {
      await logger.error('Failed to start server', { error: errorMessage, stack: errorStack });
    } else {
      console.error('Failed to start server:', errorMessage);
      if (errorStack) console.error(errorStack);
    }
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await logger.info('Shutting down server...');
    await closeNeo4jConnection();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await logger.info('Shutting down server...');
    await closeNeo4jConnection();
    process.exit(0);
  });
}

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Fatal error:', message);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

