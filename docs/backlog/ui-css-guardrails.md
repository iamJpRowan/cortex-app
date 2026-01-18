[Docs](../README.md) / [Backlog](./README.md) / UI and CSS Guardrails

# UI and CSS Guardrails

## Goal

Establish comprehensive guardrails and conventions for UI development to ensure consistency, maintainability, and future customization capabilities. This includes creating a design system with CSS variables (design tokens), responsive breakpoints, component styling standards, accessibility guidelines, and theme system support. The goal is to set up patterns now that will make it easy to apply user customization in the future while maintaining a simple, consistent UI style.

## Constraints and Requirements

### Prerequisites
- Existing Tailwind CSS setup
- Vanilla JSX component system (no React)
- TypeScript throughout
- Electron renderer process for UI

### Functional Requirements

#### Design Tokens (CSS Variables)
- CSS custom properties for colors, spacing, typography, and other design values
- Hierarchical token structure (base colors, accent colors, semantic colors)
- Support for light and dark themes via CSS variable switching
- System preference detection (`prefers-color-scheme`)
- Persistent user preference storage for theme selection

#### Responsive Design
- Mobile-first approach to all UI components
- Standardized breakpoint system (xs, sm, md, lg, xl)
- Consistent layout patterns that adapt to screen size
- Proper wrapping and stacking behavior at different breakpoints

#### Component Styling
- Reusable CSS classes for consistent component appearance
- Standardized variants for common components (buttons, inputs, cards)
- Component-specific styling via Tailwind's `@layer components`
- Consistent spacing, typography, and visual hierarchy

#### Component Lifecycle
- Proper initialization patterns for components
- Cleanup and resource management
- Event listener management
- Memory leak prevention

#### Accessibility
- WCAG AA compliance minimum (4.5:1 contrast ratio for text)
- Semantic HTML usage throughout
- Keyboard navigation support
- Focus management and visible focus indicators
- ARIA labels where appropriate
- Screen reader compatibility
- Reduced motion support (`prefers-reduced-motion`)

#### Theme System
- Light and dark mode toggle functionality
- Smooth transitions between themes
- CSS variable-based theme switching
- Theme persistence across sessions

#### Pre-Commit Validation
- Automated checks to enforce UI/CSS guardrails before commits
- CSS linting (stylelint) to validate design token usage and conventions
- Design token validation to ensure proper usage and prevent hardcoded values
- Component pattern validation to enforce lifecycle and structure patterns
- Accessibility checks to catch a11y issues early
- Integration with existing Husky pre-commit hooks

### Non-Functional Requirements
- Documentation must be comprehensive and easy to reference
- Implementation must integrate seamlessly with existing Tailwind setup
- All patterns must be demonstrated with examples
- Code must follow existing TypeScript and component patterns
- Must not break existing components (backward compatible)

## Approach

### Phase 1: Documentation

#### Design Tokens Documentation
- Create `docs/development/design-tokens.md` documenting:
  - Complete CSS variable structure
  - Color palette (base, accent, semantic)
  - Spacing scale
  - Typography scale
  - Border radius scale
  - Z-index scale
  - Usage guidelines for each token category

#### UI Guide Documentation
- Create `docs/development/ui-guide.md` covering:
  - Component usage patterns
  - Styling conventions
  - Responsive design patterns
  - Component composition examples
  - Best practices for creating new components

#### Accessibility Documentation
- Create `docs/development/accessibility.md` with:
  - A11y checklist
  - Common patterns and examples
  - Testing guidelines
  - Keyboard navigation standards
  - Screen reader considerations

#### Component Lifecycle Documentation
- Create `docs/development/component-lifecycle.md` documenting:
  - Initialization patterns
  - Cleanup patterns
  - Event listener management
  - Resource disposal
  - Common pitfalls and solutions

### Phase 2: Implementation

#### CSS Variable System
- Extend `src/renderer/src/main.css` with:
  - Base design tokens (colors, spacing, typography)
  - Light theme variables
  - Dark theme variables
  - Theme switching mechanism
  - Reduced motion support

#### Tailwind Configuration
- Update `tailwind.config.js` to:
  - Integrate CSS variables into Tailwind theme
  - Define responsive breakpoints
  - Create component variants
  - Set up utility classes that use design tokens

#### Component Base Classes
- Create reusable component classes via `@layer components`:
  - Button variants (primary, secondary, danger, etc.)
  - Input styles
  - Card/container styles
  - Form element styles
  - Status message styles

#### Theme System Implementation
- Create theme management utilities:
  - Theme detection (system preference)
  - Theme switching function
  - Theme persistence (localStorage)
  - Theme toggle component

#### Accessibility Enhancements
- Add base accessibility styles:
  - Focus indicators
  - Skip links
  - Reduced motion animations
  - High contrast support

#### Example Component Updates
- Update `TestPanel` component to demonstrate:
  - Design token usage
  - Responsive patterns
  - Component class usage
  - Accessibility features
  - Theme support

#### Pre-Commit Automation Setup
- Configure stylelint for CSS/Tailwind validation
- Create validation scripts for:
  - Design token usage (prevent hardcoded colors/spacing)
  - Component lifecycle patterns
  - Accessibility compliance
- Integrate with lint-staged to check only changed files
- Update Husky pre-commit hook to run UI validation checks
- Ensure checks run alongside existing TypeScript validation

## Architectural Choices

### CSS Architecture Layers
1. **Design Tokens** (CSS Variables) - Foundation layer
2. **Base/Reset Styles** - Browser normalization
3. **Component Classes** - Reusable component styles
4. **Utility Classes** - Tailwind utilities
5. **Theme Overrides** - Theme-specific adjustments

### Design Token Structure
- Use hierarchical naming convention:
  - `--color-base-*` for base colors
  - `--color-accent-*` for accent colors
  - `--color-text-*` for text colors
  - `--space-*` for spacing
  - `--font-*` for typography
  - `--radius-*` for border radius
  - `--z-*` for z-index

### Integration with Tailwind
- Use Tailwind's `theme()` function to reference CSS variables
- Extend Tailwind config to use design tokens
- Maintain Tailwind utility classes while adding semantic component classes
- Use `@apply` sparingly, prefer composition

### Component Lifecycle Pattern
- Components return HTMLElement (existing pattern)
- Use closures for component state
- Cleanup functions for event listeners
- Document lifecycle in component comments

### Responsive Breakpoints
- Mobile-first: styles apply to mobile by default
- Breakpoints: xs (320px), sm (640px), md (768px), lg (1024px), xl (1280px)
- Use Tailwind's responsive prefixes (`sm:`, `md:`, etc.)

### Theme Implementation
- CSS variables for all themeable values
- `[data-theme="light"]` and `[data-theme="dark"]` attributes on root
- JavaScript function to toggle theme attribute
- CSS automatically switches via variable values

### Accessibility Standards
- Semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, etc.)
- ARIA labels for interactive elements without visible labels
- Keyboard navigation for all interactive elements
- Focus visible on all focusable elements
- Color contrast meets WCAG AA standards

## Success Criteria

### Documentation Complete
- All four documentation files created and comprehensive
- Examples provided for each pattern
- Clear guidelines for developers
- Integration with existing documentation structure

### Implementation Complete
- CSS variable system fully implemented
- Light and dark themes functional
- Theme toggle working and persistent
- All design tokens defined and documented
- Tailwind config integrated with design tokens
- Component base classes created and usable
- Responsive breakpoints defined and working
- Accessibility features implemented
- Example component (TestPanel) updated to demonstrate patterns
- Pre-commit validation configured and enforcing guardrails

### Quality Standards Met
- All existing components continue to work
- No visual regressions
- Theme switching is smooth
- Accessibility audit passes (keyboard navigation, screen reader, contrast)
- Code follows existing TypeScript patterns
- Documentation is clear and actionable
- Pre-commit hooks prevent violations of UI/CSS guardrails
- Validation catches design token misuse, accessibility issues, and component pattern violations before commit

## Dependencies

- **Requires:** Existing Tailwind CSS setup, component system, Husky pre-commit hooks
- **Uses:** Current CSS architecture, TypeScript patterns, existing pre-commit infrastructure
- **Enables:** Future UI components, user customization features, consistent styling, automated quality enforcement

## Notes

- This is a foundational change that will affect all future UI development
- Should be implemented before creating many new components
- Design tokens should be comprehensive but can be extended later
- Theme system should be simple initially but extensible
- Accessibility is not optional - all components must meet standards
- Documentation is as important as implementation for long-term maintainability
- Consider creating a style guide/component library page in the future
- Design tokens should be structured to allow easy user customization later
