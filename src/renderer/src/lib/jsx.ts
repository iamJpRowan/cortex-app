/**
 * JSX Runtime for Vanilla JavaScript
 * 
 * Provides createElement and Fragment functions for JSX syntax without React.
 * Supports HTMLElement, SVGElement, and DocumentFragment as children.
 */

type JSXProps = Record<string, any> | null
type JSXChild = string | number | HTMLElement | SVGElement | DocumentFragment | null | false | undefined

/**
 * Creates a DOM element or calls a component function
 * 
 * @param tag - HTML tag name or component function
 * @param props - Element attributes and event handlers
 * @param children - Child elements, text nodes, or fragments
 * @returns {HTMLElement | DocumentFragment} The created element or fragment
 */
export function createElement(
  tag: string | ((props: JSXProps & { children?: JSXChild[] }) => HTMLElement | DocumentFragment),
  props: JSXProps,
  ...children: JSXChild[]
): HTMLElement | DocumentFragment {
  if (typeof tag === 'function') {
    return tag({ ...props, children })
  }
  
  const element = document.createElement(tag)
  
  // Set properties and attributes
  Object.entries(props || {}).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value as string
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.toLowerCase().substring(2)
      element.addEventListener(event, value as EventListener)
    } else if (key === 'ref' && typeof value === 'function') {
      value(element)
    } else if (key !== 'children') {
      element.setAttribute(key, String(value))
    }
  })
  
  // Append children
  children.flat().forEach(child => {
    if (child == null || child === false) return
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof HTMLElement || child instanceof SVGElement || child instanceof DocumentFragment) {
      element.appendChild(child)
    }
  })
  
  return element
}

/**
 * Creates a DocumentFragment for grouping elements without a wrapper
 * 
 * @param props - Fragment props
 * @param props.children - Child elements to include in the fragment
 * @returns {DocumentFragment} A document fragment containing the children
 */
export function Fragment({ children }: { children?: JSXChild[] }): DocumentFragment {
  const fragment = document.createDocumentFragment()
  ;(children || []).flat().forEach(child => {
    if (child == null || child === false) return
    if (typeof child === 'string' || typeof child === 'number') {
      fragment.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof HTMLElement || child instanceof SVGElement || child instanceof DocumentFragment) {
      fragment.appendChild(child)
    }
  })
  return fragment
}
