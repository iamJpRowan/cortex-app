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
import { Separator } from '@/components/ui/separator'
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
  HelpCircle,
  Loader2,
  RefreshCw,
  Copy,
  EyeOff,
  Eye,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  SettingsExpandableCard,
  SETTINGS_CARD_ACTION_ICON_CLASS,
} from '@/components/SettingsExpandableCard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProviderIcon, getProviderIdFromModelId } from '@/components/ProviderIcon'
import type {
  ListModelsResult,
  ModelMetadata,
  PermissionMode,
  PermissionLevel,
} from '@shared/types'
import { cn } from '@/lib/utils'
import { setTheme } from '@/lib/theme'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  SETTINGS_TAB_KEY,
  SETTINGS_PROVIDER_EXPANDED_KEY,
  SETTINGS_SCROLL_KEY,
} from '@/lib/layout-storage'

type Theme = 'light' | 'dark' | 'system'
const VALID_SETTINGS_TABS = ['agents', 'appearance', 'shortcuts'] as const

/** Per-provider config in settings (encrypted keys never exposed to renderer). */
type LLMProvidersConfig = Record<string, Record<string, unknown>>

interface Settings {
  'appearance.theme': Theme
  'hotkeys.commandPalette': string
  'hotkeys.settings': string
  'hotkeys.sidebar': string
  'chatView.hotkeys.toggleComposerMode': string
  'llm.defaultModel': string
  'llm.providers': LLMProvidersConfig
  'agents.defaultModeId': string
  'agents.disabledModeIds': string[]
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
  const [settingsFilePath, setSettingsFilePath] = React.useState<string | null>(null)
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
  const [activeTab, setActiveTab] = usePersistedState(SETTINGS_TAB_KEY, 'agents', {
    deserialize: s => {
      try {
        const v = JSON.parse(s) as string
        if (v === 'llm') return 'agents'
        return VALID_SETTINGS_TABS.includes(v as (typeof VALID_SETTINGS_TABS)[number])
          ? (v as (typeof VALID_SETTINGS_TABS)[number])
          : 'agents'
      } catch {
        return 'agents'
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

  // Agents tab: permission modes
  const [modeList, setModeList] = React.useState<PermissionMode[]>([])
  const [editingModeId, setEditingModeId] = React.useState<string | null>(null)
  const [editorName, setEditorName] = React.useState('')
  const [editorDescription, setEditorDescription] = React.useState('')
  const [editorCategories, setEditorCategories] = React.useState<
    Record<string, PermissionLevel>
  >({})
  const [initialEditorName, setInitialEditorName] = React.useState('')
  const [initialEditorDescription, setInitialEditorDescription] = React.useState('')
  const [initialEditorCategories, setInitialEditorCategories] = React.useState<
    Record<string, PermissionLevel>
  >({})
  const [builtinDefaultForEditor, setBuiltinDefaultForEditor] =
    React.useState<PermissionMode | null>(null)
  const [builtinDefaults, setBuiltinDefaults] = React.useState<Record<
    string,
    PermissionMode
  > | null>(null)
  const [duplicateSourceId, setDuplicateSourceId] = React.useState<string | null>(null)
  const [duplicateNewId, setDuplicateNewId] = React.useState('')
  const [modesLoadError, setModesLoadError] = React.useState<string | null>(null)
  const [editingModeFilePath, setEditingModeFilePath] = React.useState<string | null>(
    null
  )

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

  // Load settings file path for footer
  React.useEffect(() => {
    let cancelled = false
    window.api?.settings?.getFilePath().then(result => {
      if (!cancelled && result?.success && typeof result.data === 'string') {
        setSettingsFilePath(result.data)
      }
    })
    return () => {
      cancelled = true
    }
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

  const loadModes = React.useCallback(async () => {
    setModesLoadError(null)
    try {
      const listRes = await window.api.modes.listAll()
      if (listRes?.success && Array.isArray(listRes.modes)) {
        setModeList(listRes.modes)
      }
    } catch (e) {
      setModesLoadError(e instanceof Error ? e.message : 'Failed to load modes')
    }
  }, [])

  React.useEffect(() => {
    if (activeTab === 'agents') loadModes()
  }, [activeTab, loadModes])

  // Load built-in defaults so we can show "differs from default" when cards are collapsed
  React.useEffect(() => {
    const builtinIds = modeList.filter(m => m.builtin).map(m => m.id)
    if (builtinIds.length === 0) {
      setBuiltinDefaults(null)
      return
    }
    let cancelled = false
    Promise.all(
      builtinIds.map(id =>
        window.api.modes
          .getBuiltinDefault(id)
          .then(r => (r?.success && r.mode ? ([id, r.mode] as const) : null))
      )
    ).then(results => {
      if (cancelled) return
      const next: Record<string, PermissionMode> = {}
      for (const row of results) {
        if (row) next[row[0]] = row[1]
      }
      setBuiltinDefaults(next)
    })
    return () => {
      cancelled = true
    }
  }, [modeList])

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

  const handleDefaultModeChange = async (modeId: string) => {
    const res = await window.api?.settings?.set('agents.defaultModeId', modeId)
    if (res?.success && settings) {
      setSettings({ ...settings, 'agents.defaultModeId': modeId })
    }
  }

  const handleOpenModeEditor = async (id: string) => {
    const res = await window.api.modes.get(id)
    if (!res?.success || !res.mode) return
    const name = res.mode.name
    const description = res.mode.description ?? ''
    const categories = { ...res.mode.categories }
    setEditingModeId(id)
    setEditorName(name)
    setEditorDescription(description)
    setEditorCategories(categories)
    setInitialEditorName(name)
    setInitialEditorDescription(description)
    setInitialEditorCategories(categories)
    if (res.mode.builtin) {
      const defaultRes = await window.api.modes.getBuiltinDefault(id)
      setBuiltinDefaultForEditor(
        defaultRes?.success && defaultRes.mode ? defaultRes.mode : null
      )
    } else {
      setBuiltinDefaultForEditor(null)
    }
  }

  // Load mode config file path when a mode card is expanded (reliable display + open)
  React.useEffect(() => {
    if (!editingModeId) {
      setEditingModeFilePath(null)
      return
    }
    let cancelled = false
    window.api.modes
      .getFilePath(editingModeId)
      .then(result => {
        if (!cancelled && result?.success === true && typeof result.data === 'string') {
          setEditingModeFilePath(result.data)
        } else {
          setEditingModeFilePath(null)
        }
      })
      .catch(() => {
        if (!cancelled) setEditingModeFilePath(null)
      })
    return () => {
      cancelled = true
    }
  }, [editingModeId])

  const MODE_EDITOR_CATEGORY_KEYS = [
    'readLocal',
    'writeLocal',
    'readExternal',
    'writeExternal',
    'readApp',
    'writeApp',
  ] as const

  const isEditorDirty =
    editingModeId !== null &&
    (editorName !== initialEditorName ||
      editorDescription !== initialEditorDescription ||
      MODE_EDITOR_CATEGORY_KEYS.some(
        k => (editorCategories[k] ?? 'deny') !== (initialEditorCategories[k] ?? 'deny')
      ))

  const differsFromDefault =
    editingModeId !== null &&
    builtinDefaultForEditor !== null &&
    (initialEditorName !== builtinDefaultForEditor.name ||
      (initialEditorDescription ?? '') !== (builtinDefaultForEditor.description ?? '') ||
      MODE_EDITOR_CATEGORY_KEYS.some(
        k =>
          (initialEditorCategories[k] ?? 'deny') !==
          (builtinDefaultForEditor.categories[k] ?? 'deny')
      ))

  const modeDiffersFromDefault = (mode: PermissionMode): boolean => {
    if (!mode.builtin || !builtinDefaults) return false
    const def = builtinDefaults[mode.id]
    if (!def) return false
    return (
      mode.name !== def.name ||
      (mode.description ?? '') !== (def.description ?? '') ||
      MODE_EDITOR_CATEGORY_KEYS.some(
        k => (mode.categories[k] ?? 'deny') !== (def.categories[k] ?? 'deny')
      )
    )
  }

  const closeModeEditor = () => {
    setEditingModeId(null)
    setBuiltinDefaultForEditor(null)
    setEditingModeFilePath(null)
  }

  const handleOpenModeInEditor = async (modeId: string) => {
    try {
      await window.api.modes.openInEditor(modeId)
    } catch (error) {
      console.error('[SettingsView] Failed to open mode in editor:', error)
    }
  }

  const handleSaveModeEditor = async () => {
    if (!editingModeId) return
    const content: Record<string, string> = {
      id: editingModeId,
      name: editorName,
      ...(editorDescription.trim() ? { description: editorDescription.trim() } : {}),
    }
    for (const k of MODE_EDITOR_CATEGORY_KEYS) {
      content[`categories.${k}`] = editorCategories[k] ?? 'deny'
    }
    const res = await window.api.modes.save(editingModeId, content)
    if (res?.success) {
      setInitialEditorName(editorName)
      setInitialEditorDescription(editorDescription)
      setInitialEditorCategories({ ...editorCategories })
      loadModes()
    }
  }

  const handleCancelModeEditor = () => {
    setEditorName(initialEditorName)
    setEditorDescription(initialEditorDescription)
    setEditorCategories({ ...initialEditorCategories })
  }

  const handleResetMode = async (modeId: string) => {
    const res = await window.api.modes.reset(modeId)
    if (res?.success) {
      loadModes()
      if (editingModeId === modeId) {
        await handleOpenModeEditor(modeId)
      }
    }
  }

  const handleResetModeFromEditor = () => {
    if (editingModeId) handleResetMode(editingModeId)
  }

  const handleDeleteMode = async (modeId: string, modeName: string) => {
    if (
      !window.confirm(
        `Delete mode "${modeName}"? This will remove the mode file and cannot be undone.`
      )
    ) {
      return
    }
    const res = await window.api.modes.delete(modeId)
    if (res?.success) {
      if (editingModeId === modeId) closeModeEditor()
      const defaultModeId = settings?.['agents.defaultModeId']
      if (defaultModeId === modeId && window.api?.settings?.set) {
        await window.api.settings.set('agents.defaultModeId', '')
        loadSettings({ skipLoading: true })
      }
      loadModes()
    }
  }

  const handleDuplicateMode = async () => {
    if (!duplicateSourceId || !duplicateNewId.trim()) return
    const newId = duplicateNewId.trim().replace(/[^a-zA-Z0-9-_]/g, '_')
    if (!newId) return
    const res = await window.api.modes.duplicate(duplicateSourceId, newId)
    if (res?.success) {
      setDuplicateSourceId(null)
      setDuplicateNewId('')
      loadModes()
    }
  }

  const handleSetModeDisabled = async (id: string, disabled: boolean) => {
    const res = await window.api.modes.setDisabled(id, disabled)
    if (res?.success) {
      loadModes()
      loadSettings({ skipLoading: true })
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
    <div className="flex flex-1 flex-col min-h-0">
      <div
        className="flex-1 min-h-0 overflow-auto p-4"
        data-settings-scroll
        role="region"
        aria-label="Settings content"
      >
        <div className="flex flex-col gap-6">
          <Tabs
            value={activeTab}
            onValueChange={v =>
              setActiveTab(
                VALID_SETTINGS_TABS.includes(v as (typeof VALID_SETTINGS_TABS)[number])
                  ? (v as (typeof VALID_SETTINGS_TABS)[number])
                  : 'agents'
              )
            }
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger
                value="agents"
                className="flex flex-1 items-center justify-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Agents
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

            <TabsContent value="agents" className="mt-0">
              <TooltipProvider delayDuration={300}>
                <div className="flex flex-col gap-8">
                  {/* Section: LLM Providers */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-semibold text-text-primary">
                        LLM Providers
                      </h2>
                      <Separator />
                      <p className="text-sm text-text-secondary">
                        Configure API keys and endpoints for chat providers.
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
                        <SelectTrigger
                          id="default-model-select"
                          className="w-full max-w-md"
                        >
                          <SelectValue placeholder="Use fallback (auto)">
                            {defaultModelSelectValue === DEFAULT_MODEL_FALLBACK ? (
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 shrink-0 text-text-secondary" />
                                <span className="text-text-secondary">
                                  Use fallback (auto)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <ProviderIcon
                                  providerId={getProviderIdFromModelId(defaultModel)}
                                  size={16}
                                />
                                <span>
                                  {modelList?.all?.find(m => m.id === defaultModel)
                                    ?.label ?? defaultModel}
                                </span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_MODEL_FALLBACK}>
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 shrink-0 text-text-secondary" />
                              <span className="text-text-secondary">
                                Use fallback (auto)
                              </span>
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
                        Model used for new conversations when none is selected. Only
                        models you have enabled per provider are listed. Fallback uses
                        first available enabled model.
                      </p>
                    </div>

                    <div className="flex flex-col gap-6">
                      {/* Ollama */}
                      <SettingsExpandableCard
                        open={providerExpanded.ollama}
                        onOpenChange={open =>
                          setProviderExpanded(s => ({ ...s, ollama: open }))
                        }
                        title={
                          <>
                            <ProviderIcon providerId="ollama" size={16} />
                            <span className="font-medium text-text-primary">Ollama</span>
                            <ProviderStatusRow providerId="ollama" />
                          </>
                        }
                        description="Local models. Optional custom base URL."
                        actionIcons={
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                  onClick={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleTestProvider('ollama')
                                  }}
                                  disabled={providerTestStatus.ollama === 'loading'}
                                  aria-label="Test connection"
                                >
                                  {providerTestStatus.ollama === 'loading' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Test connection</TooltipContent>
                            </Tooltip>
                            {isOllamaConfigured &&
                              getEnabledModelIds('ollama').length === 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                      onClick={e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleClearProvider('ollama')
                                      }}
                                      aria-label="Clear provider"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Clear</TooltipContent>
                                </Tooltip>
                              )}
                          </>
                        }
                      >
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
                                  className={cn(
                                    'flex cursor-pointer items-center justify-between',
                                    'gap-2 rounded border border-transparent px-2 py-1.5',
                                    `
                                      text-sm transition-colors
                                      hover:border-border
                                    `
                                  )}
                                  onClick={() =>
                                    handleToggleModelEnabled('ollama', model.id, !enabled)
                                  }
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      handleToggleModelEnabled(
                                        'ollama',
                                        model.id,
                                        !enabled
                                      )
                                    }
                                  }}
                                >
                                  <span
                                    className={cn(
                                      'min-w-0 truncate',
                                      enabled
                                        ? 'text-text-primary'
                                        : 'text-text-secondary'
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
                      </SettingsExpandableCard>

                      {/* Anthropic */}
                      <SettingsExpandableCard
                        open={providerExpanded.anthropic}
                        onOpenChange={open =>
                          setProviderExpanded(s => ({ ...s, anthropic: open }))
                        }
                        title={
                          <>
                            <ProviderIcon providerId="anthropic" size={16} />
                            <span className="font-medium text-text-primary">
                              Anthropic
                            </span>
                            <ProviderStatusRow providerId="anthropic" />
                          </>
                        }
                        description="Claude models. API key required."
                        actionIcons={
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleTestProvider('anthropic')
                                }}
                                disabled={providerTestStatus.anthropic === 'loading'}
                                aria-label="Test connection"
                              >
                                {providerTestStatus.anthropic === 'loading' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Test connection</TooltipContent>
                          </Tooltip>
                        }
                      >
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
                                  className={cn(
                                    'absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2',
                                    `
                                      text-text-secondary
                                      hover:text-text-primary
                                    `
                                  )}
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
                                    className={cn(
                                      'flex cursor-pointer items-center justify-between',
                                      `
                                        gap-2 rounded border border-transparent px-2
                                        py-1.5
                                      `,
                                      `
                                        text-sm transition-colors
                                        hover:border-border
                                      `
                                    )}
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
                                        enabled
                                          ? 'text-text-primary'
                                          : 'text-text-secondary'
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
                                <li
                                  className="py-2 text-center text-xs text-text-secondary"
                                >
                                  Add API key and connect to see available models
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </SettingsExpandableCard>
                    </div>
                  </div>

                  {/* Section: Permission Modes */}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-semibold text-text-primary">
                        Permission Modes
                      </h2>
                      <Separator />
                      <p className="text-sm text-text-secondary">
                        Control which tools the LLM can use. Each conversation uses one
                        mode.
                      </p>
                    </div>

                    {modesLoadError && (
                      <p className="text-sm text-destructive">{modesLoadError}</p>
                    )}

                    {/* Default mode for new chats (enabled modes only) */}
                    {settings && (
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="default-mode-select"
                          className="text-sm font-medium text-text-primary"
                        >
                          Default mode for new chats
                        </label>
                        <Select
                          value={settings['agents.defaultModeId'] ?? 'full'}
                          onValueChange={handleDefaultModeChange}
                        >
                          <SelectTrigger
                            id="default-mode-select"
                            className="w-full max-w-md"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {modeList
                              .filter(
                                m =>
                                  !(settings?.['agents.disabledModeIds'] ?? []).includes(
                                    m.id
                                  )
                              )
                              .map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-text-secondary">
                          Applied when creating a new conversation.
                        </p>
                      </div>
                    )}

                    {/* Mode list: same card layout as LLM Providers */}
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-medium text-text-primary">Modes</h3>
                      <div className="flex flex-col gap-6">
                        {modeList.map(mode => {
                          const isModeDisabled = (
                            settings?.['agents.disabledModeIds'] ?? []
                          ).includes(mode.id)
                          return (
                            <SettingsExpandableCard
                              key={mode.id}
                              open={editingModeId === mode.id}
                              onOpenChange={open => {
                                if (open) handleOpenModeEditor(mode.id)
                                else closeModeEditor()
                              }}
                              disabled={isModeDisabled}
                              title={
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="font-medium text-text-primary truncate">
                                    {editingModeId === mode.id ? editorName : mode.name}
                                  </span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {mode.id}
                                    {mode.builtin && ' (built-in)'}
                                  </span>
                                </div>
                              }
                              description={
                                (
                                  (editingModeId === mode.id
                                    ? editorDescription
                                    : mode.description) ?? ''
                                ).trim() || undefined
                              }
                              actionIcons={
                                <>
                                  {!mode.builtin && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                          onClick={e => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleDeleteMode(mode.id, mode.name)
                                          }}
                                          aria-label="Delete mode"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete mode</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {mode.builtin &&
                                    (editingModeId === mode.id
                                      ? differsFromDefault
                                      : modeDiffersFromDefault(mode)) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                            onClick={e => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              handleResetMode(mode.id)
                                            }}
                                            aria-label="Reset to default"
                                          >
                                            <RotateCcw className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Reset to default</TooltipContent>
                                      </Tooltip>
                                    )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={SETTINGS_CARD_ACTION_ICON_CLASS}
                                        onClick={e => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setDuplicateSourceId(mode.id)
                                          setDuplicateNewId(`${mode.id}-copy`)
                                        }}
                                        aria-label="Copy mode"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          SETTINGS_CARD_ACTION_ICON_CLASS,
                                          'group'
                                        )}
                                        onClick={e => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleSetModeDisabled(
                                            mode.id,
                                            !(
                                              settings?.['agents.disabledModeIds'] ?? []
                                            ).includes(mode.id)
                                          )
                                        }}
                                        aria-label={isModeDisabled ? 'Enable' : 'Disable'}
                                      >
                                        <span
                                          className="
                                            relative inline-flex h-4 w-4 items-center
                                            justify-center
                                          "
                                        >
                                          {isModeDisabled ? (
                                            <>
                                              <EyeOff
                                                className="
                                                  h-4 w-4 transition-opacity
                                                  group-hover:opacity-0
                                                "
                                              />
                                              <Eye
                                                className="
                                                  absolute h-4 w-4 opacity-0
                                                  transition-opacity
                                                  group-hover:opacity-100
                                                "
                                              />
                                            </>
                                          ) : (
                                            <>
                                              <Eye
                                                className="
                                                  h-4 w-4 transition-opacity
                                                  group-hover:opacity-0
                                                "
                                              />
                                              <EyeOff
                                                className="
                                                  absolute h-4 w-4 opacity-0
                                                  transition-opacity
                                                  group-hover:opacity-100
                                                "
                                              />
                                            </>
                                          )}
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isModeDisabled ? 'Enable' : 'Disable'}
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              }
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-text-primary">
                                    Name
                                  </label>
                                  <Input
                                    value={editorName}
                                    onChange={e => setEditorName(e.target.value)}
                                    placeholder="Display name"
                                    className={cn(
                                      'max-w-md',
                                      editorName !== initialEditorName &&
                                        'ring-2 ring-primary/50 border-primary'
                                    )}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-text-primary">
                                    Description
                                  </label>
                                  <Input
                                    value={editorDescription}
                                    onChange={e => setEditorDescription(e.target.value)}
                                    placeholder="Short description (shown when card is collapsed)"
                                    className={cn(
                                      'max-w-md',
                                      editorDescription !== initialEditorDescription &&
                                        'ring-2 ring-primary/50 border-primary'
                                    )}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <span className="text-sm font-medium text-text-primary">
                                    Category permissions
                                  </span>
                                  <div
                                    className="
                                      grid gap-2
                                      sm:grid-cols-2
                                    "
                                  >
                                    {[
                                      { key: 'readLocal', label: 'Read local' },
                                      { key: 'writeLocal', label: 'Write local' },
                                      { key: 'readExternal', label: 'Read external' },
                                      { key: 'writeExternal', label: 'Write external' },
                                      { key: 'readApp', label: 'Read app' },
                                      { key: 'writeApp', label: 'Write app' },
                                    ].map(({ key, label }) => {
                                      const categoryChanged =
                                        (editorCategories[key] ?? 'deny') !==
                                        (initialEditorCategories[key] ?? 'deny')
                                      return (
                                        <div
                                          key={key}
                                          className={cn(
                                            'flex items-center justify-between gap-2',
                                            `
                                              rounded border border-transparent px-2
                                              py-1.5
                                            `,
                                            'text-sm transition-colors',
                                            'hover:border-border',
                                            categoryChanged && 'bg-primary/5',
                                            categoryChanged &&
                                              'hover:ring-2 hover:ring-primary/50',
                                            categoryChanged && 'hover:border-primary'
                                          )}
                                        >
                                          <span className="text-sm">{label}</span>
                                          <Select
                                            value={editorCategories[key] ?? 'deny'}
                                            onValueChange={(v: PermissionLevel) =>
                                              setEditorCategories(prev => ({
                                                ...prev,
                                                [key]: v,
                                              }))
                                            }
                                          >
                                            <SelectTrigger className="w-[100px] h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="allow">
                                                <span className="flex items-center gap-2">
                                                  <CheckCircle2
                                                    className="h-3.5 w-3.5 text-green-600"
                                                  />
                                                  Allow
                                                </span>
                                              </SelectItem>
                                              <SelectItem value="ask">
                                                <span className="flex items-center gap-2">
                                                  <HelpCircle
                                                    className="h-3.5 w-3.5 text-amber-600"
                                                  />
                                                  Ask
                                                </span>
                                              </SelectItem>
                                              <SelectItem value="deny">
                                                <span className="flex items-center gap-2">
                                                  <XCircle
                                                    className="h-3.5 w-3.5 text-red-600"
                                                  />
                                                  Deny
                                                </span>
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    'flex items-center justify-between gap-2',
                                    'flex-wrap'
                                  )}
                                >
                                  {isEditorDirty ? (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleSaveModeEditor}>
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelModeEditor}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div />
                                  )}
                                  <div className="flex gap-2">
                                    {!mode.builtin && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          'text-muted-foreground',
                                          'hover:text-text-primary'
                                        )}
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleDeleteMode(mode.id, mode.name)
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        Delete
                                      </Button>
                                    )}
                                    {editingModeId === mode.id && differsFromDefault && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          'text-muted-foreground',
                                          'hover:text-text-primary'
                                        )}
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleResetModeFromEditor()
                                        }}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                        Reset to default
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        'text-muted-foreground',
                                        'hover:text-text-primary'
                                      )}
                                      onClick={e => {
                                        e.stopPropagation()
                                        setDuplicateSourceId(mode.id)
                                        setDuplicateNewId(`${mode.id}-copy`)
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                                      Copy
                                    </Button>
                                    {(
                                      settings?.['agents.disabledModeIds'] ?? []
                                    ).includes(mode.id) ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          'text-muted-foreground',
                                          'hover:text-text-primary'
                                        )}
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleSetModeDisabled(mode.id, false)
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                        Enable
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          'text-muted-foreground',
                                          'hover:text-text-primary'
                                        )}
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleSetModeDisabled(mode.id, true)
                                        }}
                                      >
                                        <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                                        Disable
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {editingModeId === mode.id && (
                                  <footer
                                    className={cn(
                                      'flex-shrink-0 border-t border-border bg-muted/30',
                                      `
                                        -mx-4 -mb-4 px-4 py-2.5 flex items-center
                                        justify-between gap-4
                                      `
                                    )}
                                  >
                                    <span
                                      className="
                                        text-xs text-text-secondary truncate min-w-0
                                      "
                                      title={editingModeFilePath ?? undefined}
                                    >
                                      {editingModeFilePath ?? '…'}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleOpenModeInEditor(mode.id)
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                      Open in Editor
                                    </Button>
                                  </footer>
                                )}
                              </div>
                            </SettingsExpandableCard>
                          )
                        })}
                      </div>
                    </div>

                    {/* Duplicate dialog (inline) */}
                    {duplicateSourceId && (
                      <div
                        className="
                          flex flex-col gap-2 rounded-lg border border-border p-3
                          bg-bg-secondary/50
                        "
                      >
                        <p className="text-sm text-text-primary">
                          Duplicate mode &quot;
                          {modeList.find(m => m.id === duplicateSourceId)?.name ??
                            duplicateSourceId}
                          &quot;
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="New mode id (e.g. my-mode)"
                            value={duplicateNewId}
                            onChange={e => setDuplicateNewId(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={handleDuplicateMode}>
                            Create
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDuplicateSourceId(null)
                              setDuplicateNewId('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            </TabsContent>

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
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-2xl font-medium text-text-primary">
                    Keyboard Shortcuts
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    App-level and view-specific shortcuts (read-only for now)
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-medium text-text-primary">App</h2>
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
                      <p className="text-xs text-text-secondary">
                        Open the command palette
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">
                        Settings
                      </label>
                      <Input
                        value={settings['hotkeys.settings']}
                        readOnly
                        className="w-[200px] bg-bg-secondary"
                      />
                      <p className="text-xs text-text-secondary">
                        Open the settings view
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">
                        Toggle sidebar
                      </label>
                      <Input
                        value={settings['hotkeys.sidebar']}
                        readOnly
                        className="w-[200px] bg-bg-secondary"
                      />
                      <p className="text-xs text-text-secondary">
                        Show or collapse the app sidebar
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-medium text-text-primary">Chat view</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">
                        Toggle composer mode
                      </label>
                      <Input
                        value={settings['chatView.hotkeys.toggleComposerMode']}
                        readOnly
                        className="w-[200px] bg-bg-secondary"
                      />
                      <p className="text-xs text-text-secondary">
                        Switch between Plain and Live Preview in the message input
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <footer
        className="
          flex-shrink-0 border-t border-border bg-muted/30 px-4 py-2.5 flex items-center
          justify-between gap-4
        "
      >
        <span
          className="text-xs text-text-secondary truncate min-w-0"
          title={settingsFilePath ?? undefined}
        >
          {settingsFilePath ?? '…'}
        </span>
        <Button onClick={handleOpenInEditor} variant="outline" size="sm">
          <FileText className="h-4 w-4" />
          Open in Editor
        </Button>
      </footer>
    </div>
  )
}
