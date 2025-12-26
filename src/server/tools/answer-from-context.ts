import type { Tool, ToolContext, ToolResult } from './types.js';

/**
 * Tool: Answer the question using only provided context without querying the database
 */
export const answerFromContextTool: Tool = {
  name: 'answer_from_context',
  description: 'Answer the question using only the provided context (explicit nodes or previous query results) without executing a database query. Use this when the context already contains enough information to answer the question.',
  parameters: {
    message: {
      type: 'string',
      description: 'The user\'s question to answer using context',
      required: true,
    },
  },
  outputs: {
    artifacts: [
      {
        type: 'text',
        name: 'answer',
        description: 'The answer generated from context',
      },
    ],
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { logger, llmClient } = context;
    const userMessage = params.message as string | undefined;

    if (!userMessage || typeof userMessage !== 'string') {
      return {
        success: false,
        error: 'Message parameter is required',
      };
    }

    try {
      await logger.info('Answering from context tool', { requestId: context.requestId });

      // Build context summary
      const contextParts: string[] = [];

      // Add explicit context nodes
      if (context.explicitContext?.nodes && context.explicitContext.nodes.length > 0) {
        contextParts.push('Explicit context nodes:');
        context.explicitContext.nodes.forEach((node, idx) => {
          const labels = node.labels?.join(':') || 'Node';
          const props = node.properties ? JSON.stringify(node.properties, null, 2) : '{}';
          contextParts.push(`${idx + 1}. ${labels}: ${props}`);
        });
      }

      // Add previous query results from conversation history
      if (context.conversationHistory) {
        const previousResults = context.conversationHistory
          .filter(entry => entry.results && entry.results.length > 0)
          .map(entry => ({
            question: entry.content,
            results: entry.results,
            query: entry.query,
          }));

        if (previousResults.length > 0) {
          contextParts.push('\nPrevious query results:');
          previousResults.forEach((prev, idx) => {
            contextParts.push(`${idx + 1}. Question: "${prev.question}"`);
            if (prev.query) {
              contextParts.push(`   Query: ${prev.query}`);
            }
            contextParts.push(`   Results: ${JSON.stringify(prev.results, null, 2)}`);
          });
        }
      }

      if (contextParts.length === 0) {
        return {
          success: false,
          error: 'No context available to answer from',
        };
      }

      const contextString = contextParts.join('\n\n');

      // Generate response using context
      const prompt = `You are a helpful assistant. Answer the user's question using ONLY the provided context. Do not make up information or reference things not in the context.

Context:
${contextString}

User question: "${userMessage}"

Provide a clear, conversational answer based on the context above. If the context doesn't contain enough information to fully answer, say so.`;

      const response = await llmClient.generate(prompt);
      const answer = response.content.trim();

      await logger.info('Answer from context tool completed', { requestId: context.requestId });

      return {
        success: true,
        data: { answer },
        artifacts: {
          text: answer,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error('Answer from context tool failed', {
        error: errorMessage,
        requestId: context.requestId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

