import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { FileText, Sun, Moon, Monitor } from 'lucide-react'
import { setTheme } from '@/lib/theme'

type Theme = 'light' | 'dark' | 'system'

interface Settings {
  'appearance.theme': Theme
  'hotkeys.commandPalette': string
  'hotkeys.settings': string
}

/**
 * SettingsView Component
 *
 * Form-based settings UI that displays all settings with appropriate form controls.
 * Shows merged view (defaults + overrides) and syncs changes bidirectionally.
 */
export function SettingsView() {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [filePath, setFilePath] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(true)

  // Load settings on mount
  React.useEffect(() => {
    loadSettings()
  }, [])

  // Subscribe to settings changes
  React.useEffect(() => {
    if (!window.api?.settings?.onChange) return

    const unsubscribe = window.api.settings.onChange(data => {
      // If theme changed externally (e.g., file edit), apply it immediately
      if (data.key === 'appearance.theme') {
        setTheme(data.value as Theme)
      }
      // Reload settings when external changes occur
      loadSettings()
    })

    return unsubscribe
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const result = await window.api?.settings?.get()
      if (result?.success && result.data) {
        const newSettings = result.data as Settings
        setSettings(newSettings)
        // Don't apply theme here - it's already applied on app startup via initTheme()
        // Only apply theme when user explicitly changes it via UI
      }

      const pathResult = await window.api?.settings?.getFilePath()
      if (pathResult?.success && pathResult.data) {
        setFilePath(pathResult.data)
      }
    } catch (error) {
      console.error('[SettingsView] Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeChange = (value: Theme) => {
    if (!settings) return
    // setTheme(persist: true) writes to settings; avoids feedback loop from onChange.
    setTheme(value, { persist: true })
    setSettings({ ...settings, 'appearance.theme': value })
  }

  const handleOpenInEditor = async () => {
    try {
      await window.api?.settings?.openInEditor()
    } catch (error) {
      console.error('[SettingsView] Failed to open in editor:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-text-secondary">Loading settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-text-secondary">Failed to load settings</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Open in Editor button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage application preferences and configuration
          </p>
        </div>
        <Button onClick={handleOpenInEditor} variant="outline">
          <FileText className="h-4 w-4" />
          Open in Editor
        </Button>
      </div>

      <Separator />

      {/* Settings List */}
      <div className="flex flex-col gap-6">
        {/* Appearance Section */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium text-text-primary">Appearance</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Customize the look and feel of the application
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="theme-select"
              className="text-sm font-medium text-text-primary"
            >
              Theme
            </label>
            <Select
              value={settings['appearance.theme']}
              onValueChange={handleThemeChange}
            >
              <SelectTrigger id="theme-select" className="w-[200px]">
                <SelectValue>
                  {settings['appearance.theme'] === 'light' && (
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  )}
                  {settings['appearance.theme'] === 'dark' && (
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  )}
                  {settings['appearance.theme'] === 'system' && (
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-text-secondary">
              Choose between light, dark, or system theme
            </p>
          </div>
        </div>

        <Separator />

        {/* Hotkeys Section */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium text-text-primary">Keyboard Shortcuts</h2>
            <p className="mt-1 text-sm text-text-secondary">
              App-level keyboard shortcuts (read-only for now)
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary">
                Command Palette
              </label>
              <Input
                value={settings['hotkeys.commandPalette']}
                readOnly
                className="w-[200px] bg-bg-secondary"
              />
              <p className="text-xs text-text-secondary">Open the command palette</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary">Settings</label>
              <Input
                value={settings['hotkeys.settings']}
                readOnly
                className="w-[200px] bg-bg-secondary"
              />
              <p className="text-xs text-text-secondary">Open the settings view</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Path Display */}
      {filePath && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-text-secondary">Settings File</p>
            <p className="text-xs text-text-secondary font-mono break-all">{filePath}</p>
          </div>
        </>
      )}
    </div>
  )
}
