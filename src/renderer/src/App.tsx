import { createElement } from './lib/jsx'

export function App(): HTMLElement {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Cortex Phase 0
        </h1>
        <p className="text-lg text-gray-600">
          Electron + TypeScript + JSX + Tailwind
        </p>
      </div>
    </div>
  ) as HTMLElement
}
