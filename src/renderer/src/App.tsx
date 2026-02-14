import './main.css'
import * as React from 'react'
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar } from './components/AppSidebar'
import { MainHeader } from './components/MainHeader'
import { HomeView } from './components/HomeView'
import { SettingsView } from './components/SettingsView'
import { ChatView } from './components/ChatView'
import { CommandPalette } from './components/CommandPalette'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { initHotkeys } from '@/lib/hotkeys'
import { usePersistedState } from '@/hooks/use-persisted-state'
import { LAYOUT_SIDEBAR_COLLAPSED_KEY, LAYOUT_LAST_VIEW_KEY } from '@/lib/layout-storage'

const VALID_ROUTES = ['/', '/chat', '/settings'] as const

/**
 * AppContent Component
 *
 * Inner app content with routing
 */
function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState(
    LAYOUT_SIDEBAR_COLLAPSED_KEY,
    false
  )

  // Restore last view on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_LAST_VIEW_KEY)
    if (stored && VALID_ROUTES.includes(stored as (typeof VALID_ROUTES)[number])) {
      const path = stored as (typeof VALID_ROUTES)[number]
      const current = location.pathname === '' ? '/' : location.pathname
      if (path !== current) navigate(path)
    }
  }, [])

  // Persist current view on route change
  React.useEffect(() => {
    const path = location.pathname === '' ? '/' : location.pathname
    if (VALID_ROUTES.includes(path as (typeof VALID_ROUTES)[number])) {
      localStorage.setItem(LAYOUT_LAST_VIEW_KEY, path)
    }
  }, [location.pathname])

  // Initialize hotkeys on mount
  React.useEffect(() => {
    let cleanup: (() => void) | undefined

    initHotkeys({
      openSettings: () => navigate('/settings'),
    }).then(cleanupFn => {
      cleanup = cleanupFn
    })

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [navigate])

  // Get title based on current route
  const getTitle = () => {
    if (location.pathname === '/settings') return 'Settings'
    if (location.pathname === '/chat') return 'Chat'
    return 'Cortex'
  }

  return (
    <SidebarProvider
      defaultOpen={!sidebarCollapsed}
      open={!sidebarCollapsed}
      onOpenChange={open => setSidebarCollapsed(!open)}
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-icon': '3rem',
        } as React.CSSProperties
      }
      className="bg-bg-secondary rounded-lg"
    >
      <AppSidebar />
      {/* Outer container wrapping main content - draggable for window movement */}
      <div
        className={cn(
          // Layout - flex-1 fills remaining space, min-h-0 allows shrinking
          'flex flex-1 flex-col min-h-0',
          // Styling
          'bg-bg-secondary rounded-tr-lg rounded-br-lg',
          // Spacing and overflow
          'p-3 overflow-hidden',
          'peer-data-[state=collapsed]:pl-0'
        )}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Main content area - inset with padding creating frame effect */}
        <SidebarInset
          className={cn(
            // Layout - flex-1 fills space, min-h-0 critical for nested flex
            'flex flex-col flex-1 min-h-0',
            // Styling
            'bg-bg-primary rounded-lg',
            // Border and overflow
            'border border-border-primary overflow-hidden'
          )}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <MainHeader title={getTitle()} />
          {/* Content area - flex-1 to fill remaining space */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <Routes>
              <Route
                path="/"
                element={
                  <div className="flex-1 overflow-auto p-4">
                    <div className="flex flex-col gap-4">
                      <HomeView />
                    </div>
                  </div>
                }
              />
              <Route path="/chat" element={<ChatView />} />
              <Route
                path="/settings"
                element={
                  <div
                    className="flex-1 overflow-auto p-4"
                    data-settings-scroll
                    role="region"
                    aria-label="Settings content"
                  >
                    <div className="flex flex-col gap-4">
                      <SettingsView />
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

/**
 * App Component
 *
 * Layout structure:
 * - Outer container (grey bg) wraps both sidebar and main content
 * - Sidebar is part of outer container (same color, no border)
 * - Main content is inset within outer container, creating frame effect
 * - Top edge of outer container is draggable for window movement
 */
export function App() {
  return (
    <HashRouter>
      <CommandPalette>
        <AppContent />
      </CommandPalette>
    </HashRouter>
  )
}
