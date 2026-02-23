/**
 * Shared utilities for chat turn blocks.
 * Ensures streaming and reload produce the same block order so a single
 * display builder (renderer) can consume them.
 */
import type { TurnBlock, TraceEntry } from '../types/llm'

/**
 * Reorder turn blocks so each tool_call is immediately followed by its
 * matching tool_result (by toolCallId). Used when loading from checkpoint,
 * where messages are ordered as: AI (reasoning, text, tool_calls), Tool, Tool, ...
 * so we get tool_call, tool_call, tool_result, tool_result. The display
 * builder expects streaming order: tool_call, tool_result, tool_call, tool_result.
 */
export function interleaveToolCallsWithResults(blocks: TurnBlock[]): TurnBlock[] {
  const result: TurnBlock[] = []
  const toolCalls: TraceEntry[] = []
  const toolResults: TraceEntry[] = []

  for (const block of blocks) {
    if (block.type === 'text') {
      // Flush any pending tool_call+result pairs so text appears after them
      flushToolPairs(toolCalls, toolResults, result)
      result.push(block)
    } else if (block.entry.type === 'tool_call') {
      toolCalls.push(block.entry)
    } else if (block.entry.type === 'tool_result') {
      toolResults.push(block.entry)
    } else {
      // reasoning or other trace
      flushToolPairs(toolCalls, toolResults, result)
      result.push(block)
    }
  }
  flushToolPairs(toolCalls, toolResults, result)
  return result
}

function flushToolPairs(
  toolCalls: TraceEntry[],
  toolResults: TraceEntry[],
  out: TurnBlock[]
): void {
  while (toolCalls.length > 0) {
    const call = toolCalls.shift()!
    out.push({ type: 'trace', entry: call })
    const idx = toolResults.findIndex(
      r => r.toolCallId === call.toolCallId || r.toolName === call.toolName
    )
    if (idx !== -1) {
      const result = toolResults.splice(idx, 1)[0]
      out.push({ type: 'trace', entry: result })
    }
  }
  // Orphan results (no matching call) go at the end
  for (const result of toolResults.splice(0)) {
    out.push({ type: 'trace', entry: result })
  }
}
