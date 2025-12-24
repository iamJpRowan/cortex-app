import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { createNeo4jConnection, closeNeo4jConnection } from './neo4j/connection.js';
import { Logger } from './logging/Logger.js';
import { loadConfig } from './config.js';
import { createWebSocketServer } from './ws-server.js';

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

    // Build executable schema for subscriptions
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Create Express app and HTTP server
    const app = express();
    const httpServer = createServer(app);

    // Create context factory
    const getContext = async () => {
      return {
        logger,
        config,
      };
    };

    // Create WebSocket server for subscriptions (attached to HTTP server)
    const { serverCleanup } = await createWebSocketServer(schema, getContext, httpServer);

    // Create Apollo Server with subscription support
    const server = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose();
              },
            };
          },
        },
      ],
    });

    await server.start();

    // Set up Express middleware
    const middleware = expressMiddleware(server, { context: getContext });
    app.use('/graphql', express.json(), middleware as unknown as express.RequestHandler);

    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen({ port: config.server.port }, resolve);
    });

    const url = `http://localhost:${config.server.port}`;
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

