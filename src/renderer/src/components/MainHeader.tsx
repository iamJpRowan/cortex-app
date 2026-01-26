import * as React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface MainHeaderProps {
  title?: string
  children?: React.ReactNode
}

/**
 * MainHeader Component
 *
 * Thin header frame for the main content area.
 * Contains sidebar toggle and optional title/actions.
 */
export function MainHeader({ title, children }: MainHeaderProps) {
  return (
    <header
      className={cn(
        // Layout
        'flex h-10 shrink-0 items-center gap-2',
        // Styling
        'bg-bg-primary rounded-t-lg',
        // Border and padding
        'border-b border-border-primary px-4'
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {title && <h1 className="text-sm font-medium text-text-primary">{title}</h1>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  )
}
