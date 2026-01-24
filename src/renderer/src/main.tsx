import './main.css'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initTheme } from './lib/theme'

function init() {
  // Initialize theme system first
  initTheme()
  
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('Root element not found')
    return
  }
  
  const root = createRoot(rootElement)
  root.render(<App />)
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
