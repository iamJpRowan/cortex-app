import { createElement } from '../lib/jsx'

export function TestPanel(): HTMLElement {
  let statusDiv: HTMLElement
  let ollamaStatusDiv: HTMLElement
  
  async function testNeo4j() {
    updateStatus('Testing Neo4j connection...', 'info')
    
    try {
      const result = await window.api.test.neo4jQuery()
      
      if (result.success) {
        updateStatus(`✓ Neo4j Connected! Message: ${result.message}`, 'success')
      } else {
        updateStatus(`✗ Neo4j Error: ${result.error}`, 'error')
      }
    } catch (error) {
      updateStatus(`✗ Neo4j Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }
  
  async function testOllama() {
    updateOllamaStatus('Testing Ollama connection...', 'info')
    
    try {
      // First check default model
      const modelResult = await window.api.test.ollamaGetDefaultModel()
      
      if (!modelResult.success || !modelResult.model) {
        updateOllamaStatus('✗ Ollama Error: No default model available. Please initialize Ollama.', 'error')
        return
      }
      
      updateOllamaStatus(`Using model: ${modelResult.model}. Testing query...`, 'info')
      
      // Execute test query
      const queryResult = await window.api.test.ollamaQuery('Say hello in one sentence.')
      
      if (queryResult.success) {
        updateOllamaStatus(`✓ Ollama Connected! Model: ${modelResult.model}\nResponse: ${queryResult.response}`, 'success')
      } else {
        updateOllamaStatus(`✗ Ollama Error: ${queryResult.error}`, 'error')
      }
    } catch (error) {
      updateOllamaStatus(`✗ Ollama Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }
  
  async function listOllamaModels() {
    updateOllamaStatus('Listing available models...', 'info')
    
    try {
      const result = await window.api.test.ollamaListModels()
      
      if (result.success && result.models) {
        const modelList = result.models.length > 0 
          ? result.models.join(', ')
          : 'No models available'
        updateOllamaStatus(`Available models: ${modelList}`, 'success')
      } else {
        updateOllamaStatus(`✗ Error: ${result.error}`, 'error')
      }
    } catch (error) {
      updateOllamaStatus(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const target = event.target as HTMLElement
      if (target.textContent?.includes('Neo4j')) {
        testNeo4j()
      } else if (target.textContent?.includes('Ollama Query')) {
        testOllama()
      } else if (target.textContent?.includes('List Models')) {
        listOllamaModels()
      }
    }
  }
  
  function updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const statusClasses = {
      info: 'status-info',
      success: 'status-success',
      error: 'status-error'
    }
    
    statusDiv.className = statusClasses[type]
    statusDiv.textContent = message
  }
  
  function updateOllamaStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const statusClasses = {
      info: 'status-info',
      success: 'status-success',
      error: 'status-error'
    }
    
    ollamaStatusDiv.className = statusClasses[type]
    ollamaStatusDiv.textContent = message
  }
  
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4 sm:p-8">
      <div className="container card-padded">
        <h1 className="text-3xl font-bold mb-2 text-text-primary">Cortex Phase 0</h1>
        <p className="text-text-secondary mb-8">Test Connections</p>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-text-primary">Neo4j</h2>
            <button
              onClick={testNeo4j}
              onKeyDown={handleKeyDown}
              className="btn-primary w-full text-lg"
              aria-label="Test Neo4j database connection"
            >
              Test Neo4j Connection
            </button>
            
            <div
              ref={(el: HTMLElement | null) => { if (el) statusDiv = el }}
              className="status-info mt-4"
              role="status"
              aria-live="polite"
            >
              Click the button above to test Neo4j connection
            </div>
          </div>
          
          <div className="border-t border-border-primary pt-4 mt-4">
            <h2 className="text-xl font-semibold mb-2 text-text-primary">Ollama</h2>
            <div className="space-y-2">
              <button
                onClick={testOllama}
                onKeyDown={handleKeyDown}
                className="btn-primary w-full text-lg"
                aria-label="Test Ollama connection and query"
              >
                Test Ollama Query
              </button>
              
              <button
                onClick={listOllamaModels}
                onKeyDown={handleKeyDown}
                className="btn-secondary w-full"
                aria-label="List available Ollama models"
              >
                List Available Models
              </button>
            </div>
            
            <div
              ref={(el: HTMLElement | null) => { if (el) ollamaStatusDiv = el }}
              className="status-info mt-4"
              role="status"
              aria-live="polite"
            >
              Click a button above to test Ollama connection
            </div>
          </div>
        </div>
      </div>
    </div>
  ) as HTMLElement
}
