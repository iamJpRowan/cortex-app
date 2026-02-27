/**
 * HelpView — in-app user documentation.
 * Layout: left sidebar (expandable doc list with H2 section links) and main area
 * (landing with title+summary, or doc content). Breadcrumbs are in MainHeader.
 */

import * as React from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { usePersistedState } from '@/hooks/use-persisted-state'
import { HELP_EXPANDED_KEY, HELP_SCROLL_KEY } from '@/lib/layout-storage'
import { getDoc, userDocSlugs, userDocsManifest } from '@/lib/user-docs'
import { slugify } from '@/lib/utils'
import { cn } from '@/lib/utils'

const H2_LEVEL = 2

const helpExpandedSerialize = (set: Set<string>) => JSON.stringify([...set])
function helpExpandedDeserialize(str: string): Set<string> {
  try {
    const arr = JSON.parse(str)
    const list = Array.isArray(arr) ? arr : []
    return new Set(
      list.filter((s: unknown) => typeof s === 'string' && userDocSlugs.includes(s))
    )
  } catch {
    return new Set()
  }
}

function getHeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getHeadingText).join('')
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode }
    if (props.children != null) return getHeadingText(props.children)
  }
  return ''
}

export function HelpView() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const hash = location.hash.slice(1)
  const doc = slug ? getDoc(slug) : null
  const manifestEntry = slug ? userDocsManifest[slug] : null

  const [expanded, setExpanded] = usePersistedState<Set<string>>(
    HELP_EXPANDED_KEY,
    new Set(),
    { serialize: helpExpandedSerialize, deserialize: helpExpandedDeserialize }
  )
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(null)
  const [scrollSpyPausedUntilId, setScrollSpyPausedUntilId] = React.useState<
    string | null
  >(null)
  const mainAreaRef = React.useRef<HTMLDivElement>(null)
  const prevSlugRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (slug) setExpanded(prev => (prev.has(slug) ? prev : new Set(prev).add(slug)))
    setActiveSectionId(null)
    setScrollSpyPausedUntilId(null)
  }, [slug, setExpanded])

  // Persist scroll of the doc we're leaving; restore only for same doc (else top).
  React.useEffect(() => {
    const container = mainAreaRef.current
    const prevSlug = prevSlugRef.current

    if (prevSlug && container && userDocSlugs.includes(prevSlug)) {
      try {
        localStorage.setItem(
          HELP_SCROLL_KEY,
          JSON.stringify({ slug: prevSlug, scrollTop: container.scrollTop })
        )
      } catch {
        // ignore
      }
    }
    prevSlugRef.current = slug ?? null

    if (!slug || !container) return
    if (hash) return // hash effect will scroll to section

    try {
      const raw = localStorage.getItem(HELP_SCROLL_KEY)
      const stored = raw ? (JSON.parse(raw) as { slug: string; scrollTop: number }) : null
      if (stored?.slug === slug && typeof stored.scrollTop === 'number') {
        container.scrollTop = stored.scrollTop
      } else {
        container.scrollTop = 0
      }
    } catch {
      container.scrollTop = 0
    }
  }, [slug, hash])

  React.useEffect(() => {
    const onScrollToTop = () => {
      mainAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('help-scroll-to-top', onScrollToTop)
    return () => window.removeEventListener('help-scroll-to-top', onScrollToTop)
  }, [])

  React.useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash)
    const container = mainAreaRef.current
    if (el && container) {
      setActiveSectionId(hash)
      setScrollSpyPausedUntilId(hash)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [slug, hash])

  // Scroll spy: highlight the section at the top of the viewport. When
  // scrollSpyPausedUntilId is set (user just clicked a section link), keep that
  // section highlighted until the scroll reaches it, then resume normal spy.
  React.useEffect(() => {
    if (!slug || !manifestEntry) return
    const container = mainAreaRef.current
    if (!container) return
    const h2Ids = manifestEntry.sections
      .filter(sec => sec.level === H2_LEVEL)
      .map(sec => sec.id)
    const ARRIVAL_THRESHOLD = 30

    const TOP_THRESHOLD = 80
    const viewportOffset = 120

    const onScroll = () => {
      const containerTop = container.getBoundingClientRect().top

      if (scrollSpyPausedUntilId) {
        const targetEl = document.getElementById(scrollSpyPausedUntilId)
        if (targetEl) {
          const elTop = targetEl.getBoundingClientRect().top - containerTop
          if (elTop >= -ARRIVAL_THRESHOLD && elTop <= ARRIVAL_THRESHOLD) {
            setScrollSpyPausedUntilId(null)
          }
        }
        return
      }

      // At top of doc: no section active (page name will be highlighted in sidebar).
      if (container.scrollTop < TOP_THRESHOLD) {
        setActiveSectionId(prev => (prev !== null ? null : prev))
        return
      }

      let current: string | null = null
      for (const id of h2Ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const elTop = el.getBoundingClientRect().top - containerTop
        if (elTop <= viewportOffset) current = id
      }
      setActiveSectionId(prev => (prev !== current ? current : prev))
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => container.removeEventListener('scroll', onScroll)
  }, [slug, manifestEntry, scrollSpyPausedUntilId])

  const toggleExpanded = (s: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    h1: ({ children }) => {
      const id = slugify(getHeadingText(children))
      return (
        <h1
          id={id}
          className="text-2xl font-semibold text-text-primary mt-6 mb-2 scroll-mt-4"
        >
          {children}
        </h1>
      )
    },
    h2: ({ children }) => {
      const id = slugify(getHeadingText(children))
      return (
        <h2
          id={id}
          className="text-xl font-semibold text-text-primary mt-6 mb-2 scroll-mt-4"
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => {
      const id = slugify(getHeadingText(children))
      return (
        <h3
          id={id}
          className="text-lg font-medium text-text-primary mt-4 mb-2 scroll-mt-4"
        >
          {children}
        </h3>
      )
    },
    h4: ({ children }) => {
      const id = slugify(getHeadingText(children))
      return (
        <h4
          id={id}
          className="text-base font-medium text-text-primary mt-3 mb-1 scroll-mt-4"
        >
          {children}
        </h4>
      )
    },
    p: ({ children }) => (
      <p className="text-text-primary mb-3 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-text-primary mb-3 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-text-primary mb-3 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-text-primary">{children}</strong>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('http')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link underline"
          >
            {children}
          </a>
        )
      }
      const to = href?.startsWith('#') ? `${location.pathname}${href}` : (href ?? '#')
      return (
        <Link to={to} className="text-link underline">
          {children}
        </Link>
      )
    },
    code: ({ children }) => (
      <code
        className={
          'rounded bg-bg-secondary px-1.5 py-0.5 text-sm font-mono text-text-primary'
        }
      >
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={
          'border-l-2 border-border-primary pl-3 text-text-secondary italic my-2'
        }
      >
        {children}
      </blockquote>
    ),
  }

  return (
    <div className="flex flex-1 min-h-0 bg-bg-primary">
      {/* Help sidebar: expandable doc list, H2 sections only */}
      <div
        className={cn(
          'shrink-0 w-52 flex flex-col overflow-x-hidden overflow-y-auto',
          'border-r border-border-primary bg-bg-primary'
        )}
      >
        <SidebarGroup>
          <SidebarGroupContent className="pr-2 min-w-0">
            <SidebarMenu className="min-w-0">
              {userDocSlugs.map(s => {
                const entry = userDocsManifest[s]
                if (!entry) return null
                const h2Sections = entry.sections.filter(sec => sec.level === H2_LEVEL)
                const isOpen = expanded.has(s)
                const isCurrentPage = slug === s
                return (
                  <Collapsible
                    key={s}
                    open={isOpen}
                    onOpenChange={() => toggleExpanded(s)}
                  >
                    <SidebarMenuItem className="min-w-0 w-full">
                      <div
                        className={cn(
                          'w-full min-w-0 max-w-full rounded-md overflow-hidden',
                          'hover:bg-bg-secondary',
                          isCurrentPage && 'bg-bg-secondary'
                        )}
                      >
                        <div
                          className={
                            'flex min-w-0 w-full items-center gap-0 overflow-hidden ' +
                            'rounded-md'
                          }
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={false}
                            className={cn(
                              'flex-1 min-w-0 rounded-r-none pl-2',
                              'hover:bg-transparent ' + 'active:bg-transparent',
                              'ring-inset',
                              isCurrentPage && activeSectionId == null && 'font-bold'
                            )}
                          >
                            <Link
                              to={`/help/${s}`}
                              onClick={e => {
                                if (isCurrentPage) {
                                  e.preventDefault()
                                  mainAreaRef.current?.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                  })
                                }
                              }}
                            >
                              {entry.title}
                            </Link>
                          </SidebarMenuButton>
                          <CollapsibleTrigger
                            className={
                              'flex h-8 w-7 shrink-0 items-center justify-center rounded-md ' +
                              'text-text-secondary hover:bg-transparent hover:text-text-primary ' +
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                              'focus-visible:ring-inset'
                            }
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CollapsibleTrigger>
                        </div>
                        {h2Sections.length > 0 && (
                          <CollapsibleContent
                            className={cn(
                              'grid grid-cols-[minmax(0,1fr)]',
                              'transition-[grid-template-rows,opacity] duration-200 ' +
                                'ease-out',
                              'data-[state=open]:grid-rows-[1fr] ' +
                                'data-[state=closed]:grid-rows-[0fr]',
                              'data-[state=open]:opacity-100 ' +
                                'data-[state=closed]:opacity-0',
                              'overflow-hidden min-w-0'
                            )}
                          >
                            <div
                              className={
                                'min-h-0 min-w-0 overflow-hidden rounded-b-md pl-4'
                              }
                            >
                              <SidebarMenu
                                className={
                                  'mt-0.5 border-l border-border-primary pl-2 pr-1 min-w-0 ' +
                                  'overflow-hidden [&_[data-sidebar=menu-button]]:hover:bg-transparent'
                                }
                              >
                                {h2Sections.map(sec => {
                                  const isCurrentSection =
                                    isCurrentPage && activeSectionId === sec.id
                                  return (
                                    <SidebarMenuItem key={sec.id}>
                                      <SidebarMenuButton
                                        asChild
                                        isActive={false}
                                        className={cn(
                                          'h-7 text-xs ring-inset',
                                          isCurrentSection && 'font-bold'
                                        )}
                                      >
                                        <Link to={`/help/${s}#${sec.id}`}>
                                          {sec.title}
                                        </Link>
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  )
                                })}
                              </SidebarMenu>
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>

      {/* Main area: landing (title+summary) or doc content */}
      <div ref={mainAreaRef} className="flex-1 min-w-0 overflow-auto bg-bg-primary">
        {!slug ? (
          <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-semibold text-text-primary mb-2">Help</h1>
            <p className="text-text-secondary mb-6">User documentation for Cortex.</p>
            <ul className="space-y-4">
              {userDocSlugs.map(s => {
                const entry = userDocsManifest[s]
                if (!entry) return null
                return (
                  <li key={s}>
                    <Link to={`/help/${s}`} className="text-link underline font-medium">
                      {entry.title}
                    </Link>
                    {entry.summary && (
                      <p className="text-text-secondary text-sm mt-1">{entry.summary}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : !doc || !manifestEntry ? (
          <div className="p-6">
            <p className="text-text-secondary">Doc not found.</p>
            <Link to="/help" className="text-link underline mt-2 inline-block">
              Back to Help
            </Link>
          </div>
        ) : (
          <>
            <article className="p-6 max-w-3xl prose-user-docs">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {doc.body}
              </ReactMarkdown>
            </article>
            {/* Spacer so any heading can be scrolled to the top when content is short */}
            <div className="min-h-[calc(100vh-8rem)]" aria-hidden />
          </>
        )}
      </div>
    </div>
  )
}
