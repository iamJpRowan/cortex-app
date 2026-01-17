# AI Agent Development Guide

This guide defines how AI agents (Cursor, Claude Desktop, GitHub Copilot, autonomous bots, etc.) should collaborate with developers when working on Cortex as a native Electron application.

## Conversation Workflow

Each development conversation follows a structured goal-oriented process:

### 1. Goal Setting
- User defines the functionality goal for the conversation
- AI proposes a concise set of implementation steps
- Discussion until approach is aligned

### 2. Step-by-Step Implementation

For each step, follow this cycle:

1. **Propose** - AI suggests specific changes for the current step
2. **Discuss** - Back and forth until approach is agreed
   - User asks for clarifications and defines criteria
   - Agent provides confirmation of understanding and answers questions
   - Agent should only produce full updated plan when prompted to do so
3. **Implement** - User explicitly instructs AI to implement
4. **Test** - AI prompts user to test; work through bugs/adjustments
5. **Commit** - Once satisfied, commit changes with appropriate semantic prefix
6. **Repeat** - Proceed to next step

### Workflow Rules

**Pacing and Confirmation:**
- Keep step proposals focused and concise
- Don't proceed to detailing steps until explicitly instructed
- Don't proceed to implementation until explicitly instructed
- Always prompt for testing after implementation
- Commit after each completed step, not in bulk at the end

**Critical: Stop When Approach Fails**
If at any point the agreed-upon approach is determined not to work:
1. **STOP implementing immediately**
2. Explain the issue clearly
3. Ask how to proceed rather than assuming a fix

**When to Pause vs Proceed:**
- **Pause:** Architectural decisions, multiple valid approaches, unclear requirements
- **Proceed:** Following established patterns, iterating within agreed approach, path is unambiguous

---

## Agent-Specific Patterns

### Cursor IDE
**Primary Use:** File-focused operations, code generation, refactoring

**Context Provided:**
- `.cursorrules` file with project-specific guidance
- Current file being edited
- Project structure

**Best For:**
- Implementing IPC handlers
- Creating UI components
- Writing tests
- Refactoring existing code

**Pattern:**
```
User: "Add handler for querying person occurrences"
Cursor: [Generates IPC handler in appropriate file]
User: Tests, commits
```

### Claude Desktop (via MCP)
**Primary Use:** High-level architecture, documentation, complex problem-solving

**Context Provided:**
- Full project documentation
- Architecture decisions
- Cross-file understanding

**Best For:**
- Architectural planning
- Documentation updates
- Multi-file refactors
- Debugging complex issues

**Pattern:**
```
User: "How should we structure the state management?"
Claude: [Proposes architecture with rationale]
User: Discusses tradeoffs
Claude: [Updates architecture docs]
```

### GitHub Copilot
**Primary Use:** Inline code suggestions, boilerplate generation

**Context Provided:**
- Current file and nearby files
- Function signatures

**Best For:**
- Auto-completing function implementations
- Generating test cases
- Creating similar patterns to existing code

**Pattern:**
```
User: Types function signature
Copilot: [Suggests implementation]
User: Accepts or modifies
```

### Autonomous Agents (Future)
**Primary Use:** Scheduled tasks, data maintenance, pattern recognition

**Context Provided:**
- Full vault access
- Graph database state
- Historical patterns

**Best For:**
- Identifying missing connections
- Suggesting entity enhancements
- Running scheduled data syncs
- Pattern-based insights

**Pattern:**
```
Agent: Runs on schedule
Agent: Analyzes recent vault changes
Agent: Proposes graph enhancements
User: Reviews and approves
Agent: Executes approved changes
```

---

## Electron-Specific Guidance

### Process Boundary Awareness

**When Working on Main Process Code:**
- Remember: Has access to filesystem, Neo4j, Ollama
- Can execute system commands
- Manages application lifecycle
- Owns all application state

**When Working on Renderer Process Code:**
- Remember: Sandboxed, no direct filesystem access
- Must use IPC to communicate with main process
- Focus on UI rendering and user interaction
- Minimal local state (most state lives in main process)

**When Adding New Features:**
Always ask: "Does this need to happen in main process or renderer?"
- Data operations → Main process
- UI rendering → Renderer process
- User input → Renderer captures, main process handles

### IPC Design Patterns

**Follow these conventions when creating IPC channels:**

```typescript
// Namespace by domain
'person:get-details'
'person:update-bio'
'graph:query'
'vault:read-file'
'vault:write-file'
'ai:generate-query'
'ai:stream-response'

// Use verbs that indicate action
get, set, create, update, delete, query, stream

// Group related operations
ipcMain.handle('person:*', ...)  // All person operations
ipcMain.handle('vault:*', ...)   // All vault operations
```

**Security Considerations:**
- Validate all inputs from renderer
- Never expose raw database queries to renderer
- Sanitize file paths to prevent directory traversal
- Rate-limit expensive operations

### State Management Patterns

**Main Process State:**
```typescript
// Single source of truth
class AppState {
  currentPerson: Person | null
  recentActivity: Activity[]
  
  // Notify renderer of changes
  private notify(channel: string, data: any) {
    mainWindow?.webContents.send(channel, data)
  }
  
  setCurrentPerson(person: Person) {
    this.currentPerson = person
    this.notify('state:person-changed', person)
  }
}
```

**Renderer Subscribes:**
```typescript
// Listen for state changes
window.api.on('state:person-changed', (person) => {
  renderPersonView(person)
})

// Request initial state on load
window.api.getInitialState().then(state => {
  renderApp(state)
})
```

---

## Working with Embedded Services

### Neo4j Patterns

**Starting/Stopping:**
```typescript
// Always in main process
app.on('ready', async () => {
  neo4jDriver = await startEmbeddedNeo4j()
})

app.on('before-quit', async () => {
  await neo4jDriver.close()
})
```

**Query Execution:**
```typescript
// Expose safe query interface via IPC
ipcMain.handle('graph:query', async (_, query, params) => {
  // Validate query
  if (!isSafeCypherQuery(query)) {
    throw new Error('Unsafe query')
  }
  
  const session = neo4jDriver.session()
  try {
    const result = await session.run(query, params)
    return result.records.map(r => r.toObject())
  } finally {
    await session.close()
  }
})
```

### Ollama Patterns

**Model Management:**
```typescript
// List available models
ipcMain.handle('ai:list-models', async () => {
  return await ollama.list()
})

// Download new model
ipcMain.handle('ai:download-model', async (_, modelName) => {
  return await ollama.pull(modelName, {
    // Stream progress to renderer
    stream: (progress) => {
      mainWindow?.webContents.send('ai:download-progress', progress)
    }
  })
})
```

**Query Execution:**
```typescript
// Standard query
ipcMain.handle('ai:query', async (_, prompt, options) => {
  const response = await ollama.generate({
    model: options.model || 'llama3.2',
    prompt,
    stream: false
  })
  return response.response
})

// Streaming query
ipcMain.handle('ai:stream-query', async (event, prompt, options) => {
  const stream = await ollama.generate({
    model: options.model || 'llama3.2',
    prompt,
    stream: true
  })
  
  for await (const chunk of stream) {
    event.sender.send('ai:stream-chunk', chunk.response)
  }
  
  event.sender.send('ai:stream-complete')
})
```

---

## JSX Without React Patterns

### Component Structure

```typescript
// Define components as functions that return HTMLElements
function PersonCard({ person, onClick }: PersonCardProps): HTMLElement {
  return (
    <div className="p-4 border rounded-lg cursor-pointer" onClick={onClick}>
      <h3 className="text-lg font-bold">{person.name}</h3>
      <p className="text-gray-600">{person.bio}</p>
    </div>
  )
}

// Use components by calling them
const personCards = people.map(person => 
  PersonCard({ person, onClick: () => selectPerson(person) })
)

// Append to DOM
const container = document.getElementById('person-list')
personCards.forEach(card => container.appendChild(card))
```

### Re-rendering Pattern

```typescript
// Simple re-render on state change
function renderPersonList(people: Person[]) {
  const container = document.getElementById('person-list')
  container.innerHTML = '' // Clear existing
  
  people.forEach(person => {
    container.appendChild(PersonCard({ person, onClick: selectPerson }))
  })
}

// Call when state changes
window.api.on('state:people-changed', (people) => {
  renderPersonList(people)
})
```

### Event Handling

```typescript
// Attach event listeners in JSX
function SearchBar({ onSearch }: SearchBarProps): HTMLElement {
  return (
    <input
      type="text"
      className="px-4 py-2 border rounded"
      onInput={(e) => onSearch((e.target as HTMLInputElement).value)}
      placeholder="Search people..."
    />
  )
}

// Or attach after creation
function SearchBar({ onSearch }: SearchBarProps): HTMLElement {
  const input = (
    <input
      type="text"
      className="px-4 py-2 border rounded"
      placeholder="Search people..."
    />
  ) as HTMLInputElement
  
  input.addEventListener('input', (e) => {
    onSearch((e.target as HTMLInputElement).value)
  })
  
  return input
}
```

---

## Testing Patterns

### Main Process Tests

```typescript
// src/main/vault/operations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readPersonFile, writePersonFile } from './operations'
import fs from 'fs/promises'
import path from 'path'

describe('Vault Operations', () => {
  const testVaultPath = path.join(__dirname, '__fixtures__', 'test-vault')
  
  beforeEach(async () => {
    await fs.mkdir(testVaultPath, { recursive: true })
  })
  
  afterEach(async () => {
    await fs.rm(testVaultPath, { recursive: true })
  })
  
  it('reads person file correctly', async () => {
    await writePersonFile(testVaultPath, 'John Doe', {
      name: 'John Doe',
      bio: 'Test bio'
    })
    
    const person = await readPersonFile(testVaultPath, 'John Doe')
    expect(person.name).toBe('John Doe')
    expect(person.bio).toBe('Test bio')
  })
})
```

### IPC Handler Tests

```typescript
// src/main/ipc/person.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ipcMain } from 'electron'
import { registerPersonHandlers } from './person'

describe('Person IPC Handlers', () => {
  beforeAll(() => {
    registerPersonHandlers()
  })
  
  it('handles person:get-details', async () => {
    const handler = ipcMain.listeners('person:get-details')[0]
    const mockEvent = {} as any
    
    const result = await handler(mockEvent, 'John Doe')
    expect(result.name).toBe('John Doe')
  })
})
```

### Renderer Component Tests

```typescript
// src/renderer/components/PersonCard.test.ts
import { describe, it, expect } from 'vitest'
import { PersonCard } from './PersonCard'

describe('PersonCard', () => {
  it('renders person information', () => {
    const person = { name: 'John Doe', bio: 'Test bio' }
    const card = PersonCard({ person, onClick: () => {} })
    
    expect(card.querySelector('h3')?.textContent).toBe('John Doe')
    expect(card.querySelector('p')?.textContent).toBe('Test bio')
  })
  
  it('calls onClick when clicked', () => {
    let clicked = false
    const person = { name: 'John Doe', bio: 'Test bio' }
    const card = PersonCard({ person, onClick: () => { clicked = true } })
    
    card.click()
    expect(clicked).toBe(true)
  })
})
```

---

## Performance Considerations

### Lazy Loading

```typescript
// Only load heavy components when visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const container = entry.target
      container.appendChild(renderHeavyComponent())
      observer.unobserve(container)
    }
  })
})

document.querySelectorAll('.lazy-component').forEach(el => {
  observer.observe(el)
})
```

### Debouncing IPC Calls

```typescript
// Avoid hammering main process with rapid calls
function debounce(fn: Function, delay: number) {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const debouncedSearch = debounce((query: string) => {
  window.api.search(query)
}, 300)

searchInput.addEventListener('input', (e) => {
  debouncedSearch((e.target as HTMLInputElement).value)
})
```

### Batch Operations

```typescript
// Instead of many small queries
const details = []
for (const name of names) {
  details.push(await window.api.person.getDetails(name))
}

// Batch them
const details = await window.api.person.getBatch(names)
```

---

## Common Pitfalls

### ❌ Don't: Assume React Patterns Work
```typescript
// This won't work (no useState)
const [count, setCount] = useState(0)
```

### ✅ Do: Manage State Explicitly
```typescript
let count = 0

function increment() {
  count++
  render()
}

function render() {
  document.getElementById('count').textContent = String(count)
}
```

### ❌ Don't: Try to Access Filesystem from Renderer
```typescript
// Renderer process - this will fail
import fs from 'fs'
const data = fs.readFileSync('/path/to/file')
```

### ✅ Do: Use IPC to Request Main Process
```typescript
// Renderer process - correct approach
const data = await window.api.vault.readFile('/path/to/file')
```

### ❌ Don't: Expose Raw Database Connection
```typescript
// Preload - dangerous
contextBridge.exposeInMainWorld('api', {
  neo4j: driver  // Renderer can run any query!
})
```

### ✅ Do: Expose Safe, Validated Operations
```typescript
// Preload - safe
contextBridge.exposeInMainWorld('api', {
  graph: {
    getPersonDetails: (name: string) => ipcRenderer.invoke('graph:person-details', name)
  }
})
```

---

## Development Checklists

### Adding New IPC Handler
- [ ] Define TypeScript types for inputs/outputs
- [ ] Implement handler in main process
- [ ] Add input validation
- [ ] Add error handling
- [ ] Expose via preload script
- [ ] Add TypeScript definitions for renderer
- [ ] Write unit tests
- [ ] Test from renderer UI
- [ ] Document in appropriate file

### Creating New UI Component
- [ ] Define component props interface
- [ ] Implement JSX component function
- [ ] Add Tailwind classes for styling
- [ ] Attach event handlers
- [ ] Handle loading/error states
- [ ] Write component tests
- [ ] Integrate into parent component
- [ ] Test in running application

### Adding External Data Integration
- [ ] Define data storage format (MD vs JSON)
- [ ] Implement API client
- [ ] Create sync logic
- [ ] Add graph transformation
- [ ] Implement IPC handlers for UI access
- [ ] Create UI components for display
- [ ] Add error handling and retry logic
- [ ] Document integration approach

---

*This guide evolves as development patterns emerge. Update it when new best practices are discovered.*
