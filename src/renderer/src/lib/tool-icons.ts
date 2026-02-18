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

/**
 * Return a Lucide icon component by name (PascalCase or kebab-case).
 * Loads icons dynamically via lucide-react/dynamic so any Lucide icon
 * from the registry works without code changes (including plugin tools).
 * Fallback: Wrench.
 */
export function getToolIcon(iconName?: string): LucideIcon {
  const name = iconName?.trim()
  if (!name) return Wrench as LucideIcon
  const key = toIconName(name)
  const DynamicToolIcon = (props: React.ComponentProps<LucideIcon>) =>
    React.createElement(DynamicIcon, {
      name: key as IconName,
      fallback: () => React.createElement(Wrench, props),
      ...props,
    } as React.ComponentProps<typeof DynamicIcon>)
  return DynamicToolIcon as unknown as LucideIcon
}
