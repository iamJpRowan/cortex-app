import { createElement } from './lib/jsx'
import { TestPanel } from './components/TestPanel'
import './main.css'

export function App(): HTMLElement {
  return TestPanel()
}
