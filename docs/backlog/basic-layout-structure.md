[Docs](../README.md) / [Backlog](./README.md) / Basic Layout Structure

# Basic Layout Structure

## Goal

Implement minimal layout foundation with collapsible left sidebar and center content area. This unblocks building basic views while establishing the foundation for the full UI Layout Framework.

## Key Capabilities

### Layout Structure
- **Left Sidebar**: Collapsible navigation area with icon-only mode when collapsed
- **Center Area**: Main content container for rendering views
- **Right Sidebar Placeholder**: Empty container (no functionality yet)

### Left Sidebar Features
- Collapse/expand toggle button
- Icon-only mode when collapsed (shows icons, hides labels)
- Fixed width (e.g., 250px) - resizing deferred to full framework
- In-memory state management (persistence deferred)

### Center Area
- Simple content container
- Renders single view directly (no tabs yet)
- Ready for tab system integration later

## Architectural Foundation

### Component Organization
```
src/renderer/src/
  ├── components/
  │   ├── Layout.tsx          # Main layout container
  │   ├── LeftSidebar.tsx     # Left sidebar with collapse
  │   └── CenterArea.tsx      # Center content area
  └── views/                  # Create this directory
      └── [ViewName]View.tsx  # View components
```

### Layout State Structure (Minimal)
```typescript
interface LayoutState {
  leftSidebar: {
    collapsed: boolean
    // width and panels deferred to full framework
  }
  // rightSidebar and tabs deferred to full framework
}
```

### Component Pattern
- Continue using vanilla JSX with `createElement`
- Components return `HTMLElement` (no React)
- Closure-based state management (matches existing pattern)
- Follow existing component lifecycle patterns

## Implementation Approach

1. **Create Layout Container**
   - Three-region structure (left sidebar, center, right sidebar placeholder)
   - Flexbox/CSS Grid layout
   - Full viewport height

2. **Implement Left Sidebar**
   - Collapse/expand toggle icon button using Lucide `panel-right-close` 
   - Icon-only rendering when collapsed
   - Fixed width (250px expanded, ~48px collapsed)
   - Smooth transition animation

3. **Create Center Area**
   - Simple container for main content
   - Accepts view component as prop/parameter
   - Ready for tab integration later

4. **Update App.tsx**
   - Use new Layout component
   - Render views in center area
   - Move TestPanel content to views/ directory and rename to testView

## Constraints and Requirements

### Technical Constraints
- Must use existing component pattern (functions returning `HTMLElement`)
- Must follow design tokens and component classes from design system
- Must maintain accessibility standards (WCAG AA)
- Must support light/dark themes
- Must be responsive (mobile-first approach)

### Functional Requirements
- Sidebar collapse must be smooth and performant
- Layout must fill viewport correctly
- All operations must be keyboard accessible
- Icon-only mode must be visually clear

### Deferred to Full Framework
- Right sidebar functionality (keep as placeholder)
- Tab system (render single view directly)
- Panel system (render content directly in sidebar)
- Resize functionality (fixed width initially)
- State persistence (add localStorage later)
- Registry foundation (add when needed)

## Success Criteria

1. ✅ Layout renders with left sidebar, center area, and right sidebar placeholder
2. ✅ Left sidebar can be collapsed/expanded independently
3. ✅ Icon-only mode works when sidebar is collapsed
4. ✅ Center area renders views correctly
5. ✅ Layout fills viewport correctly
6. ✅ All functionality is keyboard accessible
7. ✅ Responsive behavior works at breakpoints
8. ✅ Component structure ready for full framework integration

## Migration Path

This minimal implementation sets up the foundation for:

1. **Next**: Add tabs to center area (Phase 2 of full framework)
2. **Then**: Add right sidebar functionality (Phase 3 of full framework)
3. **Later**: Add panels, resize, persistence, registry (Phases 4-5 of full framework)

The component structure and state management approach will support these additions without requiring refactoring.

## See Also

- [UI Layout Framework](./ui-layout-framework.md) - Full framework that builds on this foundation
- [Terminology](../design/terminology.md) - UI terminology and naming conventions
- [UI Guide](../design/ui-guide.md) - Component usage patterns
