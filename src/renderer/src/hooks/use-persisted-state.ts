import * as React from 'react'

export interface UsePersistedStateOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (stored: string) => T
}

/**
 * useState that syncs to localStorage. Restores from storage on mount,
 * writes to storage on change. Use for UI state that should survive restarts.
 *
 * @param key localStorage key (use cortex.* namespace)
 * @param defaultValue fallback when storage is empty or invalid
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: UsePersistedStateOptions<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serialize = options?.serialize ?? JSON.stringify
  const deserialize = options?.deserialize ?? JSON.parse

  const [state, setState] = React.useState<T>(() => {
    if (typeof localStorage === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      if (stored === null) return defaultValue
      return deserialize(stored)
    } catch {
      return defaultValue
    }
  })

  const setPersisted = React.useCallback(
    (value: React.SetStateAction<T>) => {
      setState(prev => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        try {
          localStorage.setItem(key, serialize(next))
        } catch {
          // Ignore quota or other storage errors
        }
        return next
      })
    },
    [key, serialize]
  )

  return [state, setPersisted]
}
