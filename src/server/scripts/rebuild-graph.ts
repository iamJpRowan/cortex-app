import 'dotenv/config';
import { loadConfig } from '../config.js';
import { Logger } from '../logging/Logger.js';
import { createNeo4jConnection, closeNeo4jConnection, getNeo4jDriver } from '../neo4j/connection.js';

async function rebuildGraph() {
  const config = loadConfig();
  const logger = new Logger(config.logging);

  try {
    await logger.info('Starting graph rebuild...');
    
    // Initialize Neo4j connection
    await createNeo4jConnection(config.neo4j, logger);
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Clear existing graph (optional - be careful in production!)
      await session.run('MATCH (n) DETACH DELETE n');
      await logger.info('Cleared existing graph');

      // TODO: Add transformation logic here
      // This will be implemented when we add specific entity types
      
      await logger.info('Graph rebuild completed');
    } finally {
      await session.close();
      await closeNeo4jConnection();
    }
  } catch (error) {
    await logger.error('Graph rebuild failed', { error });
    process.exit(1);
  }
}

rebuildGraph();

