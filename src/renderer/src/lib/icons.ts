/**
 * Icon Helper Utility
 * 
 * Converts Lucide icons to HTMLElement for use with vanilla JSX.
 * Uses Lucide's createElement to automatically handle all icon rendering.
 */

import { createElement as lucideCreateElement } from 'lucide'
import * as LucideIcons from 'lucide'

// Type for icon names - automatically inferred from Lucide exports
// Filter out non-icon exports (functions like createElement, createIcons, etc.)
type IconName = Exclude<
  keyof typeof LucideIcons,
  'createElement' | 'createIcons' | 'icons' | 'default'
>

/**
 * Renders a Lucide icon as an HTMLElement
 * 
 * @param name - The name of the Lucide icon (e.g., 'PanelLeft', 'Menu', 'Home')
 * @param props - Optional props for the icon (size, color, className, etc.)
 * @returns HTMLElement representing the icon
 */
export function Icon(
  name: IconName,
  props: {
    size?: number | string
    color?: string
    className?: string
    'aria-label'?: string
    'aria-hidden'?: boolean
  } = {}
): HTMLElement {
  const iconData = LucideIcons[name]

  if (!iconData || typeof iconData !== 'object' || !Array.isArray(iconData)) {
    console.warn(`Icon "${name}" not found in Lucide`)
    // Return empty div as fallback
    const div = document.createElement('div')
    if (props.className) {
      div.className = props.className
    }
    return div
  }

  // Use Lucide's createElement to convert IconNode to SVG element
  const svg = lucideCreateElement(iconData, {
    size: props.size || 20,
    color: props.color || 'currentColor'
  }) as SVGElement

  // Add icon class for CSS styling (stroke-width will be applied via CSS)
  const existingClass = svg.getAttribute('class') || ''
  svg.setAttribute('class', `icon ${existingClass}`.trim())

  // Apply aria attributes
  if (props['aria-label']) {
    svg.setAttribute('aria-label', props['aria-label'])
  }
  if (props['aria-hidden'] !== undefined) {
    svg.setAttribute('aria-hidden', String(props['aria-hidden']))
  } else {
    svg.setAttribute('aria-hidden', 'true')
  }

  // Apply custom className if provided (after icon class)
  if (props.className) {
    const currentClass = svg.getAttribute('class') || ''
    svg.setAttribute('class', `${currentClass} ${props.className}`.trim())
  }

  return svg as unknown as HTMLElement
}
