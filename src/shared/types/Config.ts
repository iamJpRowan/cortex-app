export interface AppConfig {
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  vault: {
    path: string;
  };
  llm: {
    provider: 'local' | 'cloud';
    apiKey?: string;
    endpoint: string;
    temperature?: number;
    maxTokens?: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    outputPath: string;
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
  };
  server: {
    port: number;
  };
  storage: {
    conversationsPath: string;
  };
}

