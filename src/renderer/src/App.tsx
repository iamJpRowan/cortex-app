import './main.css'
import { AppSidebar } from './components/AppSidebar'
import { MainHeader } from './components/MainHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

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
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-icon': '3rem',
        } as React.CSSProperties
      }
      className="bg-bg-secondary rounded-lg overflow-hidden"
    >
      <AppSidebar />
      {/* Outer container wrapping main content - draggable for window movement */}
      <div
        className={cn(
          // Layout
          'flex flex-1 flex-col',
          // Styling
          'bg-bg-secondary rounded-tr-lg rounded-br-lg',
          // Spacing and overflow - remove left padding when sidebar is collapsed
          'p-3 overflow-hidden',
          'peer-data-[state=collapsed]:pl-0'
        )}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Main content area - inset with padding creating frame effect */}
        <SidebarInset
          className={cn(
            // Layout
            'flex flex-col min-h-0 flex-1',
            // Styling
            'bg-bg-primary rounded-lg',
            // Border and overflow
            'border border-border-primary overflow-hidden'
          )}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <MainHeader title="Cortex" />
          <div className="flex flex-1 flex-col gap-4 p-4 overflow-auto">
            <div className="rounded-lg border border-border-primary bg-bg-primary p-6">
              <h1 className="text-xl font-semibold text-text-primary">Layout</h1>
              <p className="mt-2 text-text-secondary">
                Outer container (grey) wraps the main content. Main content is inset with
                padding, creating a frame effect on all sides. Sidebar and frame share the
                same background color.
              </p>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
