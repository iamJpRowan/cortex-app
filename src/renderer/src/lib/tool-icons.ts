import * as React from 'react'
import { DynamicIcon } from 'lucide-react/dynamic'
import type { IconName } from 'lucide-react/dynamic'
import { Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** PascalCase to kebab-case (e.g. ChartNetwork -> chart-network). */
function pascalToKebab(str: string): string {
  return str.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`).replace(/^-/, '')
}

/** Normalize icon name to kebab-case for dynamicIconImports keys. */
function toIconName(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return trimmed
  const kebab = pascalToKebab(trimmed)
  return kebab || trimmed.toLowerCase()
}

/** Cache icon component by normalized name so we return a stable reference and avoid flicker. */
const iconCache = new Map<string, LucideIcon>()

/**
 * Return a Lucide icon component by name (PascalCase or kebab-case).
 * Loads icons dynamically via lucide-react/dynamic so any Lucide icon
 * from the registry works without code changes (including plugin tools).
 * Fallback: Wrench. Cached by normalized name to avoid re-creating components and icon flicker.
 */
export function getToolIcon(iconName?: string): LucideIcon {
  const name = iconName?.trim()
  if (!name) return Wrench as LucideIcon
  const key = toIconName(name)
  const cached = iconCache.get(key)
  if (cached) return cached
  const DynamicToolIcon = (props: React.ComponentProps<LucideIcon>) =>
    React.createElement(DynamicIcon, {
      name: key as IconName,
      fallback: () => React.createElement(Wrench, props),
      ...props,
    } as React.ComponentProps<typeof DynamicIcon>)
  const component = DynamicToolIcon as unknown as LucideIcon
  iconCache.set(key, component)
  return component
}
