import { createElement } from './lib/jsx'
import { Layout } from './components/Layout'
import { TestView } from './views/TestView'
import './main.css'

/**
 * App Component
 * 
 * Root application component that sets up the main layout structure.
 * 
 * @returns {HTMLElement} The root application element
 */
export function App(): HTMLElement {
  return Layout({ view: TestView })
}
