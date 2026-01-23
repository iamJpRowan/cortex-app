[Docs](../README.md) / [Design](./README.md) / Accessibility

# Accessibility Guide

This guide covers accessibility standards, patterns, and best practices for Cortex UI components. All components must meet WCAG AA compliance minimum.

## Standards

- **WCAG AA Compliance**: Minimum 4.5:1 contrast ratio for text
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Screen Reader Support**: Semantic HTML and ARIA labels where appropriate
- **Focus Management**: Visible focus indicators on all focusable elements
- **Reduced Motion**: Respect `prefers-reduced-motion` preference

## Accessibility Checklist

### Color and Contrast

- **Text contrast**: All text meets 4.5:1 minimum ratio
  - `text-primary`: 19.56:1 ✓
  - `text-secondary`: 7.0:1 ✓
  - `text-tertiary`: 4.6:1 ✓
- **Focus indicators**: Visible and meet contrast requirements
- **Color not sole indicator**: Don't rely on color alone to convey information

### Keyboard Navigation

- **All interactive elements** are keyboard accessible
- **Tab order** is logical and intuitive
- **Focus indicators** are visible on all focusable elements
- **Skip links** available for keyboard users
- **Keyboard shortcuts** work as expected (Enter, Space, Escape, etc.)

### Semantic HTML

- **Use semantic elements**: `<button>`, `<nav>`, `<main>`, `<article>`, etc.
- **Headings hierarchy**: Proper h1 → h2 → h3 structure
- **Form labels**: All inputs have associated labels
- **Landmarks**: Use ARIA landmarks or semantic HTML5 elements

### ARIA Labels

- **Interactive elements without visible labels** have `aria-label`
- **Status messages** use `role="status"` and `aria-live`
- **Error messages** are associated with form fields
- **Loading states** are announced to screen readers

### Focus Management

- **Focus indicators** visible on all focusable elements
- **Focus order** follows visual order
- **Focus trap** in modals/dialogs
- **Focus restoration** after closing modals

## Common Patterns

### Buttons

```tsx
// ✅ Good: Semantic button with ARIA label
<button
  className="btn-primary"
  aria-label="Save document"
  onClick={handleSave}
>
  Save
</button>

// ✅ Good: Icon button with descriptive label
<button
  className="btn-ghost"
  aria-label="Close dialog"
  onClick={handleClose}
>
  ×
</button>
```

### Form Inputs

```tsx
// ✅ Good: Labeled input with error message
<div className="form-group">
  <label htmlFor="email" className="form-label">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    className="input"
    aria-describedby="email-error"
    aria-invalid={hasError}
  />
  {hasError && (
    <p id="email-error" className="form-error" role="alert">
      Please enter a valid email address
    </p>
  )}
</div>
```

### Status Messages

```tsx
// ✅ Good: Status message with ARIA live region
<div
  className="status-success"
  role="status"
  aria-live="polite"
>
  Changes saved successfully
</div>

// ✅ Good: Error message with alert role
<div
  className="status-error"
  role="alert"
  aria-live="assertive"
>
  Failed to save changes
</div>
```

### Keyboard Navigation

```tsx
// ✅ Good: Keyboard event handler
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
}

<button
  className="btn-primary"
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Submit
</button>
```

### Skip Links

```tsx
// ✅ Good: Skip link for keyboard navigation
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content">
  Main content here
</main>
```

## Testing Guidelines

### Keyboard Testing

1. **Tab through the page** - Verify all interactive elements are reachable
2. **Check focus indicators** - Ensure they're visible and clear
3. **Test keyboard shortcuts** - Enter, Space, Escape work as expected
4. **Verify skip links** - Skip links appear and function correctly

### Screen Reader Testing

1. **Use screen reader** (VoiceOver, NVDA, JAWS)
2. **Navigate with keyboard** - Ensure all content is announced
3. **Check ARIA labels** - Verify labels are descriptive and helpful
4. **Test status messages** - Ensure they're announced appropriately

### Contrast Testing

1. **Use browser dev tools** - Check contrast ratios
2. **Test in both themes** - Light and dark modes
3. **Verify all text** - Primary, secondary, tertiary text
4. **Check focus indicators** - Ensure they meet contrast requirements

### Reduced Motion Testing

1. **Enable reduced motion** in OS settings
2. **Verify animations** are minimal or disabled
3. **Check transitions** respect the preference
4. **Test scrolling** behavior

## Common Pitfalls

### ❌ Don't: Rely on Color Alone

```tsx
// Bad: Color is the only indicator
<div className="text-red-500">Error</div>

// Good: Include text or icon
<div className="status-error">
  <span aria-label="Error">✗</span> Error: Invalid input
</div>
```

### ❌ Don't: Missing Labels

```tsx
// Bad: No label
<input type="text" className="input" />

// Good: Proper label
<label htmlFor="name" className="form-label">Name</label>
<input id="name" type="text" className="input" />
```

### ❌ Don't: Invisible Focus

```tsx
// Bad: Focus outline removed
button:focus {
  outline: none;
}

// Good: Visible focus indicator (already in base styles)
*:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

### ❌ Don't: Poor Contrast

```tsx
// Bad: Low contrast
<div className="text-gray-400 bg-gray-300">Text</div>

// Good: Use semantic tokens (meet contrast requirements)
<div className="text-text-primary bg-bg-primary">Text</div>
```

## Focus Management

### Focus Indicators

All focusable elements automatically get focus indicators via `:focus-visible` using a modern, background-based approach

```css
/* Unified background-based focus for all interactive elements */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  background-color: var(--color-bg-focus);
  outline: none;
}
```

**Benefits:**
- Clean, modern appearance without distracting outlines
- Meets WCAG contrast requirements (3:1 ratio)
- Consistent across all interactive elements
- Matches industry-standard design patterns

**Implementation:**
- Focus indicators use `--color-bg-focus` design token
- Background color change provides clear visual feedback
- Works with both light and dark themes

### Focus Trap (Modals)

When creating modals, implement focus trap:

```tsx
function Modal(): HTMLElement {
  const modalRef = useRef<HTMLElement>()
  
  useEffect(() => {
    // Trap focus within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      // Implement focus trap logic
    }
    
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])
  
  return <div ref={modalRef}>...</div>
}
```

## ARIA Patterns

### Live Regions

```tsx
// Polite: Waits for user to finish current action
<div role="status" aria-live="polite">
  Changes saved
</div>

// Assertive: Interrupts immediately
<div role="alert" aria-live="assertive">
  Critical error occurred
</div>
```

### Form Validation

```tsx
<input
  id="email"
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <p id="email-error" role="alert" className="form-error">
    Invalid email address
  </p>
)}
```

### Button States

```tsx
<button
  aria-label="Loading..."
  aria-busy="true"
  disabled
>
  <span aria-hidden="true">Loading...</span>
</button>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

## See Also

- [UI Guide](./ui-guide.md) - Component usage patterns
- [Terminology](./terminology.md) - UI terminology and naming conventions
- [Component Lifecycle](../development/component-lifecycle.md) - Component patterns
