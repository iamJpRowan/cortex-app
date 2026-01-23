[Docs](../README.md) / [Design](./README.md) / Design Tokens

# Design Tokens

Design tokens are CSS custom properties (variables) that define the visual foundation of the Cortex UI. They provide a consistent, themeable system for colors, spacing, typography, and other design values.

## Overview

All design tokens are defined in `src/renderer/src/main.css` and are organized into:
- **Base tokens**: Theme-agnostic values (spacing, typography, radius, z-index)
- **Theme tokens**: Theme-specific values (colors) that change based on light/dark mode

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

## Spacing Scale

8px base unit system:

```css
--space-0:  0          /* 0px */
--space-1:  0.25rem    /* 4px */
--space-2:  0.5rem     /* 8px */
--space-3:  0.75rem    /* 12px */
--space-4:  1rem       /* 16px */
--space-5:  1.25rem    /* 20px */
--space-6:  1.5rem     /* 24px */
--space-8:  2rem       /* 32px */
--space-10: 2.5rem     /* 40px */
--space-12: 3rem      /* 48px */
--space-16: 4rem       /* 64px */
--space-20: 5rem       /* 80px */
--space-24: 6rem       /* 96px */
```

**Usage in Tailwind:**
- Use standard Tailwind spacing classes: `p-4`, `m-6`, `gap-8`
- These map to the spacing scale automatically

## Typography Scale

### Font Sizes

```css
--font-size-xs:    0.75rem    /* 12px */
--font-size-sm:    0.875rem   /* 14px */
--font-size-base:  1rem       /* 16px */
--font-size-lg:    1.125rem    /* 18px */
--font-size-xl:    1.25rem     /* 20px */
--font-size-2xl:   1.5rem      /* 24px */
--font-size-3xl:   1.875rem    /* 30px */
--font-size-4xl:   2.25rem     /* 36px */
--font-size-5xl:   3rem        /* 48px */
```

### Font Weights

```css
--font-weight-normal:   400
--font-weight-medium:   500
--font-weight-semibold: 600
--font-weight-bold:     700
```

### Line Heights

```css
--line-height-tight:   1.25
--line-height-normal:  1.5
--line-height-relaxed: 1.75
```

## Border Radius Scale

```css
--radius-none:  0
--radius-sm:    0.125rem   /* 2px */
--radius-base:  0.375rem   /* 6px */
--radius-md:    0.5rem     /* 8px */
--radius-lg:    0.5rem     /* 8px */
--radius-xl:    0.75rem    /* 12px */
--radius-2xl:   1rem      /* 16px */
--radius-full:  9999px
```

**Common Usage:**
- Buttons, inputs: `--radius-md` (8px)
- Cards: `--radius-lg` (8px)
- Small elements: `--radius-base` (6px)

## Z-Index Scale

```css
--z-0:    0
--z-10:   10
--z-20:   20
--z-30:   30
--z-40:   40
--z-50:   50
--z-auto: auto
```

**Usage Guidelines:**
- `z-10`: Dropdowns, tooltips
- `z-20`: Sticky headers
- `z-30`: Modals, overlays
- `z-40`: Popovers
- `z-50`: Skip links, highest priority

## Transition Tokens

### Transition Durations

```css
--transition-duration-fast:   150ms  /* Quick interactions, hover states */
--transition-duration-base:   200ms  /* Default transitions */
--transition-duration-normal: 300ms  /* Smooth animations, layout changes */
--transition-duration-slow:    500ms  /* Complex animations, page transitions */
```

### Transition Easing Functions

```css
--transition-easing-ease:        ease                    /* Default easing */
--transition-easing-smooth:      cubic-bezier(0.4, 0, 0.2, 1)  /* Smooth, natural feel */
--transition-easing-ease-in:     ease-in                 /* Slow start */
--transition-easing-ease-out:     ease-out                /* Slow end */
--transition-easing-ease-in-out:  ease-in-out             /* Slow start and end */
```

### Transition Shorthands

Pre-configured combinations for common use cases:

```css
--transition-base:   var(--transition-duration-base) var(--transition-easing-ease)
--transition-smooth: var(--transition-duration-normal) var(--transition-easing-smooth)
--transition-fast:   var(--transition-duration-fast) var(--transition-easing-ease)
--transition-slow:   var(--transition-duration-slow) var(--transition-easing-ease)
```

**Usage Guidelines:**
- `--transition-base`: Default transitions (colors, backgrounds)
- `--transition-smooth`: Layout changes, width/height animations (sidebar, panels)
- `--transition-fast`: Hover states, quick feedback
- `--transition-slow`: Complex animations, page transitions

**Example Usage:**
```css
/* Single property */
.my-element {
  transition: width var(--transition-smooth);
}

/* Multiple properties */
.my-element {
  transition: background-color var(--transition-base), color var(--transition-base);
}

/* Using shorthand */
.sidebar {
  transition: width var(--transition-smooth);
}
```

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

### In Component Classes

Component classes automatically use design tokens:

```tsx
<button className="btn-primary">Click me</button>
<div className="card-padded">Card content</div>
<input className="input" />
```

## Theme System

Design tokens automatically adapt to light/dark themes via the `data-theme` attribute on `<html>`:

- `data-theme="light"` → Light theme colors
- `data-theme="dark"` → Dark theme colors
- No attribute → Follows system preference

See [Theme System](../backlog/ui-css-guardrails.md#theme-system) for details on theme management.

## Best Practices

1. **Always use semantic tokens** - Use `--color-text-primary` instead of `--color-base-950`
2. **Never hardcode values** - Always reference design tokens
3. **Use Tailwind classes when possible** - They automatically use tokens
4. **Reserve accent colors** - Only use for explicit accent variants
5. **Maintain monochromatic aesthetic** - Use grayscale for default styling

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
