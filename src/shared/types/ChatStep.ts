/**
 * Structured outputs from a step
 */
export interface StepOutputs {
  query?: string;           // Generated Cypher query (output)
  results?: {               // Query execution results (output)
    count: number;
    data?: unknown[];
  };
  text?: string;            // Generated text/response (output)
  plan?: {                  // Planning decision (output)
    tools: string[];
    reasoning: string;
    parameters?: Record<string, Record<string, unknown>>;
  };
  data?: unknown;           // Generic data output
}

export interface ChatStep {
  id: string; // Dynamic step ID (e.g., 'planning', 'tool:execute_cypher_query', 'response')
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  duration?: number;
  error?: string;
  // Structured outputs - what this step produced
  outputs?: StepOutputs;
}

