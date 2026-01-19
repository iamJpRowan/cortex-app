import './main.css'
import { App } from './App'
import { initTheme } from './lib/theme'

function init() {
  // Initialize theme system first
  initTheme()
  
  const root = document.getElementById('root')
  if (!root) {
    console.error('Root element not found')
    return
  }
  
  root.appendChild(App())
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
