/**
 * Content length guardrails for tool results and agent context.
 * Used by the tool factory (default cap for all tools), Neo4j serialization
 * (per-property cap), and optionally by the agent for IPC truncation.
 *
 * @see docs/product/backlog/bounded-tool-results-and-chat-ui-stability.md
 */

/** Default max length for a single tool result string that goes into conversation state (context). */
export const DEFAULT_MAX_TOOL_RESULT_LENGTH = 32_768

/** Max length for a single string property when serializing structured data (e.g. Neo4j node properties). */
export const MAX_PROPERTY_VALUE_LENGTH = 12_288

/**
 * Cap a tool result string to a maximum length. Appends a truncation suffix when capped.
 * Used by the factory so every tool's return is bounded before it becomes the ToolMessage in the graph.
 */
export function capToolResult(
  result: string,
  maxLength: number = DEFAULT_MAX_TOOL_RESULT_LENGTH
): string {
  if (result.length <= maxLength) return result
  return result.slice(0, maxLength) + '\n\n… (truncated)'
}

/**
 * Cap a string for use in structured serialization (e.g. per-property in Neo4j).
 * Shorter limit than full tool result so individual fields don't dominate.
 */
export function capPropertyValue(
  value: string,
  maxLength: number = MAX_PROPERTY_VALUE_LENGTH
): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength) + '… (truncated)'
}
