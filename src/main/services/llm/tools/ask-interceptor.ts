import { AsyncLocalStorage } from 'node:async_hooks'
import { DynamicStructuredTool, type StructuredTool } from '@langchain/core/tools'
import type { PendingApproval } from '@shared/types'

/**
 * Per-stream context propagated via AsyncLocalStorage.
 * Each queryStream call registers its own context before invoking the executor,
 * so wrapped ask tools find the correct conversationId and callback.
 */
interface StreamContext {
  conversationId: string
  onPendingApproval: (approval: PendingApproval) => void
}

/** Propagates stream context through the async call chain (correct for concurrent streams). */
const streamContextStorage = new AsyncLocalStorage<StreamContext>()

/**
 * In-memory pending approvals: approvalId → { resolve, conversationId }.
 * Not persisted; cleared when the stream ends or the approval is resolved.
 */
const pendingApprovals = new Map<string, { resolve: (approved: boolean) => void; conversationId: string }>()

/**
 * Wrap an ask tool so it pauses for user approval before executing.
 *
 * The returned tool has the same name, description, and schema as the original.
 * Its func:
 *  1. Checks for an active stream context (via AsyncLocalStorage).
 *  2. If present, registers a PendingApproval and awaits the user's response.
 *  3. On approve: calls the original tool and returns the result.
 *  4. On deny: returns a denial string so the LLM can respond gracefully.
 *  5. If no context (edge case / test): calls the original tool directly.
 */
export function wrapAskTool(tool: StructuredTool): StructuredTool {
  const wrappedFunc = async (args: Record<string, unknown>): Promise<string> => {
    const ctx = streamContextStorage.getStore()

    if (!ctx) {
      // No active stream context — should not happen in normal use.
      // Fall through to run the tool without approval.
      console.warn(
        `[AskInterceptor] No stream context for ask tool "${tool.name}"; running without approval.`
      )
      const result = await tool.invoke(args)
      return typeof result === 'string' ? result : JSON.stringify(result)
    }

    const approvalId = crypto.randomUUID()

    const approved = await new Promise<boolean>(resolve => {
      pendingApprovals.set(approvalId, { resolve, conversationId: ctx.conversationId })
      ctx.onPendingApproval({
        approvalId,
        conversationId: ctx.conversationId,
        toolName: tool.name,
        toolDescription: tool.description,
        args,
      })
    })

    if (!approved) {
      return 'Tool use was denied by the user.'
    }

    const result = await tool.invoke(args)
    return typeof result === 'string' ? result : JSON.stringify(result)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = (tool as any).schema

  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema,
    func: wrappedFunc,
  })
}

/**
 * Run `fn` within a stream context.
 * All ask-tool wrappers called inside `fn` (including through awaited async chains)
 * will find this context via AsyncLocalStorage.getStore().
 */
export function runWithStreamContext<T>(
  conversationId: string,
  onPendingApproval: (approval: PendingApproval) => void,
  fn: () => Promise<T>
): Promise<T> {
  return streamContextStorage.run({ conversationId, onPendingApproval }, fn)
}

/**
 * Resolve a pending approval. Called from the IPC handler when the user approves or denies.
 * Returns true if the approval was found and resolved; false if it was not found (already resolved
 * or never created).
 */
export function respondToApproval(approvalId: string, approved: boolean): boolean {
  const entry = pendingApprovals.get(approvalId)
  if (!entry) return false
  pendingApprovals.delete(approvalId)
  entry.resolve(approved)
  return true
}

/**
 * Deny and remove all pending approvals for a conversation.
 * Called in the queryStream finally block to prevent the stream from hanging when it ends
 * (error, cancel, or completion) with an approval still waiting.
 */
export function cancelConversationApprovals(conversationId: string): void {
  for (const [approvalId, entry] of pendingApprovals.entries()) {
    if (entry.conversationId === conversationId) {
      pendingApprovals.delete(approvalId)
      entry.resolve(false)
    }
  }
}
