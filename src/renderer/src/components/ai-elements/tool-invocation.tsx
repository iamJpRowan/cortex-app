import * as React from 'react'
import { cn } from '@/lib/utils'

/** Max chars to render for result/error to avoid UI freezes from huge strings. */
const MAX_DISPLAY_LENGTH = 4096

/** Chars to show initially; rest behind "Show more" to keep first paint light. */
const INITIAL_RESULT_PREVIEW_LENGTH = 1024

function truncateForDisplay(s: string): string {
  if (s.length <= MAX_DISPLAY_LENGTH) return s
  return s.slice(0, MAX_DISPLAY_LENGTH) + '\n\n… (truncated)'
}

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
 * Long results are collapsed initially (first N chars + "Show more") to avoid UI freezes.
 */
export const ToolInvocationDetails = React.memo(function ToolInvocationDetails({
  args,
  result,
  error,
  className,
}: ToolInvocationDetailsProps) {
  const [resultExpanded, setResultExpanded] = React.useState(false)
  const hasContent = (args && Object.keys(args).length > 0) || result || error
  if (!hasContent) return null

  const truncatedResult = result ? truncateForDisplay(result) : ''
  const resultIsLong = truncatedResult.length > INITIAL_RESULT_PREVIEW_LENGTH
  const resultPreview =
    resultIsLong && !resultExpanded
      ? truncatedResult.slice(0, INITIAL_RESULT_PREVIEW_LENGTH) + '\n\n…'
      : truncatedResult
  const resultHiddenChars =
    resultIsLong && !resultExpanded
      ? truncatedResult.length - INITIAL_RESULT_PREVIEW_LENGTH
      : 0

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
            {resultPreview}
            {resultHiddenChars > 0 && (
              <button
                type="button"
                onClick={() => setResultExpanded(true)}
                className="
                  mt-1 text-xs text-primary
                  hover:underline
                  focus:outline-none focus:underline
                "
              >
                Show more ({resultHiddenChars.toLocaleString()} more chars)
              </button>
            )}
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
            {truncateForDisplay(error)}
          </div>
        </div>
      )}
    </div>
  )
})

ToolInvocationDetails.displayName = 'ToolInvocationDetails'
