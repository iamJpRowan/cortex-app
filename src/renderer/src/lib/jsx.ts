type JSXProps = Record<string, any> | null
type JSXChild = string | number | HTMLElement | DocumentFragment | null | false | undefined

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
    } else if (child instanceof HTMLElement || child instanceof DocumentFragment) {
      element.appendChild(child)
    }
  })
  
  return element
}

export function Fragment({ children }: { children?: JSXChild[] }): DocumentFragment {
  const fragment = document.createDocumentFragment()
  ;(children || []).flat().forEach(child => {
    if (child == null || child === false) return
    if (typeof child === 'string' || typeof child === 'number') {
      fragment.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof HTMLElement || child instanceof DocumentFragment) {
      fragment.appendChild(child)
    }
  })
  return fragment
}
