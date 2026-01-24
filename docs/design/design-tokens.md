[Docs](../README.md) / [Design](./README.md) / Design Tokens

# Design Tokens

Design tokens are CSS custom properties (variables) that define the visual foundation of the Cortex UI. They provide a consistent, themeable system for colors and enable user customization.

## Overview

**Simplified Approach**: We use **color tokens only**. For spacing, typography, transitions, border radius, and z-index, we use [Tailwind CSS's built-in utilities](https://tailwindcss.com/docs) directly.

All design tokens are defined in `src/renderer/src/main.css` and are organized into:
- **Color tokens**: Theme-specific values that change based on light/dark mode
- **shadcn/ui mapping**: shadcn's expected token names mapped to our semantic tokens

## Color Tokens

### Base Colors

Pure grayscale palette for monochromatic aesthetic:

```css
--color-base-50   /* Lightest gray */
--color-base-100
--color-base-200
--color-base-300
--color-base-400
--color-base-500  /* Mid gray */
--color-base-600
--color-base-700
--color-base-800
--color-base-900
--color-base-950  /* Darkest gray */
```

**Light Theme Values:**
- `--color-base-50`: `#fafafa` (lightest)
- `--color-base-950`: `#0a0a0a` (darkest)

**Dark Theme Values:**
- `--color-base-50`: `#0a0a0a` (darkest)
- `--color-base-950`: `#fafafa` (lightest)

### Accent Colors

Blue accent colors used only for explicit accent purposes:

```css
--color-accent-50   /* Lightest blue */
--color-accent-100
--color-accent-200
--color-accent-300
--color-accent-400
--color-accent-500  /* Primary accent */
--color-accent-600
--color-accent-700
--color-accent-800
--color-accent-900
--color-accent-950  /* Darkest blue */
```

**Usage:** Only use accent colors for explicit accent variants (e.g., `.btn-accent`) or very specific emphasis cases.

### Semantic Colors - Text

```css
--color-text-primary    /* Main text color (near black/white) */
--color-text-secondary  /* Secondary text (medium gray) */
--color-text-tertiary   /* Tertiary text (lighter gray) */
--color-text-inverse    /* Inverse text (white/black) */
--color-text-disabled   /* Disabled text (light gray) */
```

**Contrast Ratios (WCAG AA compliant):**
- `text-primary`: 19.56:1 ✓
- `text-secondary`: 7.0:1 ✓
- `text-tertiary`: 4.6:1 ✓

### Semantic Colors - Background

```css
--color-bg-primary    /* Main background (white/black) */
--color-bg-secondary  /* Secondary background (light gray) */
--color-bg-tertiary   /* Tertiary background (slightly darker gray) */
--color-bg-inverse    /* Inverse background (black/white) */
--color-bg-disabled   /* Disabled background */
```

### Semantic Colors - Border

```css
--color-border-primary    /* Default border (subtle gray) */
--color-border-secondary  /* Secondary border */
--color-border-focus      /* Focus state border (grayscale) */
--color-border-error      /* Error border (grayscale) */
--color-border-success    /* Success border (grayscale) */
--color-border-warning    /* Warning border (grayscale) */
```

**Note:** All borders use grayscale values to maintain monochromatic aesthetic. Focus states are grayscale, not accent colored.

### Semantic Colors - Status

Status colors use grayscale values (monochromatic approach):

```css
--color-success-50, --color-success-100, --color-success-500, --color-success-600, --color-success-700
--color-error-50, --color-error-100, --color-error-500, --color-error-600, --color-error-700
--color-warning-50, --color-warning-100, --color-warning-500, --color-warning-600, --color-warning-700
--color-info-50, --color-info-100, --color-info-500, --color-info-600, --color-info-700
```

## Spacing, Typography, Transitions, and More

**Use Tailwind CSS utilities directly** instead of custom tokens:

- **Spacing**: Use Tailwind's spacing scale (`p-4`, `m-6`, `gap-8`, etc.) - See [Tailwind Spacing](https://tailwindcss.com/docs/padding)
- **Typography**: Use Tailwind's typography utilities (`text-sm`, `text-xl`, `font-medium`, etc.) - See [Tailwind Typography](https://tailwindcss.com/docs/font-size)
- **Border Radius**: Use Tailwind's radius utilities (`rounded-md`, `rounded-lg`, etc.) - See [Tailwind Border Radius](https://tailwindcss.com/docs/border-radius)
- **Transitions**: Use Tailwind's transition utilities (`duration-300`, `ease-in-out`, etc.) - See [Tailwind Transitions](https://tailwindcss.com/docs/transition-duration)
- **Z-Index**: Use Tailwind's z-index utilities (`z-10`, `z-30`, etc.) - See [Tailwind Z-Index](https://tailwindcss.com/docs/z-index)

**Rationale**: Tailwind provides these scales out of the box. Custom tokens add complexity without clear benefit unless user customization is needed.

## Focus Tokens

### Focus Background Color

```css
--color-bg-focus: var(--color-base-300)
```

**Usage:**
- Unified background-based focus indicator for all interactive elements
- Applied automatically to buttons, inputs, links, and all focusable elements
- Provides sufficient contrast (3:1+) to meet WCAG 2.4.11 (Focus Visible)
- Modern, clean aesthetic matching Cursor/Obsidian/Arc patterns

**Light Theme:**
- `--color-bg-focus`: `#d4d4d4` (base-300)

**Dark Theme:**
- `--color-bg-focus`: `#404040` (base-300)

**Design Philosophy:**
- **Unified approach**: All interactive elements use the same focus pattern (background color change)
- **No outlines/rings**: Clean, minimal focus indicators that don't take extra space
- **No clipping**: Background-based focus works in constrained spaces (collapsed sidebars, etc.)
- **Consistent**: Same pattern across buttons, inputs, links, and all focusable elements

**Example Usage:**
```css
/* Automatically applied to all interactive elements */
button:focus-visible,
input:focus-visible,
a:focus-visible {
  background-color: var(--color-bg-focus);
  outline: none;
}
```

**Note:** This replaces the old outline/ring-based focus indicators. All components now use this unified background-based approach.

## Icon Tokens

### Icon Stroke Width

```css
--icon-stroke-width: 1.5
```

**Usage:**
- Default stroke width for all icons (1.5px)
- Applied globally via CSS to all icons with `.icon` class
- Can be overridden per-container or per-icon via CSS

**Example Usage:**
```css
/* Icons automatically get stroke-width from token */
.icon {
  stroke-width: var(--icon-stroke-width);
}

/* Override for specific container */
.bold-icons .icon {
  stroke-width: 2;
}

/* Override for specific icon */
.icon.thin {
  stroke-width: 1;
}
```

## Usage Examples

### In CSS

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-primary);
  transition: background-color var(--transition-base), color var(--transition-base);
}
```

### In Tailwind Classes

```tsx
<div className="bg-bg-primary text-text-primary p-4 rounded-md border border-border-primary">
  Content
</div>
```

### In shadcn/ui Components

shadcn/ui components use design tokens automatically via the token mapping:

```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

<Button variant="primary">Click me</Button>
<Card className="p-4">Card content</Card>
```

See [shadcn/ui documentation](https://ui.shadcn.com/docs) for component usage.

## Theme System

Design tokens automatically adapt to light/dark themes via the `data-theme` attribute on `<html>`:

- `data-theme="light"` → Light theme colors
- `data-theme="dark"` → Dark theme colors
- No attribute → Follows system preference

See [Theme System](../backlog/ui-css-guardrails.md#theme-system) for details on theme management.

## Best Practices

1. **Always use semantic color tokens** - Use `--color-text-primary` instead of `--color-base-950`
2. **Never hardcode color values** - Always reference design tokens
3. **Use Tailwind utilities for spacing/typography** - Use `p-4`, `text-sm`, `duration-300`, etc. directly
4. **Use shadcn/ui components** - Pre-built components that use design tokens automatically
5. **Reserve accent colors** - Only use for explicit accent variants
6. **Maintain monochromatic aesthetic** - Use grayscale for default styling

## Extending Tokens

To add new tokens:

1. Add to `:root` for theme-agnostic values
2. Add to both light and dark theme sections for theme-specific values
3. Update `tailwind.config.js` if needed for Tailwind integration
4. Document in this file

## See Also

- [UI Guide](./ui-guide.md) - Component usage patterns
- [Terminology](./terminology.md) - UI terminology and naming conventions
- [Accessibility](./accessibility.md) - Accessibility patterns
