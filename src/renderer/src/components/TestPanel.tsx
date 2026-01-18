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
  
  function updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const colors = {
      info: 'text-blue-600 bg-blue-50',
      success: 'text-green-700 bg-green-50',
      error: 'text-red-700 bg-red-50'
    }
    
    statusDiv.className = `mt-4 p-4 rounded border ${colors[type]}`
    statusDiv.textContent = message
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Cortex Phase 0</h1>
        <p className="text-gray-600 mb-8">Test Neo4j Connection</p>
        
        <button
          onClick={testNeo4j}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
        >
          Test Neo4j Connection
        </button>
        
        <div
          ref={(el: HTMLElement | null) => { if (el) statusDiv = el }}
          className="mt-4 p-4 rounded border text-gray-600 bg-gray-50"
        >
          Click the button above to test Neo4j connection
        </div>
      </div>
    </div>
  ) as HTMLElement
}
