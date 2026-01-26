import * as React from 'react'
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
} from 'kbar'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getCommands } from '@/lib/commands'

/**
 * Command Palette Results Component
 * Renders the list of filtered commands
 */
function CommandResults() {
  const { results } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === 'string') {
          return (
            <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase">
              {item}
            </div>
          )
        }

        return (
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 cursor-pointer text-text-primary',
              active && 'bg-bg-tertiary'
            )}
          >
            <div className="flex-1">
              <div className="text-sm font-medium">{item.name}</div>
            </div>
            {item.shortcut && (
              <div className="flex gap-1">
                {item.shortcut.map(key => (
                  <kbd
                    key={key}
                    className="
                      px-2 py-1 text-xs font-mono bg-bg-secondary border
                      border-border-primary rounded
                    "
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

/**
 * CommandPalette Component
 *
 * Wraps the app with KBarProvider and renders the command palette UI.
 * The palette opens with Cmd+K / Ctrl+K and allows searching/executing commands.
 */
export function CommandPalette({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const actions = React.useMemo(() => getCommands({ navigate }), [navigate])

  return (
    <KBarProvider actions={actions}>
      {children}
      <KBarPortal>
        <KBarPositioner
          className="
            fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh] px-4
          "
        >
          <KBarAnimator
            className="
              w-full max-w-2xl rounded-lg border border-border-primary bg-bg-primary
              shadow-lg overflow-hidden
            "
          >
            <KBarSearch
              className="
                w-full px-4 py-3 text-base bg-transparent outline-none text-text-primary
                placeholder:text-text-secondary
              "
              placeholder="Type a command or search..."
            />
            <div className="max-h-[60vh] overflow-y-auto border-t border-border-primary">
              <CommandResults />
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </KBarProvider>
  )
}
