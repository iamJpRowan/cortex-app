import './main.css'
import { TitleBar } from './components/TitleBar'

/**
 * App Component
 * 
 * Root application component that sets up the main layout structure.
 * 
 * TODO: Convert Layout and other components to React in Phase 4
 */
export function App() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <TitleBar />
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h1 className="text-xl font-semibold">React Migration - Phase 3 Complete</h1>
          <p className="mt-2">Frameless window with custom controls is now set up.</p>
        </div>
      </div>
    </div>
  )
}
