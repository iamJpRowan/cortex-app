[Docs](../README.md) / [Design](./README.md) / UI Guide

# UI Guide

This guide covers component usage patterns, styling conventions, and best practices for creating UI components in Cortex.

## Component Classes

All component classes are defined in `src/renderer/src/main.css` using Tailwind's `@layer components`. They use design tokens and automatically adapt to light/dark themes.

### Buttons

#### `.btn-primary` (Default)
Neutral black/white button with subtle border:

```tsx
<button className="btn-primary">Primary Action</button>
```

**Use for:** Default button actions, most common use case.

#### `.btn-accent`
Colored button for explicit emphasis:

```tsx
<button className="btn-accent">Important Action</button>
```

**Use for:** Very specific cases where color emphasis is intentionally required.

#### `.btn-secondary`
Secondary button with border:

```tsx
<button className="btn-secondary">Secondary Action</button>
```

**Use for:** Secondary actions, cancel buttons.

#### `.btn-danger`
Danger/error button:

```tsx
<button className="btn-danger">Delete</button>
```

**Use for:** Destructive actions (delete, remove, etc.).

#### `.btn-ghost`
Ghost button with transparent background:

```tsx
<button className="btn-ghost">Ghost Action</button>
```

**Use for:** Tertiary actions, less prominent buttons.

### Inputs

#### `.input`
Standard input field:

```tsx
<input type="text" className="input" placeholder="Enter text" />
```

**Features:**
- Full width by default
- Subtle border
- Grayscale focus ring
- Disabled state support

#### `.input-error`
Input with error styling:

```tsx
<input type="text" className="input-error" />
```

**Use for:** Form validation errors.

### Cards

#### `.card`
Base card container:

```tsx
<div className="card">
  Card content
</div>
```

#### `.card-padded`
Card with padding:

```tsx
<div className="card-padded">
  Padded card content
</div>
```

**Use for:** Most card use cases.

### Containers

#### `.container`
Max-width container:

```tsx
<div className="container">
  Content
</div>
```

#### `.container-center`
Centered container:

```tsx
<div className="container-center">
  Centered content
</div>
```

### Form Elements

#### `.form-group`
Form field group:

```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="input" />
  <p className="form-help">Help text</p>
</div>
```

#### `.form-label`
Form label:

```tsx
<label className="form-label">Field Label</label>
```

#### `.form-help`
Help text:

```tsx
<p className="form-help">Additional information</p>
```

#### `.form-error`
Error message:

```tsx
<p className="form-error">Error message</p>
```

### Status Messages

#### `.status-info`
Info message:

```tsx
<div className="status-info">
  Information message
</div>
```

#### `.status-success`
Success message:

```tsx
<div className="status-success">
  Success message
</div>
```

#### `.status-error`
Error message:

```tsx
<div className="status-error">
  Error message
</div>
```

#### `.status-warning`
Warning message:

```tsx
<div className="status-warning">
  Warning message
</div>
```

## Responsive Design Patterns

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
<div className="p-4 sm:p-8">
  {/* 16px padding on mobile, 32px on tablet+ */}
</div>
```

### Breakpoints

- `xs`: 320px (default, no prefix)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Common Patterns

#### Responsive Padding

```tsx
<div className="p-4 sm:p-6 md:p-8">
  Content
</div>
```

#### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  Items
</div>
```

#### Responsive Text

```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
  Responsive Heading
</h1>
```

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

### Use Design Tokens

✅ **Do:**
```tsx
<div className="bg-bg-primary text-text-primary">
```

❌ **Don't:**
```tsx
<div className="bg-white text-black">
```

### Use Component Classes

✅ **Do:**
```tsx
<button className="btn-primary">Click</button>
```

❌ **Don't:**
```tsx
<button className="px-4 py-2 bg-white border rounded-md">Click</button>
```

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

### 1. Always Use Component Classes

Prefer component classes over inline Tailwind utilities for consistency.

### 2. Use Semantic Color Tokens

Use `text-text-primary` instead of `text-base-950` for better theme support.

### 3. Responsive by Default

Always consider mobile-first responsive design.

### 4. Maintain Accessibility

- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain focus indicators

### 5. Theme Support

All components automatically support light/dark themes via design tokens.

## Creating New Components

When creating a new component:

1. **Use existing component classes** when possible
2. **Use design tokens** for any custom styling
3. **Follow responsive patterns** (mobile-first)
4. **Include accessibility features** (ARIA, keyboard nav)
5. **Test in both themes** (light and dark)
6. **Document usage** in component comments

### Example: New Component

```tsx
/**
 * MyComponent
 * 
 * A custom component that demonstrates proper patterns.
 * 
 * @returns {HTMLElement} The component element
 */
export function MyComponent(): HTMLElement {
  return (
    <div className="card-padded">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">
        Component Title
      </h2>
      <p className="text-text-secondary mb-6">
        Component description
      </p>
      <button className="btn-primary">Action</button>
    </div>
  ) as HTMLElement
}
```

## Common Patterns

### Centered Content

```tsx
<div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4 sm:p-8">
  <div className="container card-padded">
    Content
  </div>
</div>
```

### Flex Layouts

```tsx
<div className="flex gap-4">
  <button className="btn-primary flex-1">Primary</button>
  <button className="btn-secondary flex-1">Secondary</button>
</div>
```

### Grid Layouts

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div className="card-padded" key={item.id}>
      {item.content}
    </div>
  ))}
</div>
```

## Layout Components

### Using the Layout Component

The `Layout` component provides the main application structure with collapsible sidebars and center content area:

```tsx
import { Layout } from './components/Layout'
import { MyView } from './views/MyView'

export function App(): HTMLElement {
  return Layout({ view: MyView })
}
```

### Creating Views

Views are components that render in the center area of the layout:

```tsx
/**
 * MyView
 * 
 * A custom view component that displays in the center area.
 * 
 * @returns {HTMLElement} The view element
 */
export function MyView(): HTMLElement {
  return (
    <div className="card-padded">
      <h1 className="text-2xl font-bold mb-4 text-text-primary">
        My View Title
      </h1>
      <p className="text-text-secondary">
        View content goes here
      </p>
    </div>
  ) as HTMLElement
}
```

**View Guidelines:**
- Views should be self-contained components
- Use design tokens for styling
- Follow accessibility guidelines
- Views are rendered in the center area automatically

### Sidebar Structure

The left sidebar is managed by the `Layout` component and includes:
- Collapsible toggle button
- Navigation area (ready for navigation items)
- Icon-only mode when collapsed (48px width)
- Expanded mode (250px width)

## See Also

- [Design Tokens](./design-tokens.md) - Complete design token reference
- [Accessibility](./accessibility.md) - Accessibility guidelines
- [Terminology](./terminology.md) - UI terminology and naming conventions
- [Component Lifecycle](../development/component-lifecycle.md) - Component patterns
