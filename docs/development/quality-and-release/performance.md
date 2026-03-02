[Docs](../README.md) / [Development](../README.md) / Performance

# Performance Optimization

## Lazy loading components

Only render complex components when needed (e.g. when in view):

```typescript
function lazyRender(componentFn: () => HTMLElement, containerSelector: string) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = document.querySelector(containerSelector)
        container.appendChild(componentFn())
        observer.disconnect()
      }
    })
  })

  observer.observe(document.querySelector(containerSelector))
}
```

## Database query optimization

Use indexes for frequently queried properties. Batch queries when possible.

```typescript
// Create index for frequent lookups
await session.run(`
  CREATE INDEX person_name IF NOT EXISTS
  FOR (p:Person) ON (p.name)
`)

// Batch instead of N round-trips
const results = await session.run(`
  UNWIND $names AS name
  MATCH (p:Person {name: name})
  RETURN p
`, { names: ['John', 'Jane', 'Bob'] })
```

## IPC batching

Prefer one batched IPC call over many small ones.

```typescript
// Instead of many small IPC calls
const p1 = await window.api.person.getDetails('John')
const p2 = await window.api.person.getDetails('Jane')
const p3 = await window.api.person.getDetails('Bob')

// Batch them
const people = await window.api.person.getBatch(['John', 'Jane', 'Bob'])
```

## See also

- [Feature Development](../development-patterns/feature-development.md) — Success criteria often mention performance
- [Electron Guidance](../development-patterns/electron-guidance.md) — Main/renderer boundaries and IPC
