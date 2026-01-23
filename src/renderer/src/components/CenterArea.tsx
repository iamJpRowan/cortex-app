import { createElement } from '../lib/jsx'

export interface CenterAreaProps {
  view?: () => HTMLElement
}

/**
 * CenterArea Component
 * 
 * Main content container for rendering views.
 * Ready for tab system integration later.
 * 
 * @param props - Component props
 * @param props.view - Optional view function that returns an HTMLElement
 * @returns {HTMLElement} The main content area element
 */
export function CenterArea(props: CenterAreaProps): HTMLElement {
  const { view } = props

  const centerClasses = [
    'center-area',
    'flex-1',
    'flex',
    'flex-col',
    'overflow-auto',
    'bg-bg-primary'
  ].join(' ')

  const main = createElement('main', {
    className: centerClasses,
    role: 'main',
    'aria-label': 'Main content area'
  }) as HTMLElement

  // Render view if provided
  if (view) {
    const viewContent = view()
    main.appendChild(viewContent)
  } else {
    const noViewDiv = createElement('div', {
      className: 'flex items-center justify-center h-full text-text-secondary'
    }) as HTMLElement
    noViewDiv.textContent = 'No view selected'
    main.appendChild(noViewDiv)
  }

  return main
}
