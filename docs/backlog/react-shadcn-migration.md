[Docs](../README.md) / [Backlog](./README.md) / React + shadcn/ui Migration

# React + shadcn/ui Migration

## Goal

Migrate from vanilla JSX to React and integrate shadcn/ui as the component library. This enables access to data visualization libraries, faster development with pre-built components, and a more maintainable codebase. Remove existing vanilla JSX components and rebuild with React + shadcn/ui.

## Prerequisites

- Current vanilla JSX implementation (to be removed)
- Design token system (to be simplified)
- Electron app structure (main/renderer processes)

## Key Capabilities

### React Integration
- React + ReactDOM setup with TypeScript
- React JSX configuration
- Vite configured for React
- IPC integration patterns for React components

### shadcn/ui Setup
- shadcn/ui initialized and configured
- Design tokens mapped to shadcn's expected token names
- Component library ready for use

### Frameless Window
- Electron window configured with `frame: false`
- Custom window controls (close, minimize, maximize)
- Window dragging functionality

### Layout Structure
- LeftSidebar with NavigationPanel
- RightSidebar (placeholder for future panels)
- CenterArea with TabContainer
- View components structure
- Based on [terminology.md](../design/terminology.md)

## Design Token Strategy

### Keep
- **Color tokens only**:
  - shadcn mapping tokens (`--background`, `--foreground`, `--primary`, etc.) → mapped to semantic tokens
  - Semantic colors (`--color-text-primary`, `--color-bg-primary`, etc.)
  - Data visualization colors (`--color-success-500`, `--color-error-500`, etc.)

### Remove (Use Tailwind Defaults)
- Spacing tokens → Use Tailwind's `p-4`, `m-6`, etc.
- Typography tokens → Use Tailwind's `text-sm`, `text-xl`, etc.
- Transition tokens → Use Tailwind's `duration-300`, `ease-in-out`, etc.
- Border radius tokens → Use Tailwind's `rounded-md`, `rounded-lg`, etc.
- Z-index tokens → Use Tailwind's `z-10`, `z-30`, etc.

**Rationale**: Tailwind provides these scales out of the box. Custom tokens add complexity without clear benefit unless user customization is needed.

## Implementation Approach

### Phase 1: React Setup
1. Install React + ReactDOM dependencies
2. Configure TypeScript for React JSX (`jsx: "react-jsx"` - remove `jsxFactory` and `jsxFragmentFactory`)
3. Update Vite config for React
4. Update `main.ts` to use React rendering
5. Remove old vanilla JSX components and `lib/jsx.ts`
6. Update validation scripts:
   - `validate-transitions.js`: Allow Tailwind transition utilities (`duration-*`, `ease-*`)
   - `validate-design-tokens.js`: Allow Tailwind spacing utilities (`p-*`, `m-*`, etc.) while still checking for hardcoded colors
   - `validate-accessibility.js`: Verify React patterns work correctly (React uses camelCase `onClick`, `onKeyDown`)
7. Consider adding ESLint with React plugins (`eslint-plugin-react`, `eslint-plugin-react-hooks`)

### Phase 2: shadcn/ui Setup
1. Initialize shadcn/ui (`npx shadcn@latest init`)
2. Configure `components.json` to use existing design tokens
3. Map shadcn's expected token names to semantic color tokens
4. Install initial components (Button, Card, etc.)
5. Test component rendering with design tokens

### Phase 3: Frameless Window
1. Update `BrowserWindow` config with `frame: false`
2. Create window controls component (close, minimize, maximize)
3. Implement window dragging (title bar area)
4. Test window functionality

### Phase 4: Layout Structure
1. Create `LeftSidebar` component with `NavigationPanel`
2. Create `RightSidebar` component (placeholder)
3. Create `CenterArea` with `TabContainer` structure
4. Create base `View` component pattern
5. Build main `Layout` component coordinating all pieces
6. Preserve mobile-first responsive design
7. Maintain accessibility (ARIA, keyboard navigation)

## Constraints and Requirements

### Technical Constraints
- Must preserve design principles: mobile-first, accessibility, semantic HTML
- Must use shadcn/ui components (not custom component classes)
- Must maintain IPC patterns (main process owns state)
- Must support light/dark themes via design tokens

### Functional Requirements
- Layout structure matches terminology.md
- Components use Tailwind utilities directly
- Design tokens simplified to color tokens only

### Design Principles Preserved
- Mobile-first responsive design
- WCAG AA accessibility compliance
- Monochromatic aesthetic with accent colors
- Component classes removed (use shadcn components)

## Architectural Choices

### Component Library
- **shadcn/ui**: Copy-paste React components, styled with Tailwind
- **No component classes**: Use shadcn components directly
- **Design tokens**: Color tokens only, mapped to shadcn

### State Management
- **Main process**: Owns application state (unchanged)
- **Renderer**: React components subscribe to IPC events via `useEffect`
- **Local UI state**: React `useState` for transient UI state

### Styling
- **Tailwind utilities**: Use directly for spacing, typography, transitions
- **Design tokens**: Color tokens only (for theming and customization)
- **shadcn components**: Pre-styled, customizable via tokens

## Success Criteria

1. ✅ React + ReactDOM installed and configured
2. ✅ TypeScript JSX configuration updated (`jsx: "react-jsx"`)
3. ✅ Validation scripts updated to allow Tailwind utilities
4. ✅ shadcn/ui initialized and components working
5. ✅ Design tokens simplified (color tokens only)
6. ✅ Frameless window with custom controls
7. ✅ Layout structure built (LeftSidebar, RightSidebar, CenterArea, TabContainer)
8. ✅ All old vanilla JSX components removed
9. ✅ IPC integration working with React components
10. ✅ Mobile-first responsive design preserved
11. ✅ Accessibility standards maintained
12. ✅ Light/dark theme switching works
13. ✅ Components use Tailwind utilities directly
14. ✅ Pre-commit hooks pass with updated validation rules

## Notes

This migration enables:
- Access to React ecosystem (data visualization libraries, etc.)
- Faster development with shadcn/ui components
- Simpler design token system
- Standard patterns (Tailwind utilities, React components)

The simplified token approach reduces complexity while maintaining customization capability through color tokens. Spacing, typography, transitions, etc. use Tailwind's built-in scales.

## See Also

- [Terminology](../design/terminology.md) - Layout structure definitions
- [Design Tokens](../design/design-tokens.md) - Simplified token system
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) - Component library reference
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility classes reference
