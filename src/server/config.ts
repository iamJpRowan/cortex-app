import { z } from 'zod';
import type { AppConfig } from '../shared/types/Config.js';
import { DEFAULT_CONFIG } from '../shared/constants/index.js';
import { getDefaultConversationsPath } from './utils/paths.js';

const envSchema = z.object({
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string(),
  VAULT_PATH: z.string(),
  LLM_PROVIDER: z.enum(['local', 'cloud']).default('local'),
  LLM_API_KEY: z.string().optional(),
  LLM_ENDPOINT: z.string().default('http://localhost:11434'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CONVERSATIONS_PATH: z.string().optional(),
});

export function loadConfig(): AppConfig {
  try {
    const env = envSchema.parse(process.env);

  return {
    neo4j: {
      uri: env.NEO4J_URI,
      user: env.NEO4J_USER,
      password: env.NEO4J_PASSWORD,
    },
    vault: {
      path: env.VAULT_PATH,
    },
    llm: {
      provider: env.LLM_PROVIDER,
      apiKey: env.LLM_API_KEY,
      endpoint: env.LLM_ENDPOINT,
      temperature: DEFAULT_CONFIG.llm.temperature,
      maxTokens: DEFAULT_CONFIG.llm.maxTokens,
    },
    logging: {
      level: env.LOG_LEVEL,
      outputPath: DEFAULT_CONFIG.logging.outputPath,
      enableFileLogging: DEFAULT_CONFIG.logging.enableFileLogging,
      enableConsoleLogging: DEFAULT_CONFIG.logging.enableConsoleLogging,
    },
    server: {
      port: DEFAULT_CONFIG.server.port,
    },
    storage: {
      conversationsPath: env.CONVERSATIONS_PATH || getDefaultConversationsPath(),
    },
  };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
        .map((e) => e.path.join('.'));
      
      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(', ')}\n` +
          `Please create a .env file based on env.template`
        );
      }
    }
    throw error;
  }
}

