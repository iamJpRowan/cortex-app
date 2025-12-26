import neo4j, { Driver } from 'neo4j-driver';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';

let driver: Driver | null = null;

export async function createNeo4jConnection(config: AppConfig['neo4j'], logger: Logger): Promise<Driver> {
  if (driver) {
    return driver;
  }

  try {
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      }
    );

    // Verify connection
    await driver.verifyConnectivity();
    await logger.info('Neo4j connection established', { uri: config.uri });

    return driver;
  } catch (error) {
    await logger.error('Failed to connect to Neo4j', { error, uri: config.uri });
    throw error;
  }
}

export function getNeo4jDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call createNeo4jConnection first.');
  }
  return driver;
}

export async function closeNeo4jConnection(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}



