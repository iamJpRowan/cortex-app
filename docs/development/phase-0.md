# Phase 0: Minimal Working Electron App

## Status

- ✅ **Step 1: Initialize electron-vite Project** - COMPLETE
- ⏳ **Step 2: Add Neo4j Server Subprocess** - NEXT
- ⏸️ **Step 3: Add Ollama Connection** - PENDING
- ⏸️ **Step 4: Create Test UI** - PENDING
- ⏸️ **Step 5: Connect to Vault** - PENDING

## Quick Start for Agents

**Current State:** Step 1 is complete. The project has:
- ✅ Electron app with TypeScript + JSX + Tailwind working
- ✅ Hot module reload configured
- ✅ Pre-commit type checking set up
- ✅ All files committed and ready

**Next Action:** Proceed to **Step 2: Add Neo4j Server Subprocess**

**Before Starting Step 2:**
1. Verify Step 1 works: `npm run dev` should open Electron window with styled content
2. Run type check: `npm run type-check` should pass
3. Review Step 2 requirements below

## Goal

Create a minimal Electron application that proves the core stack works:
- Electron window opens with TypeScript + JSX + Tailwind
- Embedded Neo4j server starts/stops as subprocess
- Connects to locally installed Ollama
- Can execute hardcoded queries against both
- Simple UI displays results

**Not included in Phase 0:**
- Chat interface or LLM query generation
- Vault file operations
- Any real features
- Complex UI components

---

## Prerequisites

**Required installations:**
```bash
# Install Ollama
brew install ollama

# Pull a default model
ollama pull llama3.2

# Verify Ollama is running
ollama list
```

**Vault setup:**
- Existing Obsidian vault with data
- obsidian-graphdb-sync plugin installed and configured
- Ability to run manual sync to populate Neo4j

---

## Step 1: Initialize electron-vite Project ✅ COMPLETE

**Objective:** Get basic Electron window opening with TypeScript and HMR working.

**Status:** ✅ Complete - All success criteria met. Ready to proceed to Step 2.

**Note:** Project was initialized manually (not via template) to preserve existing documentation. All files created match the specification below.

### Tasks

1. **Create project structure:**
```bash
# Project already exists with docs - initialize manually
npm init -y
npm install -D electron electron-vite typescript vite
npm install -D tailwindcss postcss autoprefixer
npm install -D husky  # For pre-commit hooks
```

2. **Add Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js` (CommonJS format):
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx,html}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Configure `postcss.config.js` (CommonJS format):
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Add to `src/renderer/src/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

3. **Verify setup:**
```bash
npm run dev
```

Should see Electron window open with default content.

4. **Test HMR:**
- Edit `src/renderer/src/App.tsx`
- Save and verify changes appear instantly without full reload

5. **Configure TypeScript for JSX:**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react",
    "jsxFactory": "createElement",
    "jsxFragmentFactory": "Fragment"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "dist-electron"]
}
```

6. **Create JSX runtime and type definitions:**

Create `src/renderer/src/lib/jsx.ts`:
```typescript
type JSXProps = Record<string, any> | null
type JSXChild = string | number | HTMLElement | DocumentFragment | null | false | undefined

export function createElement(
  tag: string | ((props: JSXProps & { children?: JSXChild[] }) => HTMLElement | DocumentFragment),
  props: JSXProps,
  ...children: JSXChild[]
): HTMLElement | DocumentFragment {
  if (typeof tag === 'function') {
    return tag({ ...props, children })
  }
  
  const element = document.createElement(tag)
  
  // Set properties and attributes
  Object.entries(props || {}).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value as string
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.toLowerCase().substring(2)
      element.addEventListener(event, value as EventListener)
    } else if (key === 'ref' && typeof value === 'function') {
      value(element)
    } else if (key !== 'children') {
      element.setAttribute(key, String(value))
    }
  })
  
  // Append children
  children.flat().forEach(child => {
    if (child == null || child === false) return
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof HTMLElement || child instanceof DocumentFragment) {
      element.appendChild(child)
    }
  })
  
  return element
}

export function Fragment({ children }: { children?: JSXChild[] }): DocumentFragment {
  const fragment = document.createDocumentFragment()
  ;(children || []).flat().forEach(child => {
    if (child == null || child === false) return
    if (typeof child === 'string' || typeof child === 'number') {
      fragment.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof HTMLElement || child instanceof DocumentFragment) {
      fragment.appendChild(child)
    }
  })
  return fragment
}
```

Create `src/renderer/src/jsx.d.ts`:
```typescript
// JSX type definitions for vanilla JSX (no React)
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
  
  interface Element extends HTMLElement {}
}
```

7. **Set up pre-commit hooks:**

Install husky and configure:
```bash
npm install -D husky
npx husky init
```

Update `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run type-check
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

### Additional Files Created

- `electron.vite.config.ts` - Electron-vite configuration with output directories
- `tsconfig.node.json` - TypeScript config for Node files
- `.gitignore` - Comprehensive ignore patterns
- `src/main/index.ts` - Main process (uses `app.whenReady()` instead of deprecated `app.on('ready')`)
- `src/preload/index.ts` - Preload script with context bridge
- `src/renderer/index.html` - HTML template
- `src/renderer/src/main.ts` - Renderer entry with DOM ready check
- `src/renderer/src/App.tsx` - Basic App component

### Success Criteria

- [x] Electron window opens
- [x] Hot reload works for renderer changes
- [x] Main process restarts on main code changes
- [x] Tailwind classes apply correctly
- [x] JSX components render without React
- [x] No console errors
- [x] Type checking passes
- [x] Pre-commit hooks configured

### Improvements Made

- Used `app.whenReady()` instead of deprecated `app.on('ready')`
- Added proper TypeScript types for JSX runtime
- Fragment returns `DocumentFragment` (not `HTMLElement`)
- Added DOM ready check in renderer entry
- Configured pre-commit type checking with husky
- Used CommonJS for PostCSS config (no `"type": "module"` needed)

### Commit

```bash
git add -A
git commit -m "feat: Initialize electron-vite project with TypeScript, Tailwind, and vanilla JSX"
```

---

## Step 2: Add Neo4j Server Subprocess ⏳ NEXT

**Objective:** Bundle Neo4j server, start/stop it with the app, connect successfully.

**Status:** Ready to begin. Step 1 is complete and verified.

### Tasks

1. **Install dependencies:**
```bash
npm install neo4j-driver
npm install -D @types/neo4j-driver
```

2. **Download Neo4j Community Server:**
- Download from https://neo4j.com/download-center/#community
- Extract to `resources/neo4j/` (will be bundled with app)
- Version: Use latest 5.x community edition

3. **Create Neo4j manager:**

Create `src/main/services/neo4j.ts`:
```typescript
import neo4j, { Driver } from 'neo4j-driver'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let neo4jProcess: ChildProcess | null = null
let driver: Driver | null = null

const NEO4J_BOLT_PORT = 7687
const NEO4J_HTTP_PORT = 7474
const USERNAME = 'neo4j'
const PASSWORD = 'cortex-dev-password'

export async function startNeo4j(): Promise<Driver> {
  const neo4jPath = path.join(process.resourcesPath, 'neo4j')
  const dataPath = path.join(app.getPath('userData'), 'neo4j-data')
  
  // Ensure data directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
  
  // Start Neo4j server
  const binPath = path.join(neo4jPath, 'bin', 'neo4j')
  neo4jProcess = spawn(binPath, ['console'], {
    env: {
      ...process.env,
      NEO4J_HOME: neo4jPath,
      NEO4J_DATA: dataPath,
      NEO4J_AUTH: `${USERNAME}/${PASSWORD}`,
      NEO4J_server_bolt_listen__address: `localhost:${NEO4J_BOLT_PORT}`,
      NEO4J_server_http_listen__address: `localhost:${NEO4J_HTTP_PORT}`
    }
  })
  
  neo4jProcess.stdout?.on('data', (data) => {
    console.log('[Neo4j]', data.toString())
  })
  
  neo4jProcess.stderr?.on('data', (data) => {
    console.error('[Neo4j Error]', data.toString())
  })
  
  // Wait for Neo4j to be ready
  await waitForNeo4j()
  
  // Create driver
  driver = neo4j.driver(
    `bolt://localhost:${NEO4J_BOLT_PORT}`,
    neo4j.auth.basic(USERNAME, PASSWORD)
  )
  
  // Verify connection
  await driver.verifyConnectivity()
  console.log('[Neo4j] Connected successfully')
  
  return driver
}

async function waitForNeo4j(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const testDriver = neo4j.driver(
        `bolt://localhost:${NEO4J_BOLT_PORT}`,
        neo4j.auth.basic(USERNAME, PASSWORD)
      )
      await testDriver.verifyConnectivity()
      await testDriver.close()
      return
    } catch (err) {
      console.log(`[Neo4j] Waiting for server... (${i + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  throw new Error('Neo4j failed to start')
}

export async function stopNeo4j(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
  
  if (neo4jProcess) {
    neo4jProcess.kill()
    neo4jProcess = null
  }
}

export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized')
  }
  return driver
}
```

4. **Integrate into app lifecycle:**

Update `src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron'
import { startNeo4j, stopNeo4j } from './services/neo4j'

let mainWindow: BrowserWindow | null = null

app.on('ready', async () => {
  try {
    // Start Neo4j
    await startNeo4j()
    console.log('[App] Neo4j started successfully')
    
    // Create window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    })
    
    // Load renderer
    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173')
    } else {
      mainWindow.loadFile('index.html')
    }
  } catch (error) {
    console.error('[App] Failed to start:', error)
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopNeo4j()
  console.log('[App] Neo4j stopped')
})
```

5. **Add test query IPC handler:**

Create `src/main/ipc/test.ts`:
```typescript
import { ipcMain } from 'electron'
import { getDriver } from '../services/neo4j'

export function registerTestHandlers() {
  ipcMain.handle('test:neo4j-query', async () => {
    const driver = getDriver()
    const session = driver.session()
    
    try {
      const result = await session.run('RETURN "Neo4j connected!" AS message')
      return {
        success: true,
        message: result.records[0].get('message')
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      await session.close()
    }
  })
}
```

Register in `src/main/index.ts`:
```typescript
import { registerTestHandlers } from './ipc/test'

app.on('ready', async () => {
  // ... after startNeo4j
  registerTestHandlers()
  // ... create window
})
```

6. **Expose to renderer via preload:**

Update `src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  test: {
    neo4jQuery: () => ipcRenderer.invoke('test:neo4j-query')
  }
})
```

Add TypeScript definitions for renderer:

Create `src/renderer/src/types/api.d.ts`:
```typescript
export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
  }
}

declare global {
  interface Window {
    api: API
  }
}
```

### Success Criteria

- [ ] Neo4j server starts when app launches
- [ ] Can connect with driver successfully
- [ ] Test query executes and returns result
- [ ] Neo4j stops cleanly when app quits
- [ ] No port conflicts or connection errors

### Testing

```bash
npm run dev
# Watch console for "[Neo4j] Connected successfully"
# Try test query from renderer (Step 4 will add UI)
```

### Commit

```bash
git add -A
git commit -m "feat: Add embedded Neo4j server subprocess with connection management"
```

---

## Step 3: Add Ollama Connection

**Objective:** Detect local Ollama installation, connect to it, list models, test query.

### Tasks

1. **Install dependencies:**
```bash
npm install ollama
```

2. **Create Ollama manager:**

Create `src/main/services/ollama.ts`:
```typescript
import { Ollama } from 'ollama'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let ollamaClient: Ollama | null = null
let defaultModel: string | null = null

export async function initializeOllama(): Promise<void> {
  // Check if Ollama is installed
  const isInstalled = await checkOllamaInstalled()
  
  if (!isInstalled) {
    throw new Error('Ollama is not installed. Please install via: brew install ollama')
  }
  
  // Create client
  ollamaClient = new Ollama({
    host: 'http://localhost:11434'
  })
  
  // Check if Ollama server is running
  try {
    const models = await ollamaClient.list()
    
    if (models.models.length === 0) {
      throw new Error('No Ollama models found. Please run: ollama pull llama3.2')
    }
    
    // Set default model (prefer llama3.2, then first available)
    const preferredModel = models.models.find(m => m.name.includes('llama3.2'))
    defaultModel = preferredModel?.name || models.models[0].name
    
    console.log(`[Ollama] Connected successfully. Default model: ${defaultModel}`)
  } catch (error) {
    throw new Error('Ollama server not running. Please start: ollama serve')
  }
}

async function checkOllamaInstalled(): Promise<boolean> {
  try {
    await execAsync('which ollama')
    return true
  } catch {
    return false
  }
}

export function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    throw new Error('Ollama client not initialized')
  }
  return ollamaClient
}

export function getDefaultModel(): string {
  if (!defaultModel) {
    throw new Error('No default model configured')
  }
  return defaultModel
}

export async function listModels(): Promise<string[]> {
  const client = getOllamaClient()
  const response = await client.list()
  return response.models.map(m => m.name)
}
```

3. **Integrate into app lifecycle:**

Update `src/main/index.ts`:
```typescript
import { initializeOllama } from './services/ollama'

app.on('ready', async () => {
  try {
    await startNeo4j()
    await initializeOllama()
    console.log('[App] All services initialized')
    
    // ... create window
  } catch (error) {
    console.error('[App] Failed to start:', error)
    app.quit()
  }
})
```

4. **Add test query IPC handler:**

Update `src/main/ipc/test.ts`:
```typescript
import { getOllamaClient, getDefaultModel, listModels } from '../services/ollama'

export function registerTestHandlers() {
  // ... existing neo4j handler
  
  ipcMain.handle('test:ollama-query', async () => {
    try {
      const client = getOllamaClient()
      const model = getDefaultModel()
      
      const response = await client.generate({
        model,
        prompt: 'Respond with exactly: "Ollama connected!"',
        stream: false
      })
      
      return {
        success: true,
        message: response.response,
        model
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
  
  ipcMain.handle('test:list-models', async () => {
    try {
      const models = await listModels()
      return {
        success: true,
        models
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}
```

5. **Update preload and types:**

Update `src/preload/index.ts`:
```typescript
contextBridge.exposeInMainWorld('api', {
  test: {
    neo4jQuery: () => ipcRenderer.invoke('test:neo4j-query'),
    ollamaQuery: () => ipcRenderer.invoke('test:ollama-query'),
    listModels: () => ipcRenderer.invoke('test:list-models')
  }
})
```

Update `src/renderer/src/types/api.d.ts`:
```typescript
export interface API {
  test: {
    neo4jQuery: () => Promise<{ success: boolean; message?: string; error?: string }>
    ollamaQuery: () => Promise<{ success: boolean; message?: string; model?: string; error?: string }>
    listModels: () => Promise<{ success: boolean; models?: string[]; error?: string }>
  }
}
```

### Success Criteria

- [ ] Detects locally installed Ollama
- [ ] Connects to Ollama server successfully
- [ ] Lists available models
- [ ] Selects default model (llama3.2 preferred)
- [ ] Test query executes and returns response
- [ ] Graceful error messages if Ollama not running

### Testing

```bash
# Ensure Ollama is running
ollama serve

# In another terminal
npm run dev
# Watch console for "[Ollama] Connected successfully"
```

### Commit

```bash
git add -A
git commit -m "feat: Add Ollama connection with local installation detection"
```

---

## Step 4: Create Test UI

**Objective:** Simple UI with buttons to test Neo4j and Ollama, display results.

### Tasks

1. **Create test component:**

Create `src/renderer/src/components/TestPanel.tsx`:
```typescript
import { createElement } from '../lib/jsx'

export function TestPanel(): HTMLElement {
  let statusDiv: HTMLElement
  
  async function testNeo4j() {
    updateStatus('Testing Neo4j...')
    const result = await window.api.test.neo4jQuery()
    
    if (result.success) {
      updateStatus(`✓ Neo4j: ${result.message}`, 'success')
    } else {
      updateStatus(`✗ Neo4j Error: ${result.error}`, 'error')
    }
  }
  
  async function testOllama() {
    updateStatus('Testing Ollama...')
    const result = await window.api.test.ollamaQuery()
    
    if (result.success) {
      updateStatus(`✓ Ollama (${result.model}): ${result.message}`, 'success')
    } else {
      updateStatus(`✗ Ollama Error: ${result.error}`, 'error')
    }
  }
  
  async function listModels() {
    updateStatus('Listing models...')
    const result = await window.api.test.listModels()
    
    if (result.success) {
      updateStatus(`✓ Available models: ${result.models?.join(', ')}`, 'success')
    } else {
      updateStatus(`✗ Error: ${result.error}`, 'error')
    }
  }
  
  async function testBoth() {
    await testNeo4j()
    await new Promise(resolve => setTimeout(resolve, 500))
    await testOllama()
  }
  
  function updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const colors = {
      info: 'text-blue-600',
      success: 'text-green-600',
      error: 'text-red-600'
    }
    
    statusDiv.className = `mt-4 p-4 rounded ${colors[type]}`
    statusDiv.textContent = message
  }
  
  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <h1 className="text-3xl font-bold mb-6">Cortex Phase 0 Test Panel</h1>
      
      <div className="space-y-4">
        <button
          onClick={testNeo4j}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Neo4j Connection
        </button>
        
        <button
          onClick={testOllama}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Ollama Connection
        </button>
        
        <button
          onClick={listModels}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          List Available Models
        </button>
        
        <button
          onClick={testBoth}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Test Full Stack
        </button>
      </div>
      
      <div
        ref={(el) => statusDiv = el as HTMLElement}
        className="mt-4 p-4 rounded text-gray-600"
      >
        Click a button to test services
      </div>
    </div>
  ) as HTMLElement
}
```

2. **Update main App:**

Update `src/renderer/src/App.tsx`:
```typescript
import { createElement } from './lib/jsx'
import { TestPanel } from './components/TestPanel'
import './main.css'

function App(): HTMLElement {
  return (
    <div className="min-h-screen bg-gray-100">
      {TestPanel()}
    </div>
  ) as HTMLElement
}

// Mount to DOM
document.getElementById('root')?.appendChild(App())
```

### Success Criteria

- [ ] UI renders with four buttons
- [ ] "Test Neo4j" button executes query and shows result
- [ ] "Test Ollama" button executes query and shows response
- [ ] "List Available Models" shows installed models
- [ ] "Test Full Stack" runs both tests sequentially
- [ ] Status messages display with appropriate colors
- [ ] Loading states are clear

### Testing

```bash
npm run dev
# Click each button and verify results
```

### Commit

```bash
git add -A
git commit -m "feat: Add test UI panel for Neo4j and Ollama verification"
```

---

## Step 5: Connect to Vault

**Objective:** Configure vault path, manually sync data, verify queries work against real data.

### Tasks

1. **Add vault configuration:**

Create `.env` file:
```bash
VAULT_PATH=/path/to/your/obsidian/vault
```

Add to `.gitignore`:
```
.env
```

2. **Create env template:**

Create `.env.template`:
```bash
# Path to your Obsidian vault
VAULT_PATH=/Users/yourname/Vaults/cortex
```

3. **Add vault path to main process:**

Update `src/main/index.ts`:
```typescript
import dotenv from 'dotenv'
dotenv.config()

const VAULT_PATH = process.env.VAULT_PATH

if (!VAULT_PATH) {
  console.error('[App] VAULT_PATH not configured in .env')
  app.quit()
}

console.log(`[App] Vault path: ${VAULT_PATH}`)
```

4. **Manual sync instructions:**

Create `docs/MANUAL_SYNC.md`:
```markdown
# Manual Neo4j Sync Instructions

## Prerequisites
- Obsidian vault with data
- obsidian-graphdb-sync plugin installed
- Cortex app running (so Neo4j server is available)

## Steps

1. **Start Cortex app:**
   \`\`\`bash
   npm run dev
   \`\`\`
   
   This starts the embedded Neo4j server at `bolt://localhost:7687`

2. **Configure obsidian-graphdb-sync plugin:**
   - Open Obsidian vault
   - Go to Settings → Community Plugins → obsidian-graphdb-sync
   - Set connection:
     - Host: `localhost`
     - Bolt Port: `7687`
     - Username: `neo4j`
     - Password: `cortex-dev-password`

3. **Run sync:**
   - In Obsidian, open Command Palette (Cmd+P)
   - Run: "Graph DB Sync: Sync vault to Neo4j"
   - Wait for completion

4. **Verify in Cortex:**
   - Click "Test Neo4j Connection" in Cortex UI
   - Should see confirmation
   - Can now query real vault data

## Testing Queries

Once synced, you can test queries against your data. Example:

\`\`\`cypher
MATCH (p:Person) RETURN p.name LIMIT 10
\`\`\`

This should return actual people from your vault.
```

5. **Add real data query to test panel:**

Update `src/main/ipc/test.ts`:
```typescript
ipcMain.handle('test:vault-data', async () => {
  const driver = getDriver()
  const session = driver.session()
  
  try {
    const result = await session.run(`
      MATCH (p:Person)
      RETURN p.name AS name
      LIMIT 5
    `)
    
    const people = result.records.map(r => r.get('name'))
    
    return {
      success: true,
      count: people.length,
      sample: people
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    await session.close()
  }
})
```

Update preload and add button to UI for testing vault data.

### Success Criteria

- [ ] Vault path configured via .env
- [ ] Can run obsidian-graphdb-sync against embedded Neo4j
- [ ] Sync completes successfully
- [ ] Test query returns real vault data
- [ ] Can see actual Person nodes from vault

### Testing

Follow `docs/MANUAL_SYNC.md` instructions, then verify in UI.

### Commit

```bash
git add -A
git commit -m "feat: Add vault configuration and manual sync documentation"
```

---

## Phase 0 Complete!

**You now have:**
- ✅ Electron app with TypeScript, JSX, Tailwind
- ✅ Embedded Neo4j server subprocess
- ✅ Connection to local Ollama
- ✅ Test UI verifying full stack
- ✅ Ability to sync and query real vault data

**Next steps (Phase 1):**
- Build actual chat interface
- Implement LLM → Cypher query generation
- Create first real use case (Person details view)
- Add file operations for vault interaction

---

## Troubleshooting

### Neo4j won't start
- Check logs in console
- Verify port 7687 and 7474 are not in use: `lsof -i :7687`
- Check Neo4j binary has execute permissions
- Try running Neo4j binary manually to see error

### Ollama connection fails
- Verify Ollama is running: `ollama list`
- Start Ollama server: `ollama serve`
- Check port 11434 is available
- Try manual query: `ollama run llama3.2 "test"`

### HMR not working
- Check Vite dev server is running on port 5173
- Try hard refresh in Electron window
- Restart dev server

### Sync fails
- Verify Neo4j credentials match in obsidian-graphdb-sync
- Check Neo4j is accepting connections: `bolt://localhost:7687`
- Look at Obsidian console for errors
- Try connecting with Neo4j Browser to verify server is up
