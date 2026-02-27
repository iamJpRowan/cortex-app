/**
 * DocTooltip — in-UI link to user docs.
 * Renders an info icon; tooltip shows doc summary and a "Learn more" link
 * to /help/:slug or /help/:slug#sectionId. Use next to settings or labels.
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { getDocSummary } from '@/lib/user-docs'
import { cn } from '@/lib/utils'

export interface DocTooltipProps {
  /** Doc slug (e.g. 'vision', 'getting-started'). */
  docSlug: string
  /** Optional section id for deep link (e.g. 'local-first-architecture'). */
  sectionId?: string
  /** Accessible label for the icon. */
  ariaLabel?: string
  className?: string
}

export function DocTooltip({
  docSlug,
  sectionId,
  ariaLabel = 'Learn more',
  className,
}: DocTooltipProps) {
  const summary = getDocSummary(docSlug)
  const to = sectionId ? `/help/${docSlug}#${sectionId}` : `/help/${docSlug}`

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            className={cn(
              `
                inline-flex text-text-secondary
                hover:text-text-primary
                focus:outline-none
                focus-visible:ring-2 focus-visible:ring-ring
              `,
              className
            )}
            aria-label={ariaLabel}
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {summary ? <p className="mb-1">{summary}</p> : null}
          <span className="text-link underline text-xs">Learn more →</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
