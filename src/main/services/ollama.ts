import { Ollama } from 'ollama'
import { execSync } from 'child_process'

let ollamaClient: Ollama | null = null
let defaultModel: string | null = null
let isInitialized = false

const OLLAMA_ENDPOINT = 'http://localhost:11434'

/**
 * Check if Ollama binary is installed on the system
 */
export function checkOllamaInstallation(): { installed: boolean; error?: string } {
  try {
    execSync('which ollama', { encoding: 'utf8', stdio: 'pipe' })
    return { installed: true }
  } catch (err) {
    const platform = process.platform
    let installInstructions = ''
    
    if (platform === 'darwin') {
      installInstructions = 'brew install ollama'
    } else if (platform === 'linux') {
      installInstructions = 'curl -fsSL https://ollama.com/install.sh | sh'
    } else if (platform === 'win32') {
      installInstructions = 'Download from https://ollama.com/download'
    }
    
    return {
      installed: false,
      error: `Ollama is not installed.\nPlease install Ollama:\n  ${installInstructions}\n\nAfter installation, start the Ollama server:\n  ollama serve`
    }
  }
}

/**
 * Verify Ollama server is running and accessible
 */
export async function checkOllamaServer(): Promise<{ running: boolean; error?: string }> {
  try {
    const client = new Ollama({ host: OLLAMA_ENDPOINT })
    await client.list()
    return { running: true }
  } catch (err) {
    return {
      running: false,
      error: `Ollama server is not running or not accessible at ${OLLAMA_ENDPOINT}.\nPlease start the Ollama server:\n  ollama serve`
    }
  }
}

/**
 * List all available models from the local Ollama instance
 */
export async function listModels(): Promise<string[]> {
  if (!ollamaClient) {
    throw new Error('Ollama client not initialized')
  }
  
  try {
    const response = await ollamaClient.list()
    return response.models.map(model => model.name)
  } catch (err) {
    throw new Error(`Failed to list models: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Select a default model, preferring llama3.2 if available
 */
function selectDefaultModel(models: string[]): string | null {
  if (models.length === 0) {
    return null
  }
  
  // Prefer models containing "llama3.2" in name
  const preferredModel = models.find(model => 
    model.toLowerCase().includes('llama3.2') || 
    model.toLowerCase().includes('llama-3.2')
  )
  
  if (preferredModel) {
    return preferredModel
  }
  
  // Fall back to first available model
  return models[0]
}

/**
 * Initialize Ollama connection and select default model
 */
export async function initializeOllama(): Promise<{ success: boolean; model?: string; error?: string }> {
  // Check if already initialized
  if (isInitialized && ollamaClient && defaultModel) {
    return { success: true, model: defaultModel }
  }
  
  // Check installation
  const installCheck = checkOllamaInstallation()
  if (!installCheck.installed) {
    return {
      success: false,
      error: installCheck.error
    }
  }
  
  // Check server
  const serverCheck = await checkOllamaServer()
  if (!serverCheck.running) {
    return {
      success: false,
      error: serverCheck.error
    }
  }
  
  // Create client
  try {
    ollamaClient = new Ollama({ host: OLLAMA_ENDPOINT })
    
    // List and select model
    const models = await listModels()
    if (models.length === 0) {
      return {
        success: false,
        error: 'No models available in Ollama.\nPlease pull a model:\n  ollama pull llama3.2'
      }
    }
    
    defaultModel = selectDefaultModel(models)
    if (!defaultModel) {
      return {
        success: false,
        error: 'Could not select a default model'
      }
    }
    
    isInitialized = true
    console.log(`[Ollama] Initialized with model: ${defaultModel}`)
    
    return {
      success: true,
      model: defaultModel
    }
  } catch (err) {
    return {
      success: false,
      error: `Failed to initialize Ollama: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

/**
 * Execute a test query to verify connectivity and model functionality
 */
export async function testQuery(prompt: string = 'Say hello in one sentence.'): Promise<{ success: boolean; response?: string; error?: string }> {
  if (!ollamaClient) {
    const initResult = await initializeOllama()
    if (!initResult.success) {
      return {
        success: false,
        error: initResult.error || 'Ollama not initialized'
      }
    }
    // After initialization, check again to ensure client is available
    if (!ollamaClient) {
      return {
        success: false,
        error: 'Ollama client failed to initialize'
      }
    }
  }
  
  if (!defaultModel) {
    return {
      success: false,
      error: 'No default model selected'
    }
  }
  
  try {
    const response = await ollamaClient.generate({
      model: defaultModel,
      prompt: prompt
    })
    
    return {
      success: true,
      response: response.response
    }
  } catch (err) {
    return {
      success: false,
      error: `Query failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

/**
 * Get the current default model
 */
export function getDefaultModel(): string | null {
  return defaultModel
}

/**
 * Get the Ollama client instance
 */
export function getClient(): Ollama {
  if (!ollamaClient) {
    throw new Error('Ollama client not initialized')
  }
  return ollamaClient
}
