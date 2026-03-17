import * as React from 'react'
import { ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToolInvocationDetails } from '@/components/ai-elements/tool-invocation'
import type { StreamToolApprovalEvent } from '@/types/api'

export interface ToolApprovalCardProps {
  event: StreamToolApprovalEvent
  onApprove: () => void
  onDeny: () => void
}

/**
 * Inline approval card rendered in the message stream when the agent requests
 * permission to invoke an "ask" tool. Shows tool name, description, and args;
 * provides Approve and Deny actions that resolve the pending approval.
 *
 * Follows the TraceDisplay / ToolInvocationDetails visual patterns:
 * icon + label row, args block, action buttons.
 */
export const ToolApprovalCard = React.memo(function ToolApprovalCard({
  event,
  onApprove,
  onDeny,
}: ToolApprovalCardProps) {
  const [clicked, setClicked] = React.useState(false)

  const handleApprove = React.useCallback(() => {
    if (clicked) return
    setClicked(true)
    onApprove()
  }, [clicked, onApprove])

  const handleDeny = React.useCallback(() => {
    if (clicked) return
    setClicked(true)
    onDeny()
  }, [clicked, onDeny])

  return (
    <div
      className="
        mb-2 w-full max-w-none rounded border border-border bg-muted/10
        py-3 pl-3 pr-4
      "
    >
      {/* Header row: icon + tool name */}
      <div className="flex items-center gap-2 text-sm">
        <ShieldQuestion className="size-4 shrink-0 text-warning-500" />
        <span className="font-medium truncate">{event.toolName}</span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          Approval required
        </span>
      </div>

      {/* Tool description */}
      {event.toolDescription && (
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {event.toolDescription}
        </p>
      )}

      {/* Args block — reuses existing pattern */}
      {event.args && Object.keys(event.args).length > 0 && (
        <div className="mt-2">
          <ToolInvocationDetails args={event.args} />
        </div>
      )}

      {/* Approve / Deny actions */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={clicked}
          onClick={handleApprove}
        >
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={clicked}
          onClick={handleDeny}
        >
          Deny
        </Button>
      </div>
    </div>
  )
})

ToolApprovalCard.displayName = 'ToolApprovalCard'
