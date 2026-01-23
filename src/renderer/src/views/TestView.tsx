import { createElement } from '../lib/jsx'

/**
 * TestView
 * 
 * Test interface for verifying Neo4j, Ollama, and LLM agent connections.
 * Migrated from TestPanel component.
 */
export function TestView(): HTMLElement {
  let statusDiv: HTMLElement
  let ollamaStatusDiv: HTMLElement
  let llmToolStatusDiv: HTMLElement
  let agentQueryInput: HTMLInputElement
  let agentResponseDiv: HTMLElement
  let agentTraceDiv: HTMLElement

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

  async function testEchoTool() {
    updateLLMToolStatus('Testing Echo tool...', 'info')

    try {
      const result = await window.api.llm.toolsTest('echo', { message: 'Hello from TestView!' })

      if (result.success) {
        updateLLMToolStatus(
          `✓ Echo Tool Test Successful!\nTool: ${result.toolName}\nInput: ${JSON.stringify(result.args)}\nOutput: ${result.result}`,
          'success'
        )
      } else {
        updateLLMToolStatus(`✗ Echo Tool Error: ${result.error}`, 'error')
      }
    } catch (error) {
      updateLLMToolStatus(`✗ Echo Tool Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  async function queryAgent() {
    const message = agentQueryInput.value.trim()
    if (!message) {
      updateAgentResponse('Please enter a message to query the agent.', 'error')
      return
    }

    updateAgentResponse('Querying agent...', 'info')
    updateAgentTrace('')

    try {
      const result = await window.api.llm.query(message)

      if (result.success) {
        // Display response
        updateAgentResponse(
          `✓ Agent Response:\n${result.response || 'No response'}\n\nConversation ID: ${result.conversationId || 'N/A'}`,
          'success'
        )

        // Display trace
        if (result.trace && result.trace.length > 0) {
          const traceText = formatTrace(result.trace)
          updateAgentTrace(traceText)
        } else {
          updateAgentTrace('No execution trace available.')
        }
      } else {
        updateAgentResponse(
          `✗ Agent Error: ${result.error || 'Unknown error'}\n${result.suggestion ? `\nSuggestion: ${result.suggestion}` : ''}`,
          'error'
        )
        updateAgentTrace('')
      }
    } catch (error) {
      updateAgentResponse(
        `✗ Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
      updateAgentTrace('')
    }
  }

  function formatTrace(trace: Array<{
    type: 'tool_call' | 'tool_result' | 'assistant_message'
    toolName?: string
    args?: Record<string, any>
    result?: string
    content?: string
    timestamp?: number
  }>): string {
    const lines: string[] = []
    lines.push('Execution Trace:')
    lines.push('─'.repeat(50))

    for (const step of trace) {
      if (step.type === 'tool_call') {
        lines.push(`\n🔧 Tool Call: ${step.toolName || 'unknown'}`)
        if (step.args) {
          lines.push(`   Args: ${JSON.stringify(step.args, null, 2).split('\n').join('\n   ')}`)
        }
      } else if (step.type === 'tool_result') {
        lines.push(`\n✓ Tool Result: ${step.toolName || 'unknown'}`)
        if (step.result) {
          const resultLines = step.result.split('\n')
          if (resultLines.length > 1) {
            lines.push(`   Result:\n   ${resultLines.join('\n   ')}`)
          } else {
            lines.push(`   Result: ${step.result}`)
          }
        }
      } else if (step.type === 'assistant_message') {
        lines.push(`\n💬 Assistant Message:`)
        if (step.content) {
          const contentLines = step.content.split('\n')
          if (contentLines.length > 1) {
            lines.push(`   ${contentLines.join('\n   ')}`)
          } else {
            lines.push(`   ${step.content}`)
          }
        }
      }
    }

    return lines.join('\n')
  }

  function updateAgentResponse(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const statusClasses = {
      info: 'status-info',
      success: 'status-success',
      error: 'status-error'
    }

    agentResponseDiv.className = statusClasses[type]
    agentResponseDiv.textContent = message
  }

  function updateAgentTrace(message: string) {
    agentTraceDiv.textContent = message
    agentTraceDiv.className = message ? 'status-info font-mono text-sm whitespace-pre-wrap' : ''
  }

  function updateLLMToolStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const statusClasses = {
      info: 'status-info',
      success: 'status-success',
      error: 'status-error'
    }

    llmToolStatusDiv.className = statusClasses[type]
    llmToolStatusDiv.textContent = message
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
      } else if (target.textContent?.includes('Echo Tool')) {
        testEchoTool()
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

  // Removed outer container styling - CenterArea will handle layout
  return (
    <div className="h-full w-full bg-bg-secondary p-4 sm:p-8 overflow-auto">
      <div className="container-center card-padded">
        <h1 className="text-3xl font-bold mb-2 text-text-primary">Cortex Phase 0</h1>
        <p className="text-text-secondary mb-8">Test Connections</p>

        <div className="space-y-4">
          <div className="space-y-2">
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
              className="status-info"
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

              <div
                ref={(el: HTMLElement | null) => { if (el) ollamaStatusDiv = el }}
                className="status-info"
                role="status"
                aria-live="polite"
              >
                Click a button above to test Ollama connection
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary pt-4 mt-4">
            <h2 className="text-xl font-semibold mb-2 text-text-primary">LLM Tools</h2>
            <div className="space-y-2">
              <button
                onClick={testEchoTool}
                onKeyDown={handleKeyDown}
                className="btn-primary w-full text-lg"
                aria-label="Test Echo tool"
              >
                Test Echo Tool
              </button>

              <div
                ref={(el: HTMLElement | null) => { if (el) llmToolStatusDiv = el }}
                className="status-info"
                role="status"
                aria-live="polite"
              >
                Click the button above to test the Echo tool
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary pt-4 mt-4">
            <h2 className="text-xl font-semibold mb-2 text-text-primary">LLM Agent</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={(el: HTMLInputElement | null) => { if (el) agentQueryInput = el }}
                  type="text"
                  placeholder="Ask the agent a question (e.g., 'Count the nodes in Neo4j' or 'Echo hello world')"
                  className="flex-1 px-4 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary"
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      queryAgent()
                    }
                  }}
                  aria-label="Agent query input"
                />
                <button
                  onClick={queryAgent}
                  onKeyDown={handleKeyDown}
                  className="btn-primary px-6"
                  aria-label="Send query to agent"
                >
                  Send
                </button>
              </div>

              <div
                ref={(el: HTMLElement | null) => { if (el) agentResponseDiv = el }}
                className="status-info"
                role="status"
                aria-live="polite"
              >
                Enter a query above and click Send to test the agent
              </div>

              <div
                ref={(el: HTMLElement | null) => { if (el) agentTraceDiv = el }}
                className="status-info font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
                role="log"
                aria-label="Execution trace"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  ) as HTMLElement
}
