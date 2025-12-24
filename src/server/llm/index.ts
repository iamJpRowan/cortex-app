import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';
import { OllamaClient, type LLMResponse } from './ollama.js';

export function createLLMClient(config: AppConfig['llm'], logger: Logger): OllamaClient {
  if (config.provider === 'local') {
    return new OllamaClient(config, logger);
  }

  // Future: Add cloud provider support
  throw new Error(`LLM provider "${config.provider}" not yet implemented`);
}

export type { LLMResponse };

