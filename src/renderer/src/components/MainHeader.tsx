import * as React from 'react'
import { Link } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface BreadcrumbSegment {
  label: string
  to: string | null
  /** When true and to is null, clicking scrolls the help doc to top (dispatches help-scroll-to-top). */
  scrollToTop?: boolean
}

interface MainHeaderProps {
  title?: string
  breadcrumbs?: BreadcrumbSegment[]
  children?: React.ReactNode
}

/**
 * MainHeader Component
 *
 * Thin header frame for the main content area.
 * Contains sidebar toggle, optional title or breadcrumbs (e.g. Help > Doc title), and optional actions.
 */
export function MainHeader({ title, breadcrumbs, children }: MainHeaderProps) {
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
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav
          className="flex items-center gap-1.5 text-sm text-text-primary"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-text-secondary">&gt;</span>}
              {seg.to != null ? (
                <Link
                  to={seg.to}
                  className="
                    font-medium text-link no-underline
                    hover:underline
                  "
                >
                  {seg.label}
                </Link>
              ) : seg.scrollToTop ? (
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('help-scroll-to-top'))
                  }
                  className="
                    font-medium text-link no-underline
                    hover:underline
                    cursor-pointer bg-transparent border-0 p-0
                  "
                >
                  {seg.label}
                </button>
              ) : (
                <span className="font-medium">{seg.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : (
        title && <h1 className="text-sm font-medium text-text-primary">{title}</h1>
      )}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  )
}
