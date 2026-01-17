# Development Guide

## Overview

This guide covers the development workflow for building Cortex as a native Electron desktop application with embedded Neo4j and Ollama. The architecture prioritizes rapid iteration, clear separation of concerns, and a streamlined developer experience.

---

## Prerequisites

### Required Software
- **Node.js**: v18+ (comes with npm)
- **Git**: For version control
- **Code Editor**: Cursor IDE (recommended) or VS Code
- **Java Runtime**: JRE 11+ (for embedded Neo4j)

### Optional Tools
- **Neo4j Desktop**: For inspecting database during development (can connect to embedded instance)
- **Obsidian**: For viewing/editing vault files outside the app

---

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd cortex-app
npm install
```

### 2. Configure Vault Path

Create `.env` file:
```bash
VAULT_PATH=/path/to/your/obsidian/vault
```

On first launch, the app will also prompt for vault location if not set.

### 3. Verify Setup

```bash
npm run dev
```

Should open Electron window with app running. Check that:
- Neo4j embedded starts successfully (check logs)
- Ollama subprocess spawns
- UI renders with no console errors

---

## Project Structure

```
cortex-app/
├── src/
│   ├── main/                 # Main process (Node.js)
│   │   ├── index.ts          # Application entry point
│   │   ├── neo4j/            # Embedded Neo4j management
│   │   ├── ollama/           # Embedded Ollama management
│   │   ├── vault/            # Filesystem operations
│   │   ├── ipc/              # IPC handlers
│   │   └── state/            # Application state management
│   │
│   ├── renderer/             # Renderer process (UI)
│   │   ├── index.html        # HTML entry point
│   │   ├── index.tsx         # App initialization
│   │   ├── components/       # UI components (JSX)
│   │   ├── lib/              # Utilities and helpers
│   │   └── styles/           # Tailwind CSS
│   │
│   ├── shared/               # Shared types and constants
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── constants.ts      # App-wide constants
│   │
│   └── preload/              # Preload script (IPC bridge)
│       └── index.ts          # Exposes IPC to renderer
│
├── logs/                     # Application logs
├── data/                     # Development data (gitignored)
├── docs/                     # Architecture and guides
├── devlogs/                  # Development progress logs
└── automation-candidates/    # Ideas for future automation
```

---

## Development Workflow

### Running the Application

```bash
# Development mode (hot reload)
npm run dev

# Build production bundle
npm run build

# Run production build
npm run start

# Package for distribution
npm run package
```

### Development Mode Details

When running `npm run dev`:
1. TypeScript compiles both main and renderer code
2. Electron launches with main process
3. Renderer process loads with hot reload enabled
4. Changes to renderer code → instant UI updates
5. Changes to main process → automatic restart

**Dev Tools:**
- Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux) to open Chrome DevTools
- Main process logs appear in terminal
- Renderer logs appear in DevTools console

---

## Core Development Patterns

### Adding New Functionality

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

---

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

---

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

---

## Embedded Services

### Neo4j Management

```typescript
// src/main/neo4j/embedded.ts
import neo4j from 'neo4j-driver'
import { app } from 'electron'
import path from 'path'

const dbPath = path.join(app.getPath('userData'), 'neo4j')

export async function startNeo4j() {
  const driver = neo4j.driver('neo4j://localhost:7687', 
    neo4j.auth.basic('neo4j', 'password')
  )
  
  // Verify connection
  await driver.verifyConnectivity()
  
  return driver
}

export async function stopNeo4j(driver) {
  await driver.close()
}
```

### Ollama Management

```typescript
// src/main/ollama/embedded.ts
import { spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'

const ollamaPath = path.join(app.getPath('userData'), 'ollama', 'ollama')

export function startOllama() {
  const process = spawn(ollamaPath, ['serve'], {
    env: {
      ...process.env,
      OLLAMA_MODELS: path.join(app.getPath('userData'), 'models')
    }
  })
  
  process.on('error', (err) => {
    console.error('Ollama failed to start:', err)
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
import { startNeo4j, stopNeo4j } from './neo4j'
import { startOllama, stopOllama } from './ollama'

let neo4jDriver
let ollamaProcess

app.on('ready', async () => {
  // Start embedded services
  neo4jDriver = await startNeo4j()
  ollamaProcess = startOllama()
  
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
  // Cleanup
  if (neo4jDriver) await stopNeo4j(neo4jDriver)
  if (ollamaProcess) stopOllama(ollamaProcess)
})
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// src/main/vault/operations.test.ts
import { describe, it, expect } from 'vitest'
import { readPersonFile } from './operations'

describe('Vault Operations', () => {
  it('reads person file correctly', async () => {
    const person = await readPersonFile('John Doe')
    expect(person.name).toBe('John Doe')
  })
})
```

### Integration Tests

```typescript
// src/main/neo4j/queries.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startNeo4j, stopNeo4j } from './embedded'
import { getPersonOccurrences } from './queries'

describe('Neo4j Queries', () => {
  let driver
  
  beforeAll(async () => {
    driver = await startNeo4j()
  })
  
  afterAll(async () => {
    await stopNeo4j(driver)
  })
  
  it('fetches person occurrences', async () => {
    const occurrences = await getPersonOccurrences('John Doe')
    expect(occurrences).toHaveLength(5)
  })
})
```

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

---

## Debugging

### Main Process Debugging

```bash
# Start with debugging enabled
npm run dev -- --inspect

# Then attach debugger (VS Code, Chrome DevTools)
```

### Renderer Process Debugging

Open Chrome DevTools in Electron window:
- Mac: `Cmd+Option+I`
- Windows/Linux: `Ctrl+Shift+I`

### Logging Strategy

```typescript
// src/main/lib/logger.ts
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const logPath = path.join(app.getPath('userData'), 'logs')

export function log(category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    category,
    message,
    data
  }
  
  // Write to file
  fs.appendFileSync(
    path.join(logPath, `${category}.log`),
    JSON.stringify(logEntry) + '\n'
  )
  
  // Also console in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${category}]`, message, data)
  }
}
```

---

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

---

## Build and Distribution

### Building Production Package

```bash
npm run package
```

Creates distributable in `dist/` directory:
- Mac: `Cortex.app`
- Windows: `Cortex-Setup.exe`
- Linux: `Cortex.AppImage`

### Update Strategy

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'

export function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify()
  
  autoUpdater.on('update-available', () => {
    // Notify user in UI
  })
  
  autoUpdater.on('update-downloaded', () => {
    // Prompt user to restart
  })
}
```

---

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

---

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

---

*This development guide evolves with the project. As patterns emerge and tools improve, update this document to reflect best practices.*
