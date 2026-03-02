---
date: 2025-01-24
developer: Jp Rowan
agent: Auto (Cursor)
model: claude-sonnet-4.5
tags: [ui, layout, sidebar, electron, frameless-window, mobile, responsive]
related_files:
  - src/renderer/src/App.tsx
  - src/renderer/src/components/AppSidebar.tsx
  - src/renderer/src/components/MainHeader.tsx
  - src/main/ipc/window.ts
  - src/preload/index.ts
  - src/renderer/src/types/api.d.ts
related_issues: []
related_devlogs: []
session_duration: ~4 hours
iterations: Multiple iterations refining layout, spacing, and mobile behavior
outcome: Complete sidebar layout with collapsible icon mode, mobile drawer, traffic light control, and responsive breakpoint handling
---

[Docs](../README.md) / [Devlogs](./README.md) / Sidebar Layout Implementation

# Context

Cortex needed a modern, frameless window layout that maximizes screen real estate while maintaining a clean, professional appearance. The goal was to implement a collapsible sidebar layout that:
- Extends to the top of the window (no separate title bar)
- Provides icon-only mode when collapsed
- Works seamlessly on mobile breakpoints
- Integrates with macOS native window controls (traffic lights)
- Creates visual distinction between sidebar and main content areas

The application uses Electron with a frameless window (`titleBarStyle: 'hiddenInset'`), providing native macOS traffic light controls but requiring careful layout management.

# Problem

Several layout challenges needed addressing:

1. **Layout Approach**: Choosing between different layout patterns (Arc browser style, Cursor IDE style, or custom approach)
2. **Frameless Window Integration**: Managing draggable regions while preserving interactive elements
3. **Traffic Light Control**: Hiding/showing macOS traffic lights based on sidebar state
4. **Mobile Breakpoints**: Handling sidebar behavior at mobile sizes (< 768px)
5. **Visual Hierarchy**: Creating clear distinction between sidebar and main content without heavy borders
6. **Icon Centering**: Ensuring icons are properly centered when sidebar collapses to icon mode

# Solution

## Layout Structure

Implemented an Arc-style layout where:
- **Outer container** (`SidebarProvider`) wraps everything with `bg-bg-secondary`
- **Sidebar** extends to top, same background as outer container (no border)
- **Main content wrapper** has `p-3` padding creating frame effect on top, right, and bottom
- **Main content** (`SidebarInset`) is inset with `bg-bg-primary`, rounded corners, and border
- **Top edge** of outer container is draggable for window movement

```tsx
<SidebarProvider className="bg-bg-secondary">
  <AppSidebar />
  <div className="bg-bg-secondary p-3" style={{ WebkitAppRegion: 'drag' }}>
    <SidebarInset className="bg-bg-primary rounded-lg border">
      <MainHeader />
      {/* Content */}
    </SidebarInset>
  </div>
</SidebarProvider>
```

## Traffic Light Control

Implemented programmatic control of macOS traffic lights using Electron's native API:

1. **IPC Handler** (`src/main/ipc/window.ts`):
   ```typescript
   ipcMain.handle('window:setButtonVisibility', (_event, visible: boolean) => {
     if (mainWindow && process.platform === 'darwin') {
       mainWindow.setWindowButtonVisibility(visible)
     }
   })
   ```

2. **Preload Exposure** (`src/preload/index.ts`):
   ```typescript
   setButtonVisibility: (visible: boolean) => 
     ipcRenderer.invoke('window:setButtonVisibility', visible)
   ```

3. **Sidebar Integration** (`AppSidebar.tsx`):
   - Hides traffic lights when sidebar is collapsed OR on mobile
   - Uses `useEffect` to sync visibility with sidebar state

## Draggable Regions

Carefully managed `WebkitAppRegion` to allow window dragging while preserving interactivity:

- **Top padding area**: Separate draggable div (`h-7` when expanded, `h-0` when collapsed) for traffic light spacing
- **Main content wrapper**: Draggable for window movement
- **Sidebar content**: Not draggable (allows button clicks and tooltips)
- **Main content area**: Not draggable (allows all interactions)

This separation ensures tooltips and button clicks work correctly while maintaining window drag functionality.

## Mobile Breakpoint Handling

At `< 768px` breakpoint:

1. **Sidebar becomes Sheet drawer**: Uses shadcn/ui Sheet component for mobile overlay
2. **Traffic lights hidden**: Prevents overlay issues on small screens
3. **Borders removed**: No right border on Sheet, no rounded corners on main content wrapper
4. **Left padding removed**: Main content wrapper uses `peer-data-[state=collapsed]:pl-0` to remove left padding when sidebar is hidden

## Icon Centering

When collapsed to icon mode:
- Removed `SidebarHeader` wrapper (simplified structure)
- Sidebar buttons use `w-8 h-8` fixed size
- Parent containers (`SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`) center content with flexbox
- Removed group padding when collapsed (`group-data-[collapsible=icon]:p-0`)

## Animation System

Integrated `tailwindcss-animate` as canonical animation system:
- Sheet slide animations now work correctly
- Consistent animation approach across all components
- All animations use Tailwind classes (no custom CSS)

# Outcome

## What Works Now

✅ **Collapsible Sidebar**: Smoothly transitions between expanded and icon-only modes
✅ **Traffic Light Control**: Automatically hides when collapsed or on mobile
✅ **Mobile Support**: Sheet drawer with proper animations and no visual artifacts
✅ **Window Dragging**: Top area draggable while preserving all interactions
✅ **Icon Centering**: Icons properly centered in collapsed state
✅ **Visual Hierarchy**: Clear distinction between sidebar and content using color and spacing
✅ **Responsive**: Handles mobile breakpoints gracefully

## Key Files

- `src/renderer/src/App.tsx` - Main layout structure
- `src/renderer/src/components/AppSidebar.tsx` - Sidebar implementation with traffic light control
- `src/renderer/src/components/MainHeader.tsx` - Header for main content area
- `src/main/ipc/window.ts` - Traffic light visibility IPC handler
- `src/preload/index.ts` - API exposure for renderer
- `src/renderer/src/types/api.d.ts` - TypeScript definitions

## Technical Decisions

1. **Arc-style layout**: Chosen for clean, modern appearance that maximizes content space
2. **Separate draggable header div**: Prevents blocking pointer events on interactive elements
3. **Programmatic traffic light control**: More reliable than CSS overlays
4. **Mobile-first responsive**: Sheet drawer pattern for mobile, persistent sidebar for desktop
5. **Color-based hierarchy**: Relies on background color contrast rather than heavy borders

# Notes

## Gotchas

- **WebkitAppRegion blocking events**: Setting `drag` on a parent container blocks all pointer events on children. Solution: Use separate draggable divs for spacing areas only.
- **Traffic light API**: `setWindowButtonVisibility()` only works on macOS. Platform check required.
- **Mobile breakpoint**: Sidebar automatically becomes Sheet at `< 768px` via `useIsMobile` hook.
- **Icon centering**: Required removing padding from multiple parent containers, not just the button itself.

## Future Considerations

- Consider bottom navigation for very small screens (< 640px)
- May need to adjust draggable regions if additional header content is added
- Traffic light control could be extended for Windows/Linux window controls in future
- Animation system is now standardized - all new components should use `tailwindcss-animate`

## Related Work

This layout implementation builds on the shadcn/ui migration (separate devlog). The sidebar component from shadcn/ui provided the foundation, but significant customization was needed for:
- Frameless window integration
- Traffic light control
- Mobile breakpoint behavior
- Visual styling to match design system
