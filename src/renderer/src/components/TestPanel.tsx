import { createElement } from '../lib/jsx'

export function TestPanel(): HTMLElement {
  let statusDiv: HTMLElement
  
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
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      testNeo4j()
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
  
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4 sm:p-8">
      <div className="container card-padded">
        <h1 className="text-3xl font-bold mb-2 text-text-primary">Cortex Phase 0</h1>
        <p className="text-text-secondary mb-8">Test Neo4j Connection</p>
        
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
    </div>
  ) as HTMLElement
}
