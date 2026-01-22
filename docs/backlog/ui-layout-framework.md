[Docs](../README.md) / [Backlog](./README.md) / UI Layout Framework

# UI Layout Framework

## Goal

Complete the foundational UI layout system with collapsible/resizable sidebars, tabbed center area, and extensible component architecture. Builds on the Basic Layout Structure to add tabs, panels, resize functionality, persistence, and registry foundation. Establish patterns that support future drag-and-drop functionality and plugin-provided UI components.

## Prerequisites

- **[Basic Layout Structure](./basic-layout-structure.md)** - Must be complete. Provides:
  - Layout container with left sidebar, center area, and right sidebar placeholder
  - Collapsible left sidebar with icon-only mode
  - Basic state management structure
  - Component organization foundation

## Key Capabilities

### Layout Structure
- **Left Sidebar**: Primary navigation, collapsible, resizable, persistent state
- **Right Sidebar**: Global panels (e.g., Chat), collapsible, resizable, persistent state
- **Center Area**: Tabbed interface for different views
- **Tab Bar**: Located at top of center area, extends over right sidebar

### Sidebar Features
- Independently collapsible (both sidebars)
- Resizable with persistent width state
- Show icons when collapsed
- Auto-collapse at responsive breakpoints
- Both visible by default for new users
- No min/max width constraints (but consider usability - may add later)

### Tab System
- Support multiple tabs (no limit)
- Tab operations: close, reorder (drag-and-drop), pin, duplicate
- Tab names determined by view content (no rename operation)
- Persist tab order and open state across app restarts
- Tabs can contain different views or instances of the same view

### Right Sidebar Context
- Contains global panels that persist across all views (e.g., Chat panel)
- Users can reorder and add/remove panels within sidebar
- Panels are location-agnostic (can be moved to other locations in future)
- Collapsed state when no panels are visible

## Architectural Foundation

### Component Organization
```
src/renderer/src/
  ├── components/     # Reusable UI components (Button, Card, etc.)
  ├── panels/         # Panel components (NavigationPanel, etc.)
  ├── views/          # View components (ChatView, GraphView, etc.)
  ├── widgets/        # Widget components (DataWidget, etc.) - for future
  └── registry/        # Registry files (widget-registry.ts, etc.) - for future
```

**Note:** `TestPanel` should be moved from `components/` to `panels/` during implementation.

### Widget Interface (Foundation for Future)
```typescript
interface Widget {
  id: string
  name: string
  description?: string
  category?: string
  render: (config?: Record<string, any>) => HTMLElement
}
```

### Panel Interface
```typescript
interface Panel {
  id: string
  title: string
  collapsible?: boolean
  widgets?: string[]  // Widget IDs - for future drag-and-drop
  // Note: No location property - panels are location-agnostic
  // Location is determined by where they're rendered, not panel definition
}
```

### View Interface
```typescript
interface View {
  id: string
  name: string  // For tab label
  render: () => HTMLElement  // Main content
  // Note: Views don't control sidebar content - sidebar panels are global
  // If a view needs sidebar content, it can suggest panels, but sidebar is independent
}
```

### Layout State Structure
```typescript
interface LayoutState {
  leftSidebar: {
    width: number
    collapsed: boolean
    panels: string[]  // Panel IDs in order
  }
  rightSidebar: {
    width: number
    collapsed: boolean
    panels: string[]  // Panel IDs in order (global panels, e.g., Chat)
    // Future: Can add tabPanels: Record<string, string[]> if tab-specific panels needed
  }
  tabs: {
    order: string[]  // Tab IDs in order
    active: string | null
  }
}
```

### Registry Pattern (Foundation for Future)
- Mirror existing `ToolRegistry` pattern for consistency
- Widget registry structure ready for plugin integration
- Clear separation: `builtin/` vs future `user/` or `plugins/` directories

## Implementation Approach

**Note:** Phase 1 (Core Layout Structure) is implemented in [Basic Layout Structure](./basic-layout-structure.md). This framework builds on that foundation.

### Phase 2: Tab System
1. Create tab container component
2. Implement tab operations (close, reorder, pin, duplicate)
3. Add tab state persistence
4. Integrate tab bar extending over right sidebar
5. Update center area to render tabs instead of single view

### Phase 3: Right Sidebar Functionality
1. Implement right sidebar collapse/resize functionality (mirror left sidebar)
2. Add state management for right sidebar width and collapsed state
3. Integrate with layout container

### Phase 4: Panel System
1. Create panel component interface and base implementation
2. Implement panel rendering in sidebars
3. Add panel reordering within sidebars
4. Support global panels in right sidebar

### Phase 5: Resize Functionality
1. Add resize handles to both sidebars
2. Implement drag-to-resize interaction
3. Add persistent width state management
4. Update layout state structure to include widths

### Phase 6: State Persistence
1. Implement localStorage persistence for layout state
2. Load persisted state on app startup
3. Handle migration of state structure if needed

### Phase 7: Registry Foundation
1. Create widget registry structure (mirroring ToolRegistry)
2. Define widget interface
3. Set up directory structure for future widgets
4. Document registry pattern for future use

## Constraints and Requirements

### Technical Constraints
- Must use existing component pattern (functions returning `HTMLElement`)
- Must follow design tokens and component classes from design system
- Must maintain accessibility standards (WCAG AA)
- Must support light/dark themes
- Must be responsive (mobile-first approach)

### Functional Requirements
- Sidebar collapse/resize must be smooth and performant
- Layout state must persist across app restarts
- Tab switching must be instant
- Right sidebar panels persist across tab switches (global panels)
- All operations must be keyboard accessible

### Future Extensibility
- **Location-Agnostic Panels**: Panel interface doesn't assume location - can be rendered anywhere
- **Extensible Layout State**: State structure can be extended (e.g., add `tabPanels` or `center.panels`) without breaking existing panels
- **Location-Agnostic Rendering**: Rendering system can render panels in any location (left sidebar, right sidebar, center, floating)
- **Widget Positions**: Layout state structure must accommodate widget positions (even if empty initially)
- **Registry Pattern**: Must be ready for plugin integration
- **Component Interfaces**: Must be extensible for drag-and-drop
- **File Organization**: Must support plugin-provided components

## Architectural Choices

### State Management
- Use closure-based state (matching current component pattern)
- Persist layout state to localStorage or similar
- State structure designed to accommodate future widget positions
- State structure is extensible (can add new locations/structures without breaking existing panels)

### Component Pattern
- Continue using vanilla JSX with `createElement`
- Components return `HTMLElement` (no React)
- Follow existing component lifecycle patterns

### Registry Pattern
- Mirror `ToolRegistry` structure for consistency
- Use Map-based storage
- Singleton pattern for registry instance
- Auto-registration for built-in components

### Responsive Behavior
- Auto-collapse sidebars at breakpoints
- Maintain usability on smaller screens
- Consider mobile-first approach

## Success Criteria

1. ✅ Layout renders with left sidebar, center area, and right sidebar
2. ✅ Both sidebars can be collapsed/expanded independently
3. ✅ Both sidebars can be resized with persistent state
4. ✅ Icons visible when sidebars are collapsed
5. ✅ Tab system supports multiple tabs with all operations
6. ✅ Tab order and state persist across app restarts
7. ✅ Right sidebar panels persist across tab switches (global panels)
8. ✅ Users can reorder and add/remove panels within sidebars
9. ✅ Layout state persists correctly
10. ✅ All functionality is keyboard accessible
11. ✅ Responsive behavior works at breakpoints
12. ✅ `TestPanel` moved to `panels/` directory
13. ✅ Widget registry foundation established
14. ✅ Component interfaces defined and documented

## Notes

This is a foundational feature that enables all future UI development. The architecture is designed to support:
- Future drag-and-drop functionality (widget positions in state, registry pattern)
- Plugin-provided components (registry structure, clear separation)
- User-customizable layouts (state persistence, panel reordering)
- Future location changes (panels can be moved to center, floating windows, etc.)

### Design Philosophy: Simple Now, Extensible Later

**Simplified Initial Implementation:**
- Right sidebar uses simple `panels: string[]` array (global panels only)
- No tab-specific panel complexity initially
- Panels are location-agnostic (can be rendered anywhere)
- State structure is extensible (can add `tabPanels`, `center.panels`, etc. later)

**Extensibility Hooks:**
- Panel interface doesn't assume location
- Layout state can be extended without breaking existing panels
- Rendering system is location-agnostic
- Moving a panel later is just changing state, not refactoring

**Future Enhancements (If Needed):**
- Tab-specific panels: Add `tabPanels: Record<string, string[]>` to state
- Tabbed sidebar: Add tabbed mode to right sidebar if many panels needed
- Movable panels: Add drag-and-drop to move panels between locations
- Floating panels: Add floating window support

The initial implementation focuses on the core layout and tab system with global panels. Drag-and-drop, tab-specific panels, and advanced widget composition will be added in future iterations if needed.

## See Also

- [Basic Layout Structure](./basic-layout-structure.md) - Prerequisite minimal layout foundation
- [Terminology](../design/terminology.md) - UI terminology and naming conventions
- [UI Guide](../design/ui-guide.md) - Component usage patterns
- [Tool Registry](../../src/main/services/llm/tools/registry.ts) - Pattern to mirror for widget registry
