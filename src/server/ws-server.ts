import { WebSocketServer } from 'ws';
import type { GraphQLSchema } from 'graphql';
import type { Server } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Helper to import useServer from graphql-ws
// This bypasses the package.json export restrictions
export async function createWebSocketServer(
  schema: GraphQLSchema,
  getContext: () => Promise<unknown>,
  httpServer: Server
) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // Use file URL to import useServer directly
  const useServerModule = await import(
    `file://${join(__dirname, '../../node_modules/graphql-ws/dist/use/ws.js')}`
  );
  const { useServer } = useServerModule;

  // Create WebSocket server attached to HTTP server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: getContext,
    },
    wsServer
  );

  return { wsServer, serverCleanup };
}

