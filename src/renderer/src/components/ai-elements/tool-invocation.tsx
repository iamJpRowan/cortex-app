import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Wrench, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export type ToolInvocationStatus = 'calling' | 'complete' | 'error'

export interface ToolInvocationProps {
  /** Tool name */
  name: string
  /** Tool arguments */
  args?: Record<string, unknown>
  /** Tool result */
  result?: string
  /** Execution duration in milliseconds */
  duration?: number
  /** Error message if failed */
  error?: string
  /** Current status */
  status: ToolInvocationStatus
  /** Whether the collapsible is open by default */
  defaultOpen?: boolean
  /** Additional class names */
  className?: string
}

/**
 * ToolInvocation Component
 *
 * Displays a tool call with its arguments, result, duration, and status.
 * Based on shadcn AI patterns for consistent styling.
 */
export const ToolInvocation = React.memo(function ToolInvocation({
  name,
  args,
  result,
  duration,
  error,
  status,
  defaultOpen = true,
  className,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const statusIcon = {
    calling: <Loader2 className="h-3 w-3 animate-spin" />,
    complete: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-destructive" />,
  }

  const statusLabel = {
    calling: 'Running',
    complete: 'Complete',
    error: 'Error',
  }

  const hasDetails = (args && Object.keys(args).length > 0) || result || error

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn('rounded-lg border border-border bg-muted/30 text-sm', className)}
      >
        {/* Header */}
        <CollapsibleTrigger
          className="
            flex w-full items-center gap-2 px-3 py-2
            hover:bg-muted/50
            transition-colors
          "
          disabled={!hasDetails}
        >
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium flex-1 text-left">{name}</span>
          {duration !== undefined && (
            <span className="text-xs text-muted-foreground">{duration}ms</span>
          )}
          <Badge
            variant={status === 'error' ? 'destructive' : 'secondary'}
            className="gap-1 text-xs"
          >
            {statusIcon[status]}
            {statusLabel[status]}
          </Badge>
          {hasDetails && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </CollapsibleTrigger>

        {/* Content */}
        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t border-border px-3 py-2 space-y-2">
              {/* Arguments */}
              {args && Object.keys(args).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Arguments
                  </div>
                  <div className="bg-muted rounded px-2 py-1 font-mono text-xs">
                    {Object.entries(args).map(([key, value]) => (
                      <div key={key} className="truncate">
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {result && !error && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Result
                  </div>
                  <div className="bg-muted rounded px-2 py-1 text-xs whitespace-pre-wrap">
                    {result}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div>
                  <div className="text-xs font-medium text-destructive mb-1">Error</div>
                  <div
                    className="
                      bg-destructive/10 text-destructive rounded px-2 py-1 text-xs
                      whitespace-pre-wrap
                    "
                  >
                    {error}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
})

ToolInvocation.displayName = 'ToolInvocation'
