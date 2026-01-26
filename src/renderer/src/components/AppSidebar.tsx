import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Home, Settings } from 'lucide-react'

/**
 * AppSidebar Component
 *
 * Sidebar that extends to the top of the window.
 * Includes top padding to account for macOS traffic light controls.
 * Top area is draggable for window movement.
 * Hides traffic lights when collapsed or on mobile.
 */
export function AppSidebar() {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const navigate = useNavigate()
  const location = useLocation()

  // Hide/show traffic lights based on sidebar state and mobile breakpoint
  React.useEffect(() => {
    if (window.api?.window?.setButtonVisibility) {
      window.api.window.setButtonVisibility(!isCollapsed && !isMobile)
    }
  }, [isCollapsed, isMobile])

  // Check if a route is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === ''
    }
    return location.pathname === path
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Draggable header area for traffic light spacing */}
      <div
        className={isCollapsed ? 'h-0' : 'h-7'}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={isActive('/')}
                  onClick={() => navigate('/')}
                >
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Settings"
                  isActive={isActive('/settings')}
                  onClick={() => navigate('/settings')}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
