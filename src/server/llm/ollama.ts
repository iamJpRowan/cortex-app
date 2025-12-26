import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export class OllamaClient {
  private config: AppConfig['llm'];
  private logger: Logger;

  constructor(config: AppConfig['llm'], logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async generate(prompt: string, model: string = 'llama3.1:8b'): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      await this.logger.info('LLM request completed', {
        model,
        duration,
        promptLength: prompt.length,
        responseLength: data.response?.length || 0,
      });

      return {
        content: data.response || '',
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logger.error('LLM request failed', { 
        error: errorMessage, 
        model,
        endpoint: this.config.endpoint 
      });
      throw new Error(`Failed to connect to Ollama at ${this.config.endpoint}: ${errorMessage}. Make sure Ollama is running.`);
    }
  }

  async generateCypher(naturalLanguageQuery: string, schema?: string): Promise<string> {
    const prompt = this.buildCypherPrompt(naturalLanguageQuery, schema);
    const response = await this.generate(prompt);
    return this.extractCypherQuery(response.content);
  }

  async generateResponseFromResults(
    originalQuestion: string,
    queryResults: Record<string, unknown>[],
    cypherQuery?: string
  ): Promise<string> {
    const prompt = this.buildResponsePrompt(originalQuestion, queryResults, cypherQuery);
    const response = await this.generate(prompt);
    return response.content.trim();
  }

  async plan(
    message: string,
    toolDescriptions: string,
    schema?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ tools: string[]; reasoning: string; parameters: Record<string, Record<string, unknown>> }> {
    const prompt = this.buildPlanningPrompt(message, toolDescriptions, schema, conversationHistory);
    const response = await this.generate(prompt);
    return this.parsePlanningResponse(response.content);
  }

  private buildCypherPrompt(query: string, schema?: string): string {
    return `You are a Cypher query generator for Neo4j graph database.

${schema ? `Current graph schema:\n${schema}\n\nIMPORTANT: Only use node labels, relationship types, and properties that exist in the schema above. Do not invent labels or properties that are not listed.` : 'WARNING: No schema information available. Use generic queries and be cautious about label/property names.'}

Convert the following natural language query into a valid Cypher query:
"${query}"

CRITICAL RULES:
- Return ONLY the Cypher query, no explanations, no markdown, no code blocks
- Use proper Neo4j Cypher syntax (version 5.x)
- Always include a RETURN clause
${schema ? '- Use ONLY the node labels and relationship types from the schema above' : ''}
- Use MATCH to find nodes: MATCH (n:Label) WHERE n.property = 'value' RETURN n
- Use WHERE for filtering: MATCH (n) WHERE n.name CONTAINS 'text' RETURN n
- For "all nodes" queries: MATCH (n) RETURN n LIMIT 100
- For searching by name: MATCH (n) WHERE toLower(n.name) CONTAINS toLower('search') RETURN n
- Always use LIMIT for queries that might return many results
- Test your syntax mentally before returning

Example valid queries:
- "show all nodes": MATCH (n) RETURN n LIMIT 100
- "find person named John": MATCH (n) WHERE toLower(n.name) CONTAINS 'john' RETURN n LIMIT 50
- "all notes": MATCH (n:Note) RETURN n LIMIT 100

Cypher query:`;
  }

  private buildResponsePrompt(
    originalQuestion: string,
    queryResults: Record<string, unknown>[],
    cypherQuery?: string
  ): string {
    const resultsJson = JSON.stringify(queryResults, null, 2);
    const resultCount = queryResults.length;

    return `You are a helpful assistant that explains graph database query results in a conversational, natural way.

The user asked: "${originalQuestion}"

${cypherQuery ? `The query executed was: ${cypherQuery}\n\n` : ''}The query returned ${resultCount} ${resultCount === 1 ? 'result' : 'results'}:

${resultsJson}

Your task:
- Provide a clear, conversational response that answers the user's question
- Summarize the key findings from the results
- If there are many results, provide a summary rather than listing everything
- If there are no results, explain that in a helpful way
- Be concise but informative
- Don't just repeat the JSON - interpret and explain what it means
- Use natural language, not technical jargon unless necessary

Response:`;
  }

  private extractCypherQuery(response: string): string {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```(?:cypher|cypher-query)?\s*\n?/gi, '');
    cleaned = cleaned.replace(/```\s*$/g, '');
    
    // Extract the first line that looks like a Cypher statement
    const lines = cleaned.split('\n');
    const cypherLines: string[] = [];
    let inCypher = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments at the start
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        if (inCypher) break; // End of query
        continue;
      }
      
      // Start collecting if we see a Cypher keyword
      if (trimmed.match(/^\s*(MATCH|CREATE|MERGE|RETURN|CALL|WITH|UNWIND|OPTIONAL)/i)) {
        inCypher = true;
        cypherLines.push(trimmed);
      } else if (inCypher) {
        // Continue collecting until we hit non-Cypher content
        if (trimmed.match(/^\s*(MATCH|CREATE|MERGE|RETURN|CALL|WITH|UNWIND|OPTIONAL|WHERE|SET|DELETE|DETACH|LIMIT|ORDER|SKIP)/i) || 
            trimmed.match(/[;,\s]+$/) || 
            trimmed.includes('(') || 
            trimmed.includes(')')) {
          cypherLines.push(trimmed);
        } else {
          break; // End of Cypher query
        }
      }
    }
    
    if (cypherLines.length > 0) {
      return cypherLines.join(' ').trim();
    }
    
    // Fallback: return cleaned response
    return cleaned.trim();
  }

  private buildPlanningPrompt(
    message: string,
    toolDescriptions: string,
    schema?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const historySection = conversationHistory && conversationHistory.length > 0
      ? `\n\nPrevious conversation:\n${conversationHistory.map((entry) => 
          `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`
        ).join('\n')}`
      : '';

    const schemaSection = schema ? `\n\nGraph schema:\n${schema}` : '';

    return `You are a planning assistant for a graph database chat system. Based on the user's question and available tools, decide what actions to take.

Available tools:
${toolDescriptions}${schemaSection}${historySection}

User question: "${message}"

Your task:
- Analyze the question and available context
- Decide which tool(s) to use
- If the question can be answered from context (previous results or explicit nodes), use answer_from_context
- If you need to search the database, use execute_cypher_query
- You can use multiple tools if needed

Return ONLY valid JSON in this exact format:
{
  "tools": ["tool_name1", "tool_name2"],
  "reasoning": "Brief explanation of why you chose these tools",
  "parameters": {
    "tool_name1": { "param1": "value1" },
    "tool_name2": { "param2": "value2" }
  }
}

Important:
- "tools" must be an array of tool names from the available tools list
- "parameters" must include parameters for each tool you selected
- For execute_cypher_query, you don't need to provide the query in parameters (it will be generated separately)
- For answer_from_context, include "message" parameter with the user's question
- Return ONLY the JSON, no markdown, no explanations

Planning decision:`;
  }

  private parsePlanningResponse(response: string): {
    tools: string[];
    reasoning: string;
    parameters: Record<string, Record<string, unknown>>;
  } {
    // Try to extract JSON from response
    let cleaned = response.trim();
    
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\s*/gi, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    
    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tools: Array.isArray(parsed.tools) ? parsed.tools : [],
          reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
          parameters: typeof parsed.parameters === 'object' && parsed.parameters !== null
            ? parsed.parameters as Record<string, Record<string, unknown>>
            : {},
        };
      } catch (error) {
        // Fall through to default
      }
    }
    
    // Fallback: try to infer from response text
    const tools: string[] = [];
    if (cleaned.toLowerCase().includes('execute_cypher_query') || cleaned.toLowerCase().includes('query')) {
      tools.push('execute_cypher_query');
    }
    if (cleaned.toLowerCase().includes('answer_from_context') || cleaned.toLowerCase().includes('context')) {
      tools.push('answer_from_context');
    }
    
    return {
      tools: tools.length > 0 ? tools : ['execute_cypher_query'], // Default fallback
      reasoning: cleaned.substring(0, 200),
      parameters: {},
    };
  }
}

