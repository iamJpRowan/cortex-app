import { app, BrowserWindow } from 'electron'
import path from 'path'
import { startNeo4j, stopNeo4j } from './services/neo4j'
import { initializeOllama } from './services/ollama'
import { registerTestHandlers } from './ipc/test'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    // Start Neo4j
    await startNeo4j()
    console.log('[App] Neo4j started successfully')
    
    // Initialize Ollama (non-blocking - app can run without it)
    const ollamaResult = await initializeOllama()
    if (ollamaResult.success) {
      console.log(`[App] Ollama initialized successfully with model: ${ollamaResult.model}`)
    } else {
      console.warn(`[App] Ollama initialization failed: ${ollamaResult.error}`)
      console.warn('[App] App will continue without Ollama (limited functionality)')
    }
    
    // Register IPC handlers
    registerTestHandlers()
    
    // Create window
    createWindow()
  } catch (error) {
    console.error('[App] Failed to start:', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', async () => {
  await stopNeo4j()
  console.log('[App] Neo4j stopped')
})

// Handle process termination signals (Ctrl+C, etc.)
// This ensures Neo4j is cleaned up even when dev server is killed
process.on('SIGINT', async () => {
  await stopNeo4j()
  app.quit()
})

process.on('SIGTERM', async () => {
  await stopNeo4j()
  app.quit()
})
