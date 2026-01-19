[Docs](../README.md) / [Development](./README.md) / Development Patterns

# Development Patterns

## Adding New Functionality

Follow this sequence for any new feature:

1. **Define IPC Interface** (if backend needed)
2. **Implement Main Process Handler**
3. **Expose via Preload**
4. **Build UI Component**
5. **Test End-to-End**

### Example: Adding "Get Person Details" Feature

**Step 1: Define Types** (`src/shared/types.ts`)
```typescript
export interface Person {
  name: string
  occurrences: string[]
  connections: string[]
}
```

**Step 2: Add IPC Handler** (`src/main/ipc/person.ts`)
```typescript
import { ipcMain } from 'electron'
import { neo4jSession } from '../neo4j'

export function registerPersonHandlers() {
  ipcMain.handle('person:get-details', async (_, name: string) => {
    const result = await neo4jSession.run(
      'MATCH (p:Person {name: $name}) RETURN p',
      { name }
    )
    return result.records[0]?.get('p').properties
  })
}
```

**Step 3: Expose in Preload** (`src/preload/index.ts`)
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  person: {
    getDetails: (name: string) => 
      ipcRenderer.invoke('person:get-details', name)
  }
})
```

**Step 4: Create UI Component** (`src/renderer/components/PersonDetails.tsx`)
```typescript
export function PersonDetails({ name }: { name: string }) {
  const [person, setPerson] = useState<Person | null>(null)
  
  useEffect(() => {
    window.api.person.getDetails(name).then(setPerson)
  }, [name])
  
  if (!person) return <div>Loading...</div>
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">{person.name}</h2>
      <ul>
        {person.occurrences.map(o => <li key={o}>{o}</li>)}
      </ul>
    </div>
  )
}
```

**Step 5: Test**
```typescript
// src/renderer/App.test.tsx
import { render, screen } from '@testing-library/react'
import { PersonDetails } from './components/PersonDetails'

test('renders person details', async () => {
  render(<PersonDetails name="John Doe" />)
  expect(await screen.findByText('John Doe')).toBeInTheDocument()
})
```

## Working with JSX (No React)

### Custom createElement Function

Since we're not using React, we implement JSX transformation ourselves:

```typescript
// src/renderer/lib/jsx.ts
export function createElement(
  tag: string | Function,
  props: any,
  ...children: any[]
): HTMLElement {
  if (typeof tag === 'function') {
    return tag({ ...props, children })
  }
  
  const element = document.createElement(tag)
  
  // Set properties
  Object.entries(props || {}).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value as string
    } else if (key.startsWith('on')) {
      const event = key.toLowerCase().substring(2)
      element.addEventListener(event, value as EventListener)
    } else {
      element.setAttribute(key, value as string)
    }
  })
  
  // Append children
  children.flat().forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child))
    } else if (child instanceof HTMLElement) {
      element.appendChild(child)
    }
  })
  
  return element
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "createElement",
    "jsxFragmentFactory": "Fragment"
  }
}
```

### Using JSX in Components

```typescript
import { createElement } from '../lib/jsx'

function Button({ onClick, children }) {
  return (
    <button 
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Rendering
const root = document.getElementById('root')
root.appendChild(<Button onClick={() => alert('Clicked!')}>Click Me</Button>)
```

## State Management

### Main Process State

The main process owns all application state. Renderer is notified of changes via IPC events.

```typescript
// src/main/state/AppState.ts
export class AppState {
  private currentPerson: Person | null = null
  
  setPerson(person: Person) {
    this.currentPerson = person
    this.notifyRenderer('person:changed', person)
  }
  
  private notifyRenderer(channel: string, data: any) {
    BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
  }
}
```

### Renderer Listens for Updates

```typescript
// src/renderer/index.tsx
window.api.on('person:changed', (person) => {
  renderPersonDetails(person)
})

function renderPersonDetails(person: Person) {
  const root = document.getElementById('person-details')
  root.innerHTML = ''
  root.appendChild(<PersonDetails person={person} />)
}
```

## Embedded Services

### Neo4j Management

**Note**: Neo4j runs as a managed subprocess. Connection management example:

```typescript
// src/main/neo4j/connection.ts
import neo4j from 'neo4j-driver'
import { app } from 'electron'
import path from 'path'

const dbPath = path.join(app.getPath('userData'), 'neo4j')

export async function connectToNeo4j() {
  // Assumes Neo4j subprocess is already running
  const driver = neo4j.driver('neo4j://localhost:7687', 
    neo4j.auth.basic('neo4j', 'password')
  )
  
  // Verify connection
  await driver.verifyConnectivity()
  
  return driver
}

export async function closeNeo4jConnection(driver) {
  await driver.close()
}
```

### Ollama Management

**Note**: Ollama uses standard system installation, not app-specific directory. Connection management example:

```typescript
// src/main/ollama/connection.ts
import { DEFAULT_OLLAMA_CONFIG } from '../config/defaults'

export async function connectToOllama() {
  // Connect to system Ollama installation
  // Models in standard location: ~/.ollama/models
  const response = await fetch(`http://${DEFAULT_OLLAMA_CONFIG.host}:${DEFAULT_OLLAMA_CONFIG.port}/api/tags`)
  
  if (!response.ok) {
    throw new Error('Ollama not available - may need installation')
  }
  
  return await response.json()
}
  })
  
  return process
}

export function stopOllama(process) {
  process.kill()
}
```

### Application Lifecycle

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'
import { connectToNeo4j, closeNeo4jConnection } from './neo4j/connection'
import { connectToOllama } from './ollama/connection'

let neo4jDriver

app.on('ready', async () => {
  // Connect to services (assumes Neo4j subprocess already started)
  neo4jDriver = await connectToNeo4j()
  await connectToOllama() // Verify Ollama is available
  
  // Create window
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  
  window.loadFile('index.html')
})

app.on('before-quit', async () => {
  // Cleanup connections
  if (neo4jDriver) await closeNeo4jConnection(neo4jDriver)
})
```

## Common Patterns

### File Watching

```typescript
// src/main/vault/watcher.ts
import chokidar from 'chokidar'

export function watchVault(vaultPath: string, onChange: (path: string) => void) {
  const watcher = chokidar.watch(vaultPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  })
  
  watcher.on('change', onChange)
  watcher.on('add', onChange)
  
  return watcher
}
```

### Error Handling

```typescript
// src/main/ipc/errorHandler.ts
ipcMain.handle('query', async (_, cypher) => {
  try {
    return await neo4jSession.run(cypher)
  } catch (error) {
    log('error', 'Query failed', { cypher, error: error.message })
    throw new Error(`Query failed: ${error.message}`)
  }
})
```

## AI Integration Patterns

### LLM Query Generation

```typescript
// src/main/ai/queryGenerator.ts
export async function generateCypherQuery(
  userIntent: string,
  context: GraphContext
): Promise<string> {
  const prompt = `
    Given this graph schema: ${context.schema}
    Generate a Cypher query for: ${userIntent}
  `
  
  const response = await ollama.query(prompt)
  return extractCypherFromResponse(response)
}
```

### Streaming Responses

```typescript
// src/main/ai/chat.ts
ipcMain.handle('ai:stream-query', async (event, prompt) => {
  const stream = await ollama.stream(prompt)
  
  for await (const chunk of stream) {
    event.sender.send('ai:stream-chunk', chunk)
  }
  
  event.sender.send('ai:stream-complete')
})
```

## Performance Optimization

### Lazy Loading Components

```typescript
// Only render complex components when needed
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

### Database Query Optimization

```typescript
// Use indexes for frequent queries
await session.run(`
  CREATE INDEX person_name IF NOT EXISTS
  FOR (p:Person) ON (p.name)
`)

// Batch queries when possible
const results = await session.run(`
  UNWIND $names AS name
  MATCH (p:Person {name: name})
  RETURN p
`, { names: ['John', 'Jane', 'Bob'] })
```

### IPC Batching

```typescript
// Instead of many small IPC calls
const p1 = await window.api.person.getDetails('John')
const p2 = await window.api.person.getDetails('Jane')
const p3 = await window.api.person.getDetails('Bob')

// Batch them
const people = await window.api.person.getBatch(['John', 'Jane', 'Bob'])
```

## See Also

- [Testing Strategies](./testing.md) - How to test the patterns described here
- [Guardrails](./guardrails.md) - Constraints that affect these patterns
- [Architecture Principles](../architecture/principles.md) - Why these patterns exist
- [Use Case Workflow](./use-case-workflow.md) - How to apply these patterns in feature development
- [IPC Patterns](../agents/electron-guidance.md) - Electron-specific IPC guidance
