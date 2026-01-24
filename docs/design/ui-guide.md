[Docs](../README.md) / [Design](./README.md) / UI Guide

# UI Guide

This guide covers component usage patterns, styling conventions, and best practices for creating UI components in Cortex.

## Component Library

Cortex uses **[shadcn/ui](https://ui.shadcn.com/docs)** as its component library. shadcn/ui provides copy-paste React components built with Radix UI primitives and styled with Tailwind CSS.

### Using shadcn/ui Components

All components are installed via the shadcn CLI and live in `src/renderer/src/components/ui/`. Components automatically use design tokens and adapt to light/dark themes.

**Example:**
```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost Action</Button>

<Card className="p-4">
  Card content
</Card>

<Input placeholder="Enter text" />
```

**See [shadcn/ui documentation](https://ui.shadcn.com/docs) for:**
- Available components
- Component variants and props
- Installation instructions
- Customization patterns

## Responsive Design Patterns

Follow [Tailwind CSS responsive design patterns](https://tailwindcss.com/docs/responsive-design). Cortex uses a mobile-first approach.

### Breakpoints

- `xs`: 320px (default, no prefix)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Common Patterns

See [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) for patterns including:
- Responsive padding (`p-4 sm:p-8`)
- Responsive grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Responsive typography (`text-2xl sm:text-3xl lg:text-4xl`)

## Component Composition

### Example: Form with Validation

```tsx
function MyForm(): HTMLElement {
  return (
    <div className="card-padded">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Form Title</h2>
      
      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          placeholder="you@example.com"
        />
        <p className="form-help">We'll never share your email</p>
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="input-error"
        />
        <p className="form-error">Password is required</p>
      </div>
      
      <div className="flex gap-4 mt-6">
        <button className="btn-primary flex-1">Submit</button>
        <button className="btn-secondary flex-1">Cancel</button>
      </div>
    </div>
  ) as HTMLElement
}
```

### Example: Card Layout

```tsx
function CardLayout(): HTMLElement {
  return (
    <div className="min-h-screen bg-bg-secondary p-4 sm:p-8">
      <div className="container-center">
        <div className="card-padded">
          <h1 className="text-3xl font-bold mb-2 text-text-primary">Title</h1>
          <p className="text-text-secondary mb-6">Description</p>
          
          <div className="status-info mb-4">
            Status message
          </div>
          
          <button className="btn-primary w-full">
            Action
          </button>
        </div>
      </div>
    </div>
  ) as HTMLElement
}
```

## Styling Conventions

### Use Design Tokens for Colors

✅ **Do:**
```tsx
<div className="bg-bg-primary text-text-primary">
```

❌ **Don't:**
```tsx
<div className="bg-white text-black">
```

### Use shadcn/ui Components

✅ **Do:**
```tsx
import { Button } from "@/components/ui/button"
<Button variant="default">Click</Button>
```

❌ **Don't:**
```tsx
<button className="px-4 py-2 bg-white border rounded-md">Click</button>
```

### Use Tailwind Utilities for Spacing/Typography

✅ **Do:**
```tsx
<div className="p-4 text-sm">
```

❌ **Don't:**
```tsx
<div style={{ padding: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
```

See [Tailwind CSS documentation](https://tailwindcss.com/docs) for all available utilities.

### Maintain Monochromatic Aesthetic

✅ **Do:**
```tsx
<div className="bg-bg-primary border border-border-primary">
```

❌ **Don't:**
```tsx
<div className="bg-blue-500 border-blue-600">
```

### Use Semantic Colors

✅ **Do:**
```tsx
<p className="text-text-secondary">Secondary text</p>
```

❌ **Don't:**
```tsx
<p className="text-gray-600">Secondary text</p>
```

## Best Practices

### 1. Use shadcn/ui Components

Prefer shadcn/ui components over custom implementations. They provide accessibility, theming, and consistent styling out of the box.

### 2. Use Semantic Color Tokens

Use `text-text-primary` instead of `text-base-950` for better theme support.

### 3. Use Tailwind Utilities Directly

For spacing, typography, transitions, etc., use Tailwind utilities directly (`p-4`, `text-sm`, `duration-300`). See [Tailwind CSS documentation](https://tailwindcss.com/docs).

### 4. Responsive by Default

Always consider mobile-first responsive design. See [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design).

### 5. Maintain Accessibility

- Use semantic HTML
- shadcn/ui components include accessibility features (ARIA, keyboard navigation)
- Ensure custom components follow [WCAG AA standards](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&levels=aaa)

### 6. Theme Support

All components automatically support light/dark themes via design tokens.

## Creating New Components

When creating a new component:

1. **Use shadcn/ui components** when possible (check if a component exists first)
2. **Use design tokens** for color styling
3. **Use Tailwind utilities** for spacing, typography, transitions
4. **Follow responsive patterns** (mobile-first)
5. **Include accessibility features** (ARIA, keyboard nav)
6. **Test in both themes** (light and dark)
7. **Document usage** in component comments

### Example: React Component

```tsx
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * MyComponent
 * 
 * A custom component that demonstrates proper patterns.
 */
export function MyComponent() {
  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">
        Component Title
      </h2>
      <p className="text-text-secondary mb-6">
        Component description
      </p>
      <Button variant="default">Action</Button>
    </Card>
  )
}
```

## Common Patterns

See [Tailwind CSS documentation](https://tailwindcss.com/docs) for common patterns including:
- [Flexbox layouts](https://tailwindcss.com/docs/flex)
- [Grid layouts](https://tailwindcss.com/docs/grid-template-columns)
- [Centering content](https://tailwindcss.com/docs/justify-content)
- [Spacing utilities](https://tailwindcss.com/docs/padding)

## Layout Components

See [Terminology](./terminology.md) for layout structure definitions (Sidebars, Panels, Views, Components, Widgets).

Layout components are built with React and shadcn/ui. See the layout implementation in `src/renderer/src/components/` for examples.

## See Also

- [Design Tokens](./design-tokens.md) - Color token reference
- [Accessibility](./accessibility.md) - Accessibility guidelines
- [Terminology](./terminology.md) - UI terminology and naming conventions
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) - Component library reference
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility classes reference
