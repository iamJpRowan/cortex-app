# Development Workflow

## Running the Application

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

## Development Mode Details

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

## When to Restart vs Hot Reload

**Hot Reload Works (No Restart Needed):**
- ✅ **Renderer code changes** (`src/renderer/**/*.tsx`, `.ts`, `.jsx`, `.js`)
  - Component files, UI logic, event handlers
  - CSS/Tailwind changes
  - Renderer-side utilities and helpers
- ✅ **Renderer HTML** (`src/renderer/index.html`)
- ✅ **TypeScript type definitions** (as long as they don't affect main process)
- ✅ **Configuration files** that only affect renderer (e.g., Tailwind config changes)

**Full Restart Required:**
- 🔄 **Main process code** (`src/main/**/*.ts`, `.js`)
  - IPC handlers, service initialization
  - App lifecycle hooks (`app.on('ready')`, etc.)
  - Neo4j/Ollama service management
- 🔄 **Preload script** (`src/preload/**/*.ts`, `.js`)
  - Changes to `contextBridge.exposeInMainWorld()` API
  - IPC channel definitions
- 🔄 **Build configuration** (`electron.vite.config.ts`, `tsconfig.json`, `package.json`)
  - Changes to Vite config, TypeScript settings, dependencies
- 🔄 **Environment variables** (`.env` file changes)
- 🔄 **New dependencies** (after `npm install`)

**Automatic Restart:**
- electron-vite automatically restarts the Electron app when main process or preload files change
- You'll see "Restarting Electron..." in the terminal
- No manual intervention needed

**Manual Restart Needed:**
- If hot reload seems stuck or changes aren't appearing
- After installing new npm packages
- When configuration files change (config, tsconfig, package.json)
- If you see build errors that persist after file changes
- When adding new IPC channels (sometimes needs restart to register properly)

**Quick Reference:**
```
Renderer changes → Hot reload ✅
Main/Preload changes → Auto-restart 🔄
Config changes → Manual restart 🔄
New packages → Manual restart 🔄
```

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
