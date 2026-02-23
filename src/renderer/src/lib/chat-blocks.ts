/**
 * Single block builder: turns TurnBlock[] (from stream or reload) into display items.
 * Used by ChatView for "message, tool, message, tool" rendering. All grouping logic
 * (consecutive reasoning, tool_call+tool_result pairs) lives here.
 */
import type { TraceEntry, TurnBlock } from '@shared/types'

export interface GroupedToolExecution {
  toolName: string
  toolCallId?: string
  displayName?: string
  icon?: string
  args?: Record<string, unknown>
  result?: string
  duration?: number
  error?: string
  isComplete: boolean
}

export type OrderedTraceItem =
  | { kind: 'reasoning'; content: string; duration?: number }
  | { kind: 'tool'; execution: GroupedToolExecution }

export type DisplayItem =
  | { kind: 'text'; text: string }
  | { kind: 'traceGroup'; entries: TraceEntry[]; groupKey: string }

/**
 * Build display items from turn blocks. Groups consecutive reasoning into one
 * "Thinking" row and pairs tool_call with tool_result so one tool execution
 * renders as one row. Expects blocks in streaming order (tool_call immediately
 * followed by its tool_result); use interleaveToolCallsWithResults on reload.
 */
export function buildDisplayItems(blocks: TurnBlock[]): DisplayItem[] {
  const items: DisplayItem[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === 'text') {
      items.push({ kind: 'text', text: block.text })
      i++
      continue
    }
    const entry = block.entry
    if (entry.type === 'reasoning') {
      const group: TraceEntry[] = [entry]
      let j = i + 1
      while (j < blocks.length) {
        const b = blocks[j]
        if (b.type !== 'trace' || b.entry.type !== 'reasoning') break
        group.push(b.entry)
        j++
      }
      items.push({
        kind: 'traceGroup',
        entries: group,
        groupKey: `r-${entry.timestamp ?? i}`,
      })
      i = j
      continue
    }
    if (entry.type === 'tool_call') {
      let j = i + 1
      const textBetween: string[] = []
      while (j < blocks.length) {
        const b = blocks[j]
        if (b.type !== 'text') break
        textBetween.push(b.text)
        j++
      }
      const nextBlock = j < blocks.length ? blocks[j] : null
      const resultEntry =
        nextBlock?.type === 'trace' && nextBlock.entry.type === 'tool_result'
          ? nextBlock.entry
          : null
      const matches =
        resultEntry &&
        (resultEntry.toolCallId === entry.toolCallId ||
          resultEntry.toolName === entry.toolName)
      const group: TraceEntry[] = matches ? [entry, resultEntry] : [entry]
      const groupKey = entry.toolCallId ?? `tool-${entry.timestamp ?? i}`
      items.push({ kind: 'traceGroup', entries: group, groupKey })
      for (const text of textBetween) {
        items.push({ kind: 'text', text })
      }
      i = matches ? j + 1 : i + 1
      continue
    }
    if (entry.type === 'tool_result') {
      items.push({
        kind: 'traceGroup',
        entries: [entry],
        groupKey: `result-${entry.toolCallId ?? entry.timestamp ?? i}`,
      })
      i++
    }
  }
  return items
}

/**
 * Build ordered trace items (reasoning + tool steps) for legacy TraceDisplay.
 * Merges consecutive reasoning; pairs tool_call with tool_result by id/name.
 */
export function buildOrderedTraceItems(trace: TraceEntry[]): OrderedTraceItem[] {
  const ordered: OrderedTraceItem[] = []
  const pendingById = new Map<string, GroupedToolExecution>()
  const pendingByName = new Map<string, GroupedToolExecution[]>()

  for (const entry of trace) {
    if (entry.type === 'reasoning' && entry.content?.trim()) {
      const content = entry.content.trim()
      const last = ordered[ordered.length - 1]
      if (last?.kind === 'reasoning') {
        last.content = content
        last.duration = entry.duration
      } else {
        ordered.push({ kind: 'reasoning', content, duration: entry.duration })
      }
    } else if (entry.type === 'tool_call' && entry.toolName) {
      const group: GroupedToolExecution = {
        toolName: entry.toolName,
        toolCallId: entry.toolCallId,
        displayName: entry.displayName,
        icon: entry.icon,
        args: entry.args,
        isComplete: false,
      }
      ordered.push({ kind: 'tool', execution: group })
      if (entry.toolCallId) {
        pendingById.set(entry.toolCallId, group)
      } else {
        if (!pendingByName.has(entry.toolName)) {
          pendingByName.set(entry.toolName, [])
        }
        pendingByName.get(entry.toolName)!.push(group)
      }
    } else if (entry.type === 'tool_result') {
      let group: GroupedToolExecution | undefined
      if (entry.toolCallId && pendingById.has(entry.toolCallId)) {
        group = pendingById.get(entry.toolCallId)!
        pendingById.delete(entry.toolCallId)
      } else if (entry.toolName) {
        const pending = pendingByName.get(entry.toolName)
        if (pending?.length) group = pending.shift()!
      }
      if (group) {
        group.result = entry.result
        group.duration = entry.duration
        group.error = entry.error
        group.isComplete = true
      } else {
        ordered.push({
          kind: 'tool',
          execution: {
            toolName: entry.toolName || 'unknown',
            toolCallId: entry.toolCallId,
            displayName: entry.displayName,
            icon: entry.icon,
            result: entry.result,
            duration: entry.duration,
            error: entry.error,
            isComplete: true,
          },
        })
      }
    }
  }

  return ordered
}

/** ToolInvocation status from execution state (for TraceDisplay). */
export function getToolStatus(
  execution: GroupedToolExecution,
  isStreaming?: boolean
): 'calling' | 'complete' | 'error' {
  if (execution.error) return 'error'
  if (execution.isComplete) return 'complete'
  if (isStreaming) return 'calling'
  return 'complete'
}

/** Format duration in ms for step row (e.g. 1200 -> "1.2s"). */
export function formatStepDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

/** Build copyable text for a tool step (args + result/error). */
export function formatToolStepForCopy(exec: GroupedToolExecution): string {
  const parts: string[] = []
  if (exec.args && Object.keys(exec.args).length > 0) {
    parts.push('Arguments:\n' + JSON.stringify(exec.args, null, 2))
  }
  if (exec.result && !exec.error) {
    parts.push('Result:\n' + exec.result)
  }
  if (exec.error) {
    parts.push('Error:\n' + exec.error)
  }
  return parts.join('\n\n')
}
