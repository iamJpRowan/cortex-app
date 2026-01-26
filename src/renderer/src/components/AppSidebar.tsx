import * as React from 'react'
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
import { Home, Settings, MessageSquare, Network } from 'lucide-react'

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

  // Hide/show traffic lights based on sidebar state and mobile breakpoint
  React.useEffect(() => {
    if (window.api?.window?.setButtonVisibility) {
      window.api.window.setButtonVisibility(!isCollapsed && !isMobile)
    }
  }, [isCollapsed, isMobile])

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
                <SidebarMenuButton tooltip="Home" isActive>
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Chat">
                  <MessageSquare />
                  <span>Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Graph">
                  <Network />
                  <span>Graph</span>
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
                <SidebarMenuButton tooltip="Settings">
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
