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
} as const;

