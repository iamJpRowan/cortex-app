import * as React from 'react'
import { cn } from '@/lib/utils'

export type ToolInvocationStatus = 'calling' | 'complete' | 'error'

export interface ToolInvocationDetailsProps {
  /** Tool arguments */
  args?: Record<string, unknown>
  /** Tool result */
  result?: string
  /** Error message if failed */
  error?: string
  /** Additional class names */
  className?: string
}

/**
 * Renders only the args/result/error block for a tool call.
 * Use inside a step or collapsible when the step row is the primary UI.
 */
export const ToolInvocationDetails = React.memo(function ToolInvocationDetails({
  args,
  result,
  error,
  className,
}: ToolInvocationDetailsProps) {
  const hasContent = (args && Object.keys(args).length > 0) || result || error
  if (!hasContent) return null

  return (
    <div className={cn('space-y-2', className)}>
      {args && Object.keys(args).length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Arguments</div>
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
      {result && !error && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Result</div>
          <div
            className="
              bg-muted rounded px-2 py-1 text-xs whitespace-pre-wrap max-h-48
              overflow-y-auto
            "
          >
            {result}
          </div>
        </div>
      )}
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
  )
})

ToolInvocationDetails.displayName = 'ToolInvocationDetails'
