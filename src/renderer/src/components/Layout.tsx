import { createElement } from '../lib/jsx'
import { LeftSidebar } from './LeftSidebar'
import { CenterArea } from './CenterArea'

export interface LayoutProps {
  view?: () => HTMLElement
}

interface LayoutState {
  leftSidebar: {
    collapsed: boolean
  }
}

/**
 * Layout Component
 * 
 * Main layout container with left sidebar, center area, and right sidebar placeholder.
 * Manages layout state and coordinates between sidebar and center area.
 * 
 * Uses closure-based state management to track sidebar collapse state.
 * Updates DOM directly to preserve CSS transitions for smooth animations.
 * 
 * @param props - Component props
 * @param props.view - Optional view function that returns an HTMLElement to render in center area
 * @returns {HTMLElement} The layout container element
 */
export function Layout(props: LayoutProps = {}): HTMLElement {
  // Closure-based state management
  const state: LayoutState = {
    leftSidebar: {
      collapsed: false
    }
  }

  const container = createElement('div', {
    className: 'layout-container'
  }) as HTMLElement

  let leftSidebarElement: HTMLElement
  let centerAreaElement: HTMLElement

  function handleSidebarToggle() {
    state.leftSidebar.collapsed = !state.leftSidebar.collapsed
    updateLayout()
  }

  function updateLayout() {
    // Update sidebar using CSS classes (no inline styles needed)
    if (leftSidebarElement) {
      // Use class-based approach - CSS handles the transition automatically
      if (state.leftSidebar.collapsed) {
        leftSidebarElement.classList.add('collapsed')
      } else {
        leftSidebarElement.classList.remove('collapsed')
      }

      // Update button aria attributes with null safety
      const button = leftSidebarElement.querySelector('button')
      if (button && button instanceof HTMLButtonElement) {
        button.setAttribute('aria-label', state.leftSidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar')
        button.setAttribute('aria-expanded', String(!state.leftSidebar.collapsed))
      }
    }

    // Center area doesn't need updates for sidebar collapse
    // (CSS Grid automatically adjusts layout)
  }

  // Initial render
  leftSidebarElement = LeftSidebar({
    collapsed: state.leftSidebar.collapsed,
    onToggle: handleSidebarToggle
  })

  centerAreaElement = CenterArea({
    view: props.view
  })

  const rightSidebarPlaceholder = createElement('div', {
    className: 'right-sidebar-placeholder'
  }) as HTMLElement

  container.appendChild(leftSidebarElement)
  container.appendChild(centerAreaElement)
  container.appendChild(rightSidebarPlaceholder)

  return container
}
