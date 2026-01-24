[Docs](../README.md) / Design

# Design Documentation

This directory contains design system documentation, UI patterns, and visual guidelines for Cortex.

## Documentation

- **[terminology.md](./terminology.md)** - UI terminology and naming conventions
- **[design-tokens.md](./design-tokens.md)** - Design token system (color tokens only; spacing/typography use Tailwind)
- **[ui-guide.md](./ui-guide.md)** - Component usage patterns and styling conventions
- **[accessibility.md](./accessibility.md)** - Accessibility standards and patterns

## Design Principles

Cortex follows a **monochromatic aesthetic** with:
- Grayscale color palette as the foundation
- Accent colors used only for explicit emphasis
- Design tokens for consistent theming
- WCAG AA accessibility compliance
- Light/dark theme support

## Quick Reference

### Component Organization

- **Components** (`src/renderer/src/components/`) - Reusable UI building blocks
- **Panels** (`src/renderer/src/panels/`) - Distinct UI regions within sidebars or the main area
- **Views** (`src/renderer/src/views/`) - Content displayed in tabs/main area
- **Widgets** (`src/renderer/src/widgets/`) - Draggable, composable UI elements

### Styling

- Use **design tokens** for colors (see [Design Tokens](./design-tokens.md))
- Use **shadcn/ui components** for UI elements (see [shadcn/ui docs](https://ui.shadcn.com/docs))
- Use **Tailwind CSS utilities** for spacing, typography, transitions (see [Tailwind docs](https://tailwindcss.com/docs))
- Follow **responsive patterns** (mobile-first approach)
- Maintain **accessibility** standards (WCAG AA minimum)

## See Also

- [Development Guide](../development/README.md) - Development patterns and workflows
- [Architecture](../architecture/README.md) - System architecture and technical decisions
