[Docs](../README.md) / [Development](./README.md) / Component Lifecycle

# Component Lifecycle

This guide covers component initialization, cleanup, and resource management patterns for Cortex components using vanilla JSX.

## Component Pattern

All components follow this pattern:

```tsx
export function MyComponent(): HTMLElement {
  // Component state (closures)
  let elementRef: HTMLElement
  
  // Event handlers
  function handleClick() {
    // Handler logic
  }
  
  // Helper functions
  function updateState() {
    // Update logic
  }
  
  // Return JSX element
  return (
    <div ref={(el) => { if (el) elementRef = el }}>
      Content
    </div>
  ) as HTMLElement
}
```

## Initialization

### Basic Component

Components are functions that return `HTMLElement`:

```tsx
export function MyComponent(): HTMLElement {
  return (
    <div className="card-padded">
      <h1>Title</h1>
    </div>
  ) as HTMLElement
}
```

### Component with State

Use closures to maintain component state:

```tsx
export function Counter(): HTMLElement {
  let count = 0
  let displayElement: HTMLElement
  
  function increment() {
    count++
    displayElement.textContent = `Count: ${count}`
  }
  
  return (
    <div>
      <div ref={(el) => { if (el) displayElement = el }}>
        Count: {count}
      </div>
      <button onClick={increment}>Increment</button>
    </div>
  ) as HTMLElement
}
```

### Component with Element References

Use `ref` callback to get element references:

```tsx
export function MyComponent(): HTMLElement {
  let inputElement: HTMLInputElement
  
  function handleSubmit() {
    const value = inputElement.value
    // Use value
  }
  
  return (
    <div>
      <input
        ref={(el) => { if (el) inputElement = el as HTMLInputElement }}
        type="text"
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  ) as HTMLElement
}
```

## Event Listener Management

### Inline Event Handlers (Recommended)

Use JSX event handlers - they're automatically cleaned up:

```tsx
<button onClick={handleClick}>Click</button>
<input onKeyDown={handleKeyDown} />
```

**Benefits:**
- Automatic cleanup when element is removed
- No manual listener management needed
- Cleaner code

### Manual Event Listeners (When Needed)

If you need to add listeners after initialization:

```tsx
export function MyComponent(): HTMLElement {
  let buttonElement: HTMLElement
  
  function handleClick() {
    // Handler
  }
  
  // Add listener after element is created
  const element = (
    <button ref={(el) => { if (el) buttonElement = el }}>
      Click
    </button>
  ) as HTMLElement
  
  // Add listener manually if needed
  buttonElement.addEventListener('click', handleClick)
  
  return element
}
```

**Note:** For most cases, use JSX event handlers (`onClick`, `onKeyDown`, etc.) which handle cleanup automatically.

## Cleanup Patterns

### Automatic Cleanup

JSX event handlers are automatically cleaned up when elements are removed from DOM. No manual cleanup needed for:

- `onClick`, `onKeyDown`, `onChange`, etc.
- Event listeners added via JSX props

### Manual Cleanup (Advanced)

If you add listeners manually or create resources that need cleanup:

```tsx
export function MyComponent(): HTMLElement {
  let cleanup: (() => void) | null = null
  
  function setupComponent() {
    const handler = () => {
      // Handler logic
    }
    
    document.addEventListener('custom-event', handler)
    
    // Store cleanup function
    cleanup = () => {
      document.removeEventListener('custom-event', handler)
    }
  }
  
  // Call setup
  setupComponent()
  
  // Note: In current pattern, cleanup would need to be called manually
  // if component is removed. For most cases, use JSX handlers instead.
  
  return <div>Content</div> as HTMLElement
}
```

**Recommendation:** Prefer JSX event handlers to avoid manual cleanup complexity.

## Resource Management

### Async Operations

Handle async operations properly:

```tsx
export function AsyncComponent(): HTMLElement {
  let statusElement: HTMLElement
  let isMounted = true
  
  async function loadData() {
    updateStatus('Loading...', 'info')
    
    try {
      const data = await fetchData()
      if (isMounted) {
        updateStatus('Loaded', 'success')
        // Update UI with data
      }
    } catch (error) {
      if (isMounted) {
        updateStatus('Error', 'error')
      }
    }
  }
  
  function updateStatus(message: string, type: string) {
    if (statusElement) {
      statusElement.textContent = message
      statusElement.className = `status-${type}`
    }
  }
  
  // Start async operation
  loadData()
  
  return (
    <div>
      <div ref={(el) => { if (el) statusElement = el }} className="status-info">
        Initializing...
      </div>
    </div>
  ) as HTMLElement
}
```

### Timers and Intervals

If you use timers, consider cleanup:

```tsx
export function TimerComponent(): HTMLElement {
  let displayElement: HTMLElement
  let intervalId: number | null = null
  
  function startTimer() {
    let seconds = 0
    intervalId = window.setInterval(() => {
      seconds++
      if (displayElement) {
        displayElement.textContent = `Time: ${seconds}s`
      }
    }, 1000)
  }
  
  // Start timer
  startTimer()
  
  // Note: In current pattern, cleanup would be manual
  // For production, consider adding cleanup mechanism if needed
  
  return (
    <div ref={(el) => { if (el) displayElement = el }}>
      Time: 0s
    </div>
  ) as HTMLElement
}
```

## Common Patterns

### Pattern 1: Simple Component

```tsx
export function SimpleComponent(): HTMLElement {
  return (
    <div className="card-padded">
      <h2>Simple Component</h2>
      <p>No state, no cleanup needed</p>
    </div>
  ) as HTMLElement
}
```

### Pattern 2: Component with State

```tsx
export function StatefulComponent(): HTMLElement {
  let status = 'idle'
  let statusElement: HTMLElement
  
  function updateStatus(newStatus: string) {
    status = newStatus
    if (statusElement) {
      statusElement.textContent = status
    }
  }
  
  return (
    <div>
      <div ref={(el) => { if (el) statusElement = el }}>
        {status}
      </div>
      <button onClick={() => updateStatus('active')}>
        Activate
      </button>
    </div>
  ) as HTMLElement
}
```

### Pattern 3: Component with Async Operations

```tsx
export function AsyncComponent(): HTMLElement {
  let resultElement: HTMLElement
  
  async function fetchData() {
    try {
      const data = await window.api.someMethod()
      if (resultElement) {
        resultElement.textContent = `Result: ${data}`
        resultElement.className = 'status-success'
      }
    } catch (error) {
      if (resultElement) {
        resultElement.textContent = `Error: ${error}`
        resultElement.className = 'status-error'
      }
    }
  }
  
  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      <div ref={(el) => { if (el) resultElement = el }} className="status-info mt-4">
        Ready
      </div>
    </div>
  ) as HTMLElement
}
```

## Common Pitfalls

### ❌ Don't: Forget to Check Element Exists

```tsx
// Bad: May throw error if element not yet created
function update() {
  elementRef.textContent = 'Updated'
}

// Good: Check element exists
function update() {
  if (elementRef) {
    elementRef.textContent = 'Updated'
  }
}
```

### ❌ Don't: Create Memory Leaks with Timers

```tsx
// Bad: Timer never cleaned up
function startTimer() {
  setInterval(() => {
    // Update UI
  }, 1000)
}

// Good: Store interval ID for potential cleanup
let intervalId: number | null = null
function startTimer() {
  intervalId = window.setInterval(() => {
    // Update UI
  }, 1000)
}
```

### ❌ Don't: Access Elements Before Creation

```tsx
// Bad: Element not yet created
let elementRef: HTMLElement
elementRef.textContent = 'Text' // Error!

// Good: Set in ref callback
let elementRef: HTMLElement
return (
  <div ref={(el) => { if (el) elementRef = el }}>
    Content
  </div>
) as HTMLElement
```

### ✅ Do: Use JSX Event Handlers

```tsx
// Good: Automatic cleanup
<button onClick={handleClick}>Click</button>

// Avoid: Manual listeners unless necessary
button.addEventListener('click', handleClick)
```

## Best Practices

1. **Use closures for state** - Keep component state in function scope
2. **Use ref callbacks for element references** - Get references safely
3. **Prefer JSX event handlers** - Automatic cleanup
4. **Check element existence** - Always verify element exists before use
5. **Handle async operations** - Consider component lifecycle in async code
6. **Document lifecycle** - Comment complex lifecycle patterns

## Component Structure Template

```tsx
/**
 * ComponentName
 * 
 * Brief description of component purpose.
 * 
 * @returns {HTMLElement} The component element
 */
export function ComponentName(): HTMLElement {
  // 1. State variables (closures)
  let elementRef: HTMLElement
  let state = 'initial'
  
  // 2. Event handlers
  function handleEvent() {
    // Handler logic
  }
  
  // 3. Helper functions
  function updateState() {
    // Update logic
  }
  
  // 4. Async operations (if needed)
  async function loadData() {
    // Async logic
  }
  
  // 5. Return JSX
  return (
    <div className="card-padded">
      <div ref={(el) => { if (el) elementRef = el }}>
        Content
      </div>
      <button onClick={handleEvent}>Action</button>
    </div>
  ) as HTMLElement
}
```

## See Also

- [UI Guide](../design/ui-guide.md) - Component styling and usage
- [Accessibility](../design/accessibility.md) - Accessibility patterns
- [Patterns](./patterns.md) - General development patterns
