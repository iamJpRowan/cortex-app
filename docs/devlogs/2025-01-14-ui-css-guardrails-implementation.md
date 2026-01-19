---
date: 2025-01-14
developer: Jp Rowan
agent: Auto (Cursor)
model: claude-sonnet-4.5
tags: [ui, css, design-system, accessibility, theme-system, guardrails, phase-0]
related_files:
  - docs/backlog/ui-css-guardrails.md
  - docs/development/design-tokens.md
  - docs/development/ui-guide.md
  - docs/development/accessibility.md
  - docs/development/component-lifecycle.md
  - src/renderer/src/main.css
  - src/renderer/src/lib/theme.ts
  - tailwind.config.js
  - .stylelintrc.json
  - .lintstagedrc.json
  - scripts/validate-design-tokens.js
  - scripts/validate-accessibility.js
related_issues: []
related_devlogs: []
session_duration: ~8 hours (across multiple sessions)
iterations: 12 staged steps with incremental testing
outcome: Complete UI/CSS guardrails system with design tokens, theme system, component patterns, accessibility compliance, comprehensive documentation, and automated pre-commit validation
---

[Docs](../README.md) / [Devlogs](./README.md) / UI and CSS Guardrails Implementation

# Context

As Cortex moved into Phase 0 implementation, we needed to establish a solid foundation for UI development. The project uses vanilla JSX with Tailwind CSS in an Electron renderer process, but lacked:

- Consistent design system and styling patterns
- Theme support (light/dark modes)
- Accessibility standards enforcement
- Component lifecycle patterns
- Automated validation to prevent style inconsistencies

Without guardrails, we risked accumulating technical debt through inconsistent styling, hardcoded values, and accessibility gaps that would be difficult to fix later. The goal was to establish patterns now that would make future UI development consistent and maintainable, while also enabling future user customization features.

# Problem

Several challenges needed addressing:

1. **No design system**: Colors, spacing, typography were ad-hoc with no centralized tokens
2. **No theme support**: No way to switch between light/dark modes or persist user preferences
3. **Accessibility gaps**: No systematic approach to ensuring WCAG AA compliance
4. **Inconsistent patterns**: Component styling varied without reusable patterns
5. **No validation**: Nothing preventing hardcoded colors, spacing, or accessibility violations
6. **Future customization**: Needed structure to enable user theming/customization later

The existing codebase had a `TestPanel` component using hardcoded Tailwind classes like `bg-gray-100` and `text-gray-800`, which wouldn't adapt to themes and violated the principle of using semantic design tokens.

# Solution

## Approach: Staged Implementation with Incremental Testing

Broke the work into 12 testable steps, allowing verification at each stage before proceeding:

### Phase 1: Foundation (Steps 1-3)

**Design Tokens Foundation**
- Created comprehensive CSS variable system in `main.css`:
  - Base colors (grayscale palette)
  - Accent colors (blue, reserved for explicit use)
  - Semantic colors (text, background, border, status)
  - Spacing scale (8px base unit)
  - Typography scale (font sizes, weights, line heights)
  - Border radius scale
  - Z-index scale
- Implemented light/dark theme switching via `[data-theme]` attribute
- Added system preference detection via `@media (prefers-color-scheme: dark)`

**Tailwind Integration**
- Extended `tailwind.config.js` to map all design tokens
- Configured responsive breakpoints (xs: 320px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Enabled semantic classes like `bg-bg-primary`, `text-text-primary`

**Component Base Classes**
- Created reusable component classes using `@layer components`:
  - Button variants: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-accent`
  - Input styles: `.input`, `.input-error`
  - Card/container: `.card`, `.card-padded`, `.container`, `.container-center`
  - Form elements: `.form-group`, `.form-label`, `.form-help`, `.form-error`
  - Status messages: `.status-info`, `.status-success`, `.status-error`, `.status-warning`

### Phase 2: Theme System (Step 4)

**Theme Management Utilities**
- Created `src/renderer/src/lib/theme.ts` with:
  - System preference detection
  - Theme switching (`setTheme`, `toggleTheme`)
  - Theme persistence via `localStorage`
  - `MutationObserver` to persist manual theme changes
  - System preference change listener
- Initialized theme on app load in `main.ts`
- Supports 'light', 'dark', and 'system' modes

### Phase 3: Component Update (Step 5)

**TestPanel Refactoring**
- Replaced hardcoded Tailwind classes with semantic design tokens
- Used component classes (`.btn-primary`, `.card-padded`, `.status-*`)
- Added responsive patterns
- Enhanced accessibility (ARIA labels, keyboard navigation, live regions)
- Verified theme adaptation

### Phase 4: Accessibility (Step 6)

**Accessibility Base Styles**
- Focus indicators using `:focus-visible` for all interactive elements
- Skip links for keyboard navigation
- Reduced motion support (respects `prefers-reduced-motion`)
- Verified WCAG AA contrast ratios:
  - `text-primary`: 19.56:1 ✓
  - `text-secondary`: 7.0:1 ✓
  - `text-tertiary`: 4.6:1 ✓

### Phase 5: Documentation (Steps 7-10)

Created comprehensive documentation:

- **Design Tokens** (`docs/development/design-tokens.md`): Complete reference for all CSS variables with usage examples
- **UI Guide** (`docs/development/ui-guide.md`): Component usage patterns, responsive design, composition examples
- **Accessibility** (`docs/development/accessibility.md`): A11y checklist, keyboard navigation, ARIA patterns, testing guidelines
- **Component Lifecycle** (`docs/development/component-lifecycle.md`): Initialization patterns, cleanup, event management, common pitfalls

### Phase 6: Automation (Step 11)

**Pre-Commit Validation**
- Installed `stylelint`, `stylelint-config-standard`, `stylelint-config-tailwindcss`, `lint-staged`
- Created `.stylelintrc.json` with Tailwind support
- Created validation scripts:
  - `scripts/validate-design-tokens.js`: Detects hardcoded colors/spacing
  - `scripts/validate-accessibility.js`: Checks for common A11y issues
- Integrated with lint-staged via `.lintstagedrc.json`
- Updated `.husky/pre-commit` to run all validations on staged files

## Style Philosophy: Monochromatic Aesthetic

Adopted a minimal, monochromatic design approach:

- **Color Philosophy**: Black and white by default, color only for explicit accents
- **Base Palette**: Pure grayscale for backgrounds, text, borders, focus states
- **Accent Usage**: Blue accent colors appear only for explicit variants (e.g., `.btn-accent`)
- **Focus States**: Grayscale focus rings (not accent colored)
- **Spacing**: Tighter, more compact spacing
- **Borders & Shadows**: Subtle, minimal elevation

This ensures a clean, professional appearance with clear visual hierarchy through contrast and spacing rather than color variation.

# Outcome

## Deliverables

1. **Complete Design Token System**
   - CSS variables for all design values
   - Light/dark theme support with system preference detection
   - Theme persistence across sessions

2. **Component Library**
   - Reusable component classes for buttons, inputs, cards, forms, status messages
   - All components use design tokens and adapt to themes
   - Consistent styling patterns throughout

3. **Accessibility Compliance**
   - WCAG AA contrast ratios verified
   - Focus indicators on all interactive elements
   - Keyboard navigation support
   - Screen reader compatibility
   - Reduced motion support

4. **Comprehensive Documentation**
   - Design tokens reference guide
   - UI component usage guide
   - Accessibility standards and patterns
   - Component lifecycle patterns

5. **Automated Validation**
   - Pre-commit hooks enforce design token usage
   - Accessibility checks catch common issues
   - CSS linting validates style conventions
   - All checks run automatically on every commit

## What Works Now

- **Theme System**: Smooth light/dark switching with persistence
- **Design Tokens**: All styling uses centralized tokens
- **Component Patterns**: Consistent, reusable component classes
- **Accessibility**: Base styles ensure A11y compliance
- **Validation**: Automated checks prevent violations
- **Documentation**: Clear guides for all patterns

## Technical Achievements

- **Zero Breaking Changes**: All existing components continue to work
- **Backward Compatible**: TestPanel updated without breaking functionality
- **Performance**: CSS variables provide efficient theme switching
- **Maintainability**: Centralized tokens make updates easy
- **Extensibility**: Structure supports future user customization

## Files Created/Modified

**New Files:**
- `docs/development/design-tokens.md`
- `docs/development/ui-guide.md`
- `docs/development/accessibility.md`
- `docs/development/component-lifecycle.md`
- `.stylelintrc.json`
- `.lintstagedrc.json`
- `scripts/validate-design-tokens.js`
- `scripts/validate-accessibility.js`

**Modified Files:**
- `src/renderer/src/main.css` (design tokens, component classes, accessibility styles)
- `tailwind.config.js` (design token integration)
- `src/renderer/src/lib/theme.ts` (new theme management utilities)
- `src/renderer/src/main.ts` (theme initialization)
- `src/renderer/src/components/TestPanel.tsx` (updated to use design tokens)
- `package.json` (added validation scripts and dependencies)
- `.husky/pre-commit` (integrated lint-staged)

# Notes

## Key Insights

1. **Staged Implementation Works**: Breaking into 12 testable steps allowed incremental verification and prevented issues from compounding.

2. **Design Tokens First**: Establishing the token system before building components ensured consistency from the start.

3. **Documentation is Critical**: Creating comprehensive docs alongside implementation ensures patterns are understood and followed.

4. **Automation Prevents Drift**: Pre-commit validation catches violations before they enter the codebase, maintaining quality over time.

5. **Monochromatic Aesthetic**: The black/white default with color accents creates a clean, professional look while maintaining flexibility.

## Challenges Overcome

1. **Tailwind @apply Limitations**: Initially tried using `@apply` with custom nested color classes, but Tailwind doesn't resolve them properly. Solution: Use direct CSS properties with `var()` for colors, keep `@apply` for standard utilities.

2. **Theme Persistence**: Manual `data-theme` changes weren't persisting. Solution: Added `MutationObserver` to detect and save manual changes.

3. **Stylelint Strictness**: Default rules conflicted with our design token formatting. Solution: Relaxed formatting rules while keeping important validation.

4. **Validation Script Accuracy**: Initial design token validation had false positives. Solution: Refined patterns to only catch actual violations in CSS properties, not comments or strings.

## Tradeoffs Made

**Chose:**
- CSS variables over Sass/SCSS (simpler, native browser support)
- Component classes over pure utility classes (better consistency)
- Grayscale focus states over accent colors (maintains monochromatic aesthetic)
- Automated validation over manual reviews (catches issues early)
- Comprehensive documentation over minimal notes (ensures long-term maintainability)

**Did Not Choose:**
- CSS-in-JS (vanilla CSS with variables is simpler)
- Complex theme system (simple light/dark is sufficient for now)
- Design system library (custom solution fits our needs)
- Strict stylelint rules (relaxed for our formatting preferences)

## Future Considerations

1. **User Customization**: Design token structure supports future user theming. Could add:
   - Custom color palette selection
   - Spacing preference adjustments
   - Font family customization

2. **Additional Validation**: Could enhance validation scripts:
   - Automated contrast ratio checking
   - Visual regression testing
   - Component pattern validation

3. **Component Library**: Could create a visual component library page showing all variants and usage examples.

4. **Theme Variants**: Could add additional theme variants (e.g., high contrast, reduced motion) beyond light/dark.

5. **Design Token Expansion**: Could add more semantic tokens as patterns emerge (e.g., elevation, animation timing).

## Gotchas to Remember

- **CSS Variables in Tailwind**: Use `var(--token-name)` directly, not through `theme()` function in component classes
- **Theme Initialization**: Must call `initTheme()` before components render to ensure correct initial theme
- **MutationObserver**: Needed to persist manual theme changes made via DevTools
- **Stylelint Config**: Relaxed formatting rules to match our design token formatting style
- **Validation Scripts**: Only check actual CSS properties, not comments or string literals

## Related Resources

- [Design Tokens Documentation](../development/design-tokens.md)
- [UI Guide](../development/ui-guide.md)
- [Accessibility Guide](../development/accessibility.md)
- [Component Lifecycle Guide](../development/component-lifecycle.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Stylelint Documentation](https://stylelint.io/)
