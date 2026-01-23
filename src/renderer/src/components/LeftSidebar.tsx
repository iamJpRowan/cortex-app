import { createElement } from '../lib/jsx'
import { Icon } from '../lib/icons'

export interface LeftSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/**
 * LeftSidebar Component
 * 
 * Collapsible left sidebar with icon-only mode when collapsed.
 * Fixed width: 250px expanded, 48px collapsed.
 * 
 * @param props - Component props
 * @param props.collapsed - Whether the sidebar is collapsed
 * @param props.onToggle - Callback function when toggle button is clicked
 * @returns {HTMLElement} The sidebar element
 */
export function LeftSidebar(props: LeftSidebarProps): HTMLElement {
  const { collapsed, onToggle } = props

  const sidebarClasses = [
    'left-sidebar',
    'flex',
    'flex-col',
    'border-r',
    'border-border-primary',
    'bg-bg-secondary',
    collapsed ? 'collapsed' : ''
  ].filter(Boolean).join(' ')

  const toggleButtonClasses = [
    'toggle-button',
    'btn-ghost',
    'p-1',
    'rounded-md',
    'self-start',
    'transition-colors'
  ].join(' ')

  return (
    <aside
      className={sidebarClasses}
      aria-label="Left sidebar"
      role="complementary"
    >
      {/* Toggle Button */}
      <button
        className={toggleButtonClasses}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        type="button"
      >
        {Icon('PanelLeft', {
          size: 20,
          'aria-hidden': true
        })}
      </button>

      {/* Navigation Items Placeholder */}
      <nav
        className="flex-1 flex flex-col gap-1 px-2"
        aria-label="Main navigation"
      >
        {/* Navigation items will go here */}
      </nav>
    </aside>
  ) as HTMLElement
}
