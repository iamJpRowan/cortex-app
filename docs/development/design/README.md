[Docs](../../README.md) / [Development](../README.md) / Design

# Design Documentation

This directory contains the **visual and UI design system** for Cortex: design tokens, component patterns, accessibility, and terminology. For **product direction** (roadmap, future functionality, product concepts), see [Product](../../product/README.md).

## Documentation

- **[terminology.md](./terminology.md)** - UI terminology and naming conventions
- **[design-tokens.md](./design-tokens.md)** - Design token system (color tokens only; spacing/typography use Tailwind)
- **[ui-guide.md](./ui-guide.md)** - Component usage patterns and styling conventions
- **[app-components.md](./app-components.md)** - App components and UI consistency (primitives vs app components; consistency → intuitiveness)
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

- **Primitives** (`components/ui/`, `components/ai-elements/`) - shadcn and AI Elements; use as the foundation.
- **App components** (`src/renderer/src/components/` excluding `ui/` and `ai-elements/`) - Cortex-specific patterns; reuse so the same actions and concepts look and behave the same everywhere (see [App Components](./app-components.md)).
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

- [Product](../../product/README.md) — Product direction and roadmap
- [Development Guide](../README.md) — Development patterns and workflows
- [Architecture](../architecture/README.md) — System architecture and technical decisions
