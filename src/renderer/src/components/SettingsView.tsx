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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  FileText,
  Sun,
  Moon,
  Monitor,
  Bot,
  Keyboard,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Settings as CogIcon,
} from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { ProviderIcon, getProviderIdFromModelId } from '@/components/ProviderIcon'
import type { ListModelsResult, ModelMetadata } from '@shared/types'
import { cn } from '@/lib/utils'
import { setTheme } from '@/lib/theme'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  SETTINGS_TAB_KEY,
  SETTINGS_PROVIDER_EXPANDED_KEY,
  SETTINGS_SCROLL_KEY,
} from '@/lib/layout-storage'

type Theme = 'light' | 'dark' | 'system'
const VALID_SETTINGS_TABS = ['llm', 'appearance', 'shortcuts'] as const

/** Per-provider config in settings (encrypted keys never exposed to renderer). */
type LLMProvidersConfig = Record<string, Record<string, unknown>>

interface Settings {
  'appearance.theme': Theme
  'hotkeys.commandPalette': string
  'hotkeys.settings': string
  'llm.defaultModel': string
  'llm.providers': LLMProvidersConfig
}

type ProviderTestStatus =
  | 'idle'
  | 'loading'
  | { success: true; modelCount: number }
  | { success: false; error: string }

/**
 * SettingsView Component
 *
 * Form-based settings UI that displays all settings with appropriate form controls.
 * Shows merged view (defaults + overrides) and syncs changes bidirectionally.
 */
const OLLAMA_DEFAULT_BASE_URL = 'http://127.0.0.1:11434'
/** Sentinel for "Use fallback" in default model Select (Radix disallows value="") */
const DEFAULT_MODEL_FALLBACK = '__fallback__'

export function SettingsView() {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [providerTestStatus, setProviderTestStatus] = React.useState<
    Record<string, ProviderTestStatus>
  >({})
  const [anthropicKeyInput, setAnthropicKeyInput] = React.useState('')
  const [anthropicSaveMessage, setAnthropicSaveMessage] = React.useState<
    'success' | 'error' | null
  >(null)
  const [ollamaBaseUrlInput, setOllamaBaseUrlInput] = React.useState('')
  const [modelList, setModelList] = React.useState<ListModelsResult | null>(null)
  const [activeTab, setActiveTab] = usePersistedState(SETTINGS_TAB_KEY, 'llm', {
    deserialize: s => {
      try {
        const v = JSON.parse(s) as string
        return VALID_SETTINGS_TABS.includes(v as (typeof VALID_SETTINGS_TABS)[number])
          ? (v as (typeof VALID_SETTINGS_TABS)[number])
          : 'llm'
      } catch {
        return 'llm'
      }
    },
  })
  const [providerExpanded, setProviderExpanded] = usePersistedState<
    Record<string, boolean>
  >(
    SETTINGS_PROVIDER_EXPANDED_KEY,
    { ollama: false, anthropic: false },
    {
      deserialize: s => {
        try {
          const o = JSON.parse(s) as Record<string, unknown>
          if (o && typeof o === 'object') {
            const out: Record<string, boolean> = {}
            for (const k of ['ollama', 'anthropic']) {
              out[k] = typeof o[k] === 'boolean' ? o[k] : false
            }
            return out
          }
        } catch {
          /* invalid stored value */
        }
        return { ollama: false, anthropic: false }
      },
    }
  )
  const [discoverableByProvider, setDiscoverableByProvider] = React.useState<
    Record<string, ModelMetadata[]>
  >({})
  const scrollPositionRef = React.useRef(0)
  const initialProviderTestsRunRef = React.useRef(false)

  // Restore scroll position on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_SCROLL_KEY)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!Number.isNaN(n) && n >= 0) {
        scrollPositionRef.current = n
        requestAnimationFrame(() => {
          const el = document.querySelector(
            '[data-settings-scroll]'
          ) as HTMLElement | null
          if (el) el.scrollTop = n
        })
      }
    }
  }, [])

  // Save scroll position on scroll (debounced)
  React.useEffect(() => {
    const el = document.querySelector('[data-settings-scroll]') as HTMLElement | null
    if (!el) return
    let timeout: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        scrollPositionRef.current = el.scrollTop
        localStorage.setItem(SETTINGS_SCROLL_KEY, String(el.scrollTop))
      }, 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timeout)
    }
  }, [])

  // Load settings on mount
  React.useEffect(() => {
    loadSettings()
  }, [])

  // Load model list when settings or provider test results change (so list
  // updates after fixing a connection, e.g. saving API key)
  React.useEffect(() => {
    if (!settings) return
    let cancelled = false
    window.api?.llm?.listModels().then(result => {
      if (!cancelled && result) setModelList(result)
    })
    return () => {
      cancelled = true
    }
  }, [settings, providerTestStatus])

  // If the stored default model is not in the enabled list, clear it
  React.useEffect(() => {
    if (!settings || !modelList) return
    const defaultModel = settings['llm.defaultModel'] ?? ''
    if (!defaultModel) return
    const isEnabled = modelList.all.some(m => m.id === defaultModel)
    if (!isEnabled) {
      window.api?.settings?.set('llm.defaultModel', '').then(res => {
        if (res?.success && res?.data !== undefined) {
          loadSettings({ skipLoading: true })
        }
      })
    }
  }, [settings, modelList])

  // Run provider tests once when opening LLM settings (when settings first load)
  // to show current connection status. Other tests: after API/key save (that
  // provider only) and manual refresh icon per provider.
  React.useEffect(() => {
    if (!settings || initialProviderTestsRunRef.current) return
    initialProviderTestsRunRef.current = true
    const prov = settings['llm.providers'] ?? {}
    handleTestProvider('ollama')
    if (typeof prov.anthropic === 'object' && prov.anthropic !== null) {
      handleTestProvider('anthropic')
    }
  }, [settings])

  // Subscribe to settings changes
  React.useEffect(() => {
    if (!window.api?.settings?.onChange) return

    const unsubscribe = window.api.settings.onChange(data => {
      if (data.key === 'appearance.theme') {
        setTheme(data.value as Theme)
      }
      // Reload without showing loading state to avoid scroll jump
      loadSettings({ skipLoading: true })
    })

    return unsubscribe
  }, [])

  const loadSettings = async (options?: { skipLoading?: boolean }) => {
    try {
      if (!options?.skipLoading) setIsLoading(true)
      const result = await window.api?.settings?.get()
      if (result?.success && result.data) {
        const newSettings = result.data as Settings
        setSettings(newSettings)
      }
    } catch (error) {
      console.error('[SettingsView] Failed to load settings:', error)
    } finally {
      if (!options?.skipLoading) setIsLoading(false)
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

  const providers = settings?.['llm.providers'] ?? {}
  const ollamaConfig = (providers.ollama as Record<string, unknown> | undefined) ?? {}
  const ollamaBaseUrlFromSettings =
    typeof ollamaConfig.baseUrl === 'string' ? ollamaConfig.baseUrl : ''
  const isOllamaConfigured = 'ollama' in providers

  // Sync Ollama input from settings when settings load or change
  React.useEffect(() => {
    setOllamaBaseUrlInput(ollamaBaseUrlFromSettings)
  }, [ollamaBaseUrlFromSettings])

  const ollamaBaseUrl = ollamaBaseUrlInput
  const isAnthropicConfigured =
    typeof providers.anthropic === 'object' && providers.anthropic !== null

  const handleOllamaBaseUrlBlur = async () => {
    if (!settings) return
    const value = ollamaBaseUrlInput.trim() || undefined
    const next = { ...providers }
    if (value !== undefined && value !== '') {
      next.ollama = { ...ollamaConfig, baseUrl: value }
    } else {
      delete next.ollama
    }
    const res = await window.api?.settings?.set('llm.providers', next)
    if (res?.success) {
      setSettings({ ...settings, 'llm.providers': next })
      handleTestProvider('ollama')
    }
  }

  const handleTestProvider = async (providerId: string) => {
    const scrollEl = document.querySelector(
      '[data-settings-scroll]'
    ) as HTMLElement | null
    if (scrollEl) scrollPositionRef.current = scrollEl.scrollTop
    setProviderTestStatus(s => ({ ...s, [providerId]: 'loading' }))
    try {
      const result = await window.api?.llm?.testProvider(providerId)
      if (result?.success === true) {
        setProviderTestStatus(s => ({
          ...s,
          [providerId]: { success: true, modelCount: result.modelCount ?? 0 },
        }))
      } else {
        setProviderTestStatus(s => ({
          ...s,
          [providerId]: {
            success: false,
            error: (result as { error?: string })?.error ?? 'Unknown error',
          },
        }))
      }
    } catch {
      setProviderTestStatus(s => ({
        ...s,
        [providerId]: { success: false, error: 'Request failed' },
      }))
    }
  }

  // Restore scroll position after test status updates to prevent jump
  React.useEffect(() => {
    const scrollEl = document.querySelector(
      '[data-settings-scroll]'
    ) as HTMLElement | null
    if (scrollEl && scrollPositionRef.current) {
      scrollEl.scrollTop = scrollPositionRef.current
    }
  }, [providerTestStatus])

  const handleClearProvider = async (providerId: string) => {
    if (!settings) return
    const next = { ...providers }
    delete next[providerId]
    const res = await window.api?.settings?.set('llm.providers', next)
    if (res?.success) {
      setSettings({ ...settings, 'llm.providers': next })
      setProviderTestStatus(s => ({ ...s, [providerId]: 'idle' }))
      if (providerId === 'anthropic') {
        setAnthropicKeyInput('')
        setAnthropicSaveMessage(null)
      }
    }
  }

  const defaultModel = settings?.['llm.defaultModel'] ?? ''
  const defaultModelInList = modelList?.all?.some(m => m.id === defaultModel)
  const defaultModelSelectValue =
    defaultModel === '' || !defaultModelInList ? DEFAULT_MODEL_FALLBACK : defaultModel

  function getEnabledModelIds(providerId: string): string[] {
    const config = providers[providerId] as Record<string, unknown> | undefined
    const ids = config?.enabledModelIds
    return Array.isArray(ids) ? (ids as string[]) : []
  }

  const handleSetEnabledModels = async (providerId: string, enabledIds: string[]) => {
    if (!settings) return
    const config = (providers[providerId] as Record<string, unknown>) ?? {}
    const next = { ...providers }
    next[providerId] = { ...config, enabledModelIds: enabledIds }
    const res = await window.api?.settings?.set('llm.providers', next)
    if (res?.success) {
      setSettings({ ...settings, 'llm.providers': next })
      const listResult = await window.api?.llm?.listModels()
      if (listResult) setModelList(listResult)
    }
  }

  const handleToggleModelEnabled = (
    providerId: string,
    modelId: string,
    enabled: boolean
  ) => {
    const current = getEnabledModelIds(providerId)
    const next = enabled
      ? current.includes(modelId)
        ? current
        : [...current, modelId]
      : current.filter(id => id !== modelId)
    void handleSetEnabledModels(providerId, next)
  }

  // Load discoverable models when a provider card is expanded
  React.useEffect(() => {
    if (!settings) return
    const load = async (providerId: string) => {
      const list = await window.api?.llm?.listDiscoverableModels(providerId)
      if (list) setDiscoverableByProvider(s => ({ ...s, [providerId]: list }))
    }
    if (providerExpanded.ollama) void load('ollama')
    if (providerExpanded.anthropic) void load('anthropic')
  }, [settings, providerExpanded.ollama, providerExpanded.anthropic])

  /** Extract inner error.message from API error strings (e.g. Anthropic JSON payload) */
  function shortErrorMessage(raw: string): string {
    try {
      const jsonStart = raw.indexOf('{')
      if (jsonStart === -1) return raw
      const json = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string }
      }
      const msg = json?.error?.message
      if (typeof msg === 'string') return msg
    } catch {
      /* ignore */
    }
    return raw
  }

  /** Status for provider: variant and message for single-row icon + text */
  function getProviderStatus(providerId: string): {
    variant: 'loading' | 'success' | 'error' | 'not-configured'
    message: string
  } {
    if (providerId === 'anthropic' && !isAnthropicConfigured) {
      return { variant: 'not-configured', message: 'Not configured' }
    }
    const status = providerTestStatus[providerId]
    if (status === 'loading' || status === 'idle') {
      return { variant: 'loading', message: 'Testing…' }
    }
    if (status && typeof status === 'object' && 'success' in status) {
      return status.success
        ? {
            variant: 'success',
            message: `Connected (${getEnabledModelIds(providerId).length} enabled)`,
          }
        : {
            variant: 'error',
            message: shortErrorMessage(status.error),
          }
    }
    return { variant: 'loading', message: 'Testing…' }
  }

  function ProviderStatusRow({ providerId }: { providerId: string }) {
    const { variant, message } = getProviderStatus(providerId)
    const iconClass = 'h-3.5 w-3.5 shrink-0'
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
        {variant === 'loading' && (
          <>
            <Loader2 className={cn(iconClass, 'animate-spin')} />
            <span>{message}</span>
          </>
        )}
        {variant === 'success' && (
          <>
            <CheckCircle2
              className={cn(
                iconClass,
                `
                  text-green-600
                  dark:text-green-400
                `
              )}
            />
            <span>{message}</span>
          </>
        )}
        {variant === 'error' && (
          <>
            <XCircle
              className={cn(
                iconClass,
                `
                  text-red-600
                  dark:text-red-400
                `
              )}
            />
            <span>{message}</span>
          </>
        )}
        {variant === 'not-configured' && <span>{message}</span>}
      </span>
    )
  }

  const handleDefaultModelChange = async (value: string) => {
    if (!settings) return
    const toSave = value === DEFAULT_MODEL_FALLBACK ? '' : value
    const res = await window.api?.settings?.set('llm.defaultModel', toSave)
    if (res?.success) {
      setSettings({ ...settings, 'llm.defaultModel': toSave })
    }
  }

  const handleSaveAnthropicKey = async () => {
    const key = anthropicKeyInput.trim()
    if (!key) return
    setAnthropicSaveMessage(null)
    try {
      const result = await window.api?.llm?.encryptProviderKey('anthropic', key, true)
      if (result?.success) {
        setAnthropicKeyInput('')
        handleTestProvider('anthropic')
        await loadSettings({ skipLoading: true })
        const listResult = await window.api?.llm?.listModels()
        if (listResult) setModelList(listResult)
      } else {
        setAnthropicSaveMessage('error')
      }
    } catch {
      setAnthropicSaveMessage('error')
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

      <Tabs
        value={activeTab}
        onValueChange={v =>
          setActiveTab(
            VALID_SETTINGS_TABS.includes(v as (typeof VALID_SETTINGS_TABS)[number])
              ? (v as (typeof VALID_SETTINGS_TABS)[number])
              : 'llm'
          )
        }
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger
            value="llm"
            className="flex flex-1 items-center justify-center gap-2"
          >
            <Bot className="h-4 w-4" />
            LLM Providers
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex flex-1 items-center justify-center gap-2"
          >
            <Sun className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="shortcuts"
            className="flex flex-1 items-center justify-center gap-2"
          >
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-0">
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
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-0">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                Keyboard Shortcuts
              </h2>
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
        </TabsContent>

        <TabsContent value="llm" className="mt-0">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-text-primary">LLM Providers</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Configure API keys and endpoints for chat providers
              </p>
            </div>

            {/* Default model */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="default-model-select"
                className="text-sm font-medium text-text-primary"
              >
                Default model
              </label>
              <Select
                value={defaultModelSelectValue}
                onValueChange={handleDefaultModelChange}
              >
                <SelectTrigger id="default-model-select" className="w-full max-w-md">
                  <SelectValue placeholder="Use fallback (auto)">
                    {defaultModelSelectValue === DEFAULT_MODEL_FALLBACK ? (
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="text-text-secondary">Use fallback (auto)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProviderIcon
                          providerId={getProviderIdFromModelId(defaultModel)}
                          size={16}
                        />
                        <span>
                          {modelList?.all?.find(m => m.id === defaultModel)?.label ??
                            defaultModel}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_MODEL_FALLBACK}>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="text-text-secondary">Use fallback (auto)</span>
                    </div>
                  </SelectItem>
                  {modelList?.all?.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <ProviderIcon
                          providerId={getProviderIdFromModelId(model.id)}
                          size={16}
                        />
                        <span>{model.label ?? model.id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-text-secondary">
                Model used for new conversations when none is selected. Only models you
                have enabled per provider are listed. Fallback uses first available
                enabled model.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {/* Ollama */}
              <Collapsible
                open={providerExpanded.ollama}
                onOpenChange={open => setProviderExpanded(s => ({ ...s, ollama: open }))}
              >
                <div
                  className={cn(
                    `
                      flex flex-col gap-2 rounded-lg border border-border
                      bg-bg-secondary/50 p-4
                    `
                  )}
                  role="button"
                  tabIndex={0}
                  aria-expanded={providerExpanded.ollama}
                  onClick={() => setProviderExpanded(s => ({ ...s, ollama: !s.ollama }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setProviderExpanded(s => ({ ...s, ollama: !s.ollama }))
                    }
                  }}
                >
                  <div className="flex cursor-pointer items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ProviderIcon providerId="ollama" size={16} />
                      <span className="font-medium text-text-primary">Ollama</span>
                      <ProviderStatusRow providerId="ollama" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 shrink-0 text-text-secondary',
                          'hover:text-text-primary'
                        )}
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleTestProvider('ollama')
                        }}
                        disabled={providerTestStatus.ollama === 'loading'}
                        title="Test connection"
                        aria-label="Test connection"
                      >
                        {providerTestStatus.ollama === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      {isOllamaConfigured &&
                        getEnabledModelIds('ollama').length === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleClearProvider('ollama')
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      <CogIcon className="h-4 w-4 text-text-secondary" />
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div onClick={e => e.stopPropagation()} role="presentation">
                      <p className="text-xs text-text-secondary">
                        Local models. Optional custom base URL.
                      </p>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="ollama-base-url"
                          className="text-sm font-medium text-text-primary"
                        >
                          Base URL
                        </label>
                        <Input
                          id="ollama-base-url"
                          type="url"
                          placeholder={OLLAMA_DEFAULT_BASE_URL}
                          value={ollamaBaseUrl}
                          onChange={e => setOllamaBaseUrlInput(e.target.value)}
                          onBlur={handleOllamaBaseUrlBlur}
                          className="max-w-md font-mono text-sm"
                        />
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          Models
                        </span>
                        <p className="text-xs text-text-secondary">
                          Enable models to use in the app. None enabled by default.
                        </p>
                        <ul className="flex flex-col gap-1">
                          {(discoverableByProvider.ollama ?? []).map(model => {
                            const enabled = getEnabledModelIds('ollama').includes(
                              model.id
                            )
                            return (
                              <li
                                key={model.id}
                                role="button"
                                tabIndex={0}
                                className="
                                  flex cursor-pointer items-center justify-between gap-2
                                  rounded border border-transparent px-2 py-1.5 text-sm
                                  transition-colors
                                  hover:border-border
                                "
                                onClick={() =>
                                  handleToggleModelEnabled('ollama', model.id, !enabled)
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleToggleModelEnabled('ollama', model.id, !enabled)
                                  }
                                }}
                              >
                                <span
                                  className={cn(
                                    'min-w-0 truncate',
                                    enabled ? 'text-text-primary' : 'text-text-secondary'
                                  )}
                                >
                                  {model.label ?? model.id}
                                </span>
                                <span onClick={e => e.stopPropagation()}>
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={checked =>
                                      handleToggleModelEnabled(
                                        'ollama',
                                        model.id,
                                        checked
                                      )
                                    }
                                    aria-label={
                                      enabled
                                        ? `Disable ${model.label ?? model.id}`
                                        : `Enable ${model.label ?? model.id}`
                                    }
                                  />
                                </span>
                              </li>
                            )
                          })}
                          {(discoverableByProvider.ollama ?? []).length === 0 && (
                            <li className="py-2 text-center text-xs text-text-secondary">
                              Connect to see available models
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Anthropic */}
              <Collapsible
                open={providerExpanded.anthropic}
                onOpenChange={open =>
                  setProviderExpanded(s => ({ ...s, anthropic: open }))
                }
              >
                <div
                  className={cn(
                    `
                      flex flex-col gap-2 rounded-lg border border-border
                      bg-bg-secondary/50 p-4
                    `
                  )}
                  role="button"
                  tabIndex={0}
                  aria-expanded={providerExpanded.anthropic}
                  onClick={() =>
                    setProviderExpanded(s => ({
                      ...s,
                      anthropic: !s.anthropic,
                    }))
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setProviderExpanded(s => ({
                        ...s,
                        anthropic: !s.anthropic,
                      }))
                    }
                  }}
                >
                  <div className="flex cursor-pointer items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ProviderIcon providerId="anthropic" size={16} />
                      <span className="font-medium text-text-primary">Anthropic</span>
                      <ProviderStatusRow providerId="anthropic" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 shrink-0 text-text-secondary',
                          'hover:text-text-primary'
                        )}
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleTestProvider('anthropic')
                        }}
                        disabled={providerTestStatus.anthropic === 'loading'}
                        title="Test connection"
                        aria-label="Test connection"
                      >
                        {providerTestStatus.anthropic === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <CogIcon className="h-4 w-4 text-text-secondary" />
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div onClick={e => e.stopPropagation()} role="presentation">
                      <p className="text-xs text-text-secondary">
                        Claude models. API key required.
                      </p>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="anthropic-api-key"
                          className="text-sm font-medium text-text-primary"
                        >
                          API key
                        </label>
                        <div className="flex max-w-md items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="anthropic-api-key"
                              type="password"
                              placeholder={
                                anthropicSaveMessage === 'error'
                                  ? 'Save failed'
                                  : isAnthropicConfigured
                                    ? 'API key saved'
                                    : 'Enter API key'
                              }
                              value={anthropicKeyInput}
                              onChange={e => {
                                setAnthropicKeyInput(e.target.value)
                                if (anthropicSaveMessage === 'error')
                                  setAnthropicSaveMessage(null)
                              }}
                              className={cn(
                                'font-mono text-sm pr-9',
                                anthropicSaveMessage === 'error' &&
                                  `
                                    border-red-500/70
                                    placeholder:text-red-600
                                    dark:placeholder:text-red-400
                                  `
                              )}
                              autoComplete="off"
                            />
                            {isAnthropicConfigured && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="
                                  absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2
                                  text-text-secondary
                                  hover:text-text-primary
                                "
                                onClick={() => handleClearProvider('anthropic')}
                                title="Clear saved API key"
                                aria-label="Clear saved API key"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveAnthropicKey}
                            disabled={!anthropicKeyInput.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          Models
                        </span>
                        <p className="text-xs text-text-secondary">
                          Enable models to use in the app. None enabled by default.
                        </p>
                        <ul className="flex flex-col gap-1">
                          {(discoverableByProvider.anthropic ?? []).map(model => {
                            const enabled = getEnabledModelIds('anthropic').includes(
                              model.id
                            )
                            return (
                              <li
                                key={model.id}
                                role="button"
                                tabIndex={0}
                                className="
                                  flex cursor-pointer items-center justify-between gap-2
                                  rounded border border-transparent px-2 py-1.5 text-sm
                                  transition-colors
                                  hover:border-border
                                "
                                onClick={() =>
                                  handleToggleModelEnabled(
                                    'anthropic',
                                    model.id,
                                    !enabled
                                  )
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleToggleModelEnabled(
                                      'anthropic',
                                      model.id,
                                      !enabled
                                    )
                                  }
                                }}
                              >
                                <span
                                  className={cn(
                                    'min-w-0 truncate',
                                    enabled ? 'text-text-primary' : 'text-text-secondary'
                                  )}
                                >
                                  {model.label ?? model.id}
                                </span>
                                <span onClick={e => e.stopPropagation()}>
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={checked =>
                                      handleToggleModelEnabled(
                                        'anthropic',
                                        model.id,
                                        checked
                                      )
                                    }
                                    aria-label={
                                      enabled
                                        ? `Disable ${model.label ?? model.id}`
                                        : `Enable ${model.label ?? model.id}`
                                    }
                                  />
                                </span>
                              </li>
                            )
                          })}
                          {(discoverableByProvider.anthropic ?? []).length === 0 && (
                            <li className="py-2 text-center text-xs text-text-secondary">
                              Add API key and connect to see available models
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
