import type { Tool, ToolContext, ToolResult } from './types.js';
import type { ChatStep } from '../../shared/types/ChatStep.js';
import { Logger } from '../logging/Logger.js';
import { pubsub } from '../pubsub.js';

/**
 * Tool executor - handles tool execution and automatic step creation
 */
export class ToolExecutor {
  private logger: Logger;
  private requestId: string;

  constructor(logger: Logger, requestId: string) {
    this.logger = logger;
    this.requestId = requestId;
  }

  /**
   * Execute a tool and automatically create steps with proper outputs
   */
  async executeTool(
    tool: Tool,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<{ result: ToolResult; step: ChatStep }> {
    const stepId = `tool:${tool.name}`;
    const stepName = this.getStepName(tool);

    // Create running step
    const runningStep: ChatStep = {
      id: stepId,
      name: stepName,
      status: 'RUNNING',
    };

    this.publishStep(runningStep);

    const startTime = Date.now();

    try {
      // Execute the tool
      const result = await tool.execute(params, context);

      const duration = (Date.now() - startTime) / 1000;

      if (result.success) {
        // Create completed step with structured outputs
        const completedStep: ChatStep = {
          id: stepId,
          name: stepName,
          status: 'COMPLETED',
          duration,
          outputs: this.mapArtifactsToOutputs(result.artifacts),
        };

        this.publishStep(completedStep);

        await this.logger.info('Tool executed successfully', {
          tool: tool.name,
          duration,
          requestId: this.requestId,
        });

        return { result, step: completedStep };
      } else {
        // Create error step
        const errorStep: ChatStep = {
          id: stepId,
          name: stepName,
          status: 'ERROR',
          duration,
          error: result.error,
        };

        this.publishStep(errorStep);

        await this.logger.error('Tool execution failed', {
          tool: tool.name,
          error: result.error,
          requestId: this.requestId,
        });

        return { result, step: errorStep };
      }
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStep: ChatStep = {
        id: stepId,
        name: stepName,
        status: 'ERROR',
        duration,
        error: errorMessage,
      };

      this.publishStep(errorStep);

      await this.logger.error('Tool execution threw error', {
        tool: tool.name,
        error: errorMessage,
        requestId: this.requestId,
      });

      return {
        result: { success: false, error: errorMessage },
        step: errorStep,
      };
    }
  }

  /**
   * Map tool artifacts to step outputs
   */
  private mapArtifactsToOutputs(artifacts?: ToolResult['artifacts']): ChatStep['outputs'] {
    if (!artifacts) return undefined;

    return {
      query: artifacts.query,
      results: artifacts.results,
      text: artifacts.text,
      plan: artifacts.plan,
      data: artifacts.data,
    };
  }

  /**
   * Get human-readable step name from tool
   */
  private getStepName(tool: Tool): string {
    // Use tool name to generate step name
    const nameMap: Record<string, string> = {
      execute_cypher_query: 'Executing query',
      answer_from_context: 'Answering from context',
    };

    return nameMap[tool.name] || tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Publish step update via pubsub
   */
  private publishStep(step: ChatStep): void {
    pubsub.publish(`step:${this.requestId}`, {
      requestId: this.requestId,
      step,
    });
  }
}

