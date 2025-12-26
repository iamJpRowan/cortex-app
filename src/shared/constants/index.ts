export const DEFAULT_CONFIG = {
  logging: {
    level: 'info' as const,
    outputPath: './logs',
    enableFileLogging: true,
    enableConsoleLogging: true,
  },
  llm: {
    temperature: 0.7,
    maxTokens: 2000,
  },
  server: {
    port: 4000,
  },
  storage: {
    // Default path is computed at runtime based on OS
    // This is a fallback that won't be used if config.ts is used
    conversationsPath: './data/conversations',
  },
} as const;

