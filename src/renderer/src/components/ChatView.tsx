import * as React from 'react'
import {
  Send,
  Loader2,
  User,
  Bot,
  Pencil,
  Check,
  X,
  Copy,
  ChevronDown,
  Brain,
  Square,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PromptInput,
  type PromptInputRef,
  type PromptInputMode,
} from '@/components/ui/prompt-input'
import { ConversationList, type ConversationListRef } from './ConversationList'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
} from '@/components/ai-elements/chain-of-thought'
import {
  ToolInvocation,
  type ToolInvocationStatus,
} from '@/components/ai-elements/tool-invocation'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ModelSelector } from './ModelSelector'
import { ProviderIcon, getProviderIdFromModelId } from './ProviderIcon'
import type {
  ChatMessage,
  StreamEvent,
  TraceEntry,
  ConversationMetadata,
} from '@/types/api'
import { cn } from '@/lib/utils'
import {
  CHAT_LAST_ACTIVE_KEY,
  CHAT_DRAFT_KEY_PREFIX,
  CHAT_COMPOSER_MODE_KEY_PREFIX,
  CHAT_LAST_VIEWED_KEY_PREFIX,
  CHAT_SIDEBAR_WIDTH_KEY,
  CHAT_COMPOSER_HEIGHT_KEY_PREFIX,
  CHAT_COMPOSER_HEIGHT_DEFAULT,
  CHAT_COMPOSER_HEIGHT_MIN,
  CHAT_COMPOSER_HEIGHT_MAX_VH,
} from '@/lib/chat-storage'
import type { ListModelsResult } from '@shared/types'
import { registerHotkey } from '@/lib/hotkeys'

/**
 * ChatView Component
 *
 * Production-quality chat interface for conversing with the LLM agent.
 * Supports streaming responses, markdown rendering, code highlighting,
 * and execution trace display.
 */
export function ChatView() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  /** Composer mode (plain vs preview) per conversation; persisted in localStorage. */
  const [composerMode, setComposerMode] = React.useState<PromptInputMode>('plain')
  const composerModeRef = React.useRef(composerMode)
  composerModeRef.current = composerMode
  /** Raw shortcut for composer mode toggle (for tooltip). */
  const [composerModeShortcut, setComposerModeShortcut] = React.useState<string | null>(
    null
  )
  /** Single source of truth for conversation list (and thus header title). */
  const [conversations, setConversations] = React.useState<ConversationMetadata[]>([])
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)
  const [currentTrace, setCurrentTrace] = React.useState<TraceEntry[]>([])
  const [streamingContent, setStreamingContent] = React.useState('')
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [editingTitleValue, setEditingTitleValue] = React.useState('')
  const [modelList, setModelList] = React.useState<ListModelsResult | null>(null)
  const [defaultModel, setDefaultModel] = React.useState<string>('')
  /** Model to use for the next request (conversation's current or default). */
  const [selectedModelId, setSelectedModelId] = React.useState<string>('')
  /** Per-conversation last message time (for unread indicator when stream completes). */
  const [lastMessageAt, setLastMessageAt] = React.useState<Record<string, number>>({})
  /** Conversation currently receiving a stream (for sidebar indicator, persists when switching away). */
  const [streamingConversationId, setStreamingConversationId] = React.useState<
    string | undefined
  >(undefined)
  /** Conversation ID currently generating title (shows "Generating title..." indicator). */
  const [generatingTitleConversationId, setGeneratingTitleConversationId] =
    React.useState<string | null>(null)
  /** Stream ID of the active stream (for cancel). Cleared on complete/error/cancelled. */
  const [currentStreamId, setCurrentStreamId] = React.useState<string | null>(null)
  /** Chat sidebar width in px (resizable, persisted). */
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    const stored = localStorage.getItem(CHAT_SIDEBAR_WIDTH_KEY)
    if (stored) {
      const w = parseInt(stored, 10)
      if (w >= 180 && w <= 480) return w
    }
    return 256
  })
  /** Composer height in px (resizable, persisted per conversation). */
  const [composerHeight, setComposerHeight] = React.useState(CHAT_COMPOSER_HEIGHT_DEFAULT)
  const prevConversationIdRef = React.useRef<string | null>(null)

  const inputRef = React.useRef<PromptInputRef>(null)
  const titleInputRef = React.useRef<HTMLInputElement>(null)
  const conversationListRef = React.useRef<ConversationListRef>(null)
  /** Ref mirroring trace during stream for merging reasoning on complete. */
  const currentTraceRef = React.useRef<TraceEntry[]>([])
  /** Ref for conversationId so stream handler can filter events without stale closure. */
  const conversationIdRef = React.useRef<string | null>(null)
  conversationIdRef.current = conversationId

  // Load/save composer height when switching conversations
  React.useEffect(() => {
    const prevId = prevConversationIdRef.current
    if (prevId != null) {
      localStorage.setItem(
        CHAT_COMPOSER_HEIGHT_KEY_PREFIX + prevId,
        String(composerHeight)
      )
    }
    const nextId = conversationId ?? '_new'
    const key = CHAT_COMPOSER_HEIGHT_KEY_PREFIX + nextId
    const stored = localStorage.getItem(key)
    const maxPx =
      (typeof window !== 'undefined' ? window.innerHeight : 800) *
      (CHAT_COMPOSER_HEIGHT_MAX_VH / 100)
    if (stored) {
      const h = parseInt(stored, 10)
      if (!Number.isNaN(h) && h >= CHAT_COMPOSER_HEIGHT_MIN) {
        setComposerHeight(Math.min(h, maxPx))
      } else {
        setComposerHeight(CHAT_COMPOSER_HEIGHT_DEFAULT)
      }
    } else {
      setComposerHeight(CHAT_COMPOSER_HEIGHT_DEFAULT)
    }
    prevConversationIdRef.current = conversationId
  }, [conversationId])

  // Load conversation list (single source of truth for list and header title)
  const loadConversations = React.useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const result = await window.api.conversations.list({ limit: 50 })
      if (result.success && result.conversations) {
        setConversations(result.conversations)
      } else {
        setListError(result.error || 'Failed to load conversations')
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setListLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Restore last active conversation when returning to chat view
  React.useEffect(() => {
    let cancelled = false
    const lastId = localStorage.getItem(CHAT_LAST_ACTIVE_KEY)
    if (!lastId) {
      const newMode =
        localStorage.getItem(CHAT_COMPOSER_MODE_KEY_PREFIX + '_new') === 'preview'
          ? 'preview'
          : 'plain'
      if (!cancelled) setComposerMode(newMode)
      return
    }

    window.api.conversations
      .get(lastId)
      .then(result => {
        if (cancelled || !result.success || !result.conversation) return
        const conv = result.conversation
        setConversationId(conv.id)
        setSelectedModelId(conv.currentModel ?? '')
        localStorage.setItem(CHAT_LAST_VIEWED_KEY_PREFIX + conv.id, String(Date.now()))
        return window.api.conversations.getMessages(conv.id)
      })
      .then(messagesResult => {
        if (cancelled || !messagesResult?.success) return
        setMessages(messagesResult.messages ?? [])
        // Restore draft and composer mode for the restored conversation
        const draft = localStorage.getItem(CHAT_DRAFT_KEY_PREFIX + lastId) ?? ''
        const mode =
          localStorage.getItem(CHAT_COMPOSER_MODE_KEY_PREFIX + lastId) === 'preview'
            ? 'preview'
            : 'plain'
        if (!cancelled) {
          setInput(draft)
          setComposerMode(mode)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  // Load model list and default model for selector
  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.llm.listModels(),
      window.api.settings
        .get()
        .then(r =>
          r.success && r.data
            ? (r.data as { 'llm.defaultModel'?: string })['llm.defaultModel']
            : ''
        ),
    ]).then(([list, defaultVal]) => {
      if (!cancelled) {
        setModelList(list ?? null)
        setDefaultModel(typeof defaultVal === 'string' ? defaultVal : '')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // For new chat (no conversation), set selected model from default or first in list
  React.useEffect(() => {
    if (conversationId) return
    const list = modelList?.all ?? []
    const fallback =
      defaultModel && list.some(m => m.id === defaultModel)
        ? defaultModel
        : (list[0]?.id ?? '')
    setSelectedModelId(prev => (prev && list.some(m => m.id === prev) ? prev : fallback))
  }, [conversationId, modelList, defaultModel])

  // Subscribe to stream events
  React.useEffect(() => {
    const unsubscribe = window.api.llm.onStream(handleStreamEvent)
    return () => {
      unsubscribe()
    }
  }, [])

  // Subscribe to title generation start (add placeholder, show indicator)
  React.useEffect(() => {
    const unsubscribe = window.api.conversations.onTitleGenerating(
      ({ conversationId: id }) => {
        setGeneratingTitleConversationId(id)
        conversationListRef.current?.addPlaceholderConversation?.(id)
      }
    )
    return () => unsubscribe()
  }, [])

  // Subscribe to title updates (e.g. auto-generated after first message)
  // Ref's updateTitle updates the shared conversations state so header and list stay in sync
  React.useEffect(() => {
    const unsubscribe = window.api.conversations.onTitleUpdated(
      ({ conversationId: id, title }) => {
        setGeneratingTitleConversationId(prev => (prev === id ? null : prev))
        conversationListRef.current?.updateTitle(id, title)
      }
    )
    return () => unsubscribe()
  }, [])

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = sidebarWidth
      const MIN = 180
      const MAX = 480

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX
        const next = Math.min(MAX, Math.max(MIN, startWidth + delta))
        setSidebarWidth(next)
      }
      const onUp = (ev: MouseEvent) => {
        const delta = ev.clientX - startX
        const final = Math.min(MAX, Math.max(MIN, startWidth + delta))
        localStorage.setItem(CHAT_SIDEBAR_WIDTH_KEY, String(final))
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [sidebarWidth]
  )

  const handleStreamEvent = (event: StreamEvent) => {
    // Always track streaming and unread state (for sidebar indicators when switched away)
    if (event.type === 'start') {
      setStreamingConversationId(event.conversationId)
    } else if (
      event.type === 'complete' ||
      event.type === 'error' ||
      event.type === 'cancelled'
    ) {
      setStreamingConversationId(prev =>
        prev === event.conversationId ? undefined : prev
      )
      setCurrentStreamId(null)
    }
    if (event.type === 'complete') {
      setLastMessageAt(prev => ({
        ...prev,
        [event.conversationId]: Date.now(),
      }))
    }

    // Only apply UI updates for the currently viewed conversation
    if (event.conversationId !== conversationIdRef.current) return

    switch (event.type) {
      case 'start':
        setStreamingContent('')
        setCurrentTrace([])
        currentTraceRef.current = []
        break

      case 'token':
        setStreamingContent(event.accumulated || '')
        break

      case 'trace':
        currentTraceRef.current = [...currentTraceRef.current, event.trace]
        setCurrentTrace(prev => [...prev, event.trace])
        break

      case 'complete': {
        // Clear generating indicator when stream completes (title may have arrived or failed)
        setGeneratingTitleConversationId(prev =>
          prev === event.conversationId ? null : prev
        )
        // Merge reasoning (UI-only, from stream) with persisted trace for final message
        const reasoningEntries = currentTraceRef.current.filter(
          e => e.type === 'reasoning'
        )
        const mergedTrace = [...reasoningEntries, ...event.trace]
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: event.response,
          timestamp: Date.now(),
          trace: mergedTrace,
          ...(event.model != null && event.model !== '' ? { model: event.model } : {}),
        }
        setMessages(prev => [...prev, newMessage])
        setStreamingContent('')
        currentTraceRef.current = []
        setCurrentTrace([])
        setIsLoading(false)
        // Update sidebar so this conversation shows the model used
        if (event.conversationId && event.model != null && event.model !== '') {
          conversationListRef.current?.updateCurrentModel?.(
            event.conversationId,
            event.model
          )
        }
        break
      }

      case 'cancelled': {
        setGeneratingTitleConversationId(prev =>
          prev === event.conversationId ? null : prev
        )
        const partial = event.accumulated?.trim() ?? ''
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: partial ? `${partial}\n\n_Stopped._` : 'Stopped.',
          timestamp: Date.now(),
          trace: currentTraceRef.current,
        }
        setMessages(prev => [...prev, newMessage])
        setStreamingContent('')
        currentTraceRef.current = []
        setCurrentTrace([])
        setIsLoading(false)
        break
      }

      case 'error':
        console.error('Stream error:', event.error)
        setStreamingContent('')
        setIsLoading(false)
        setGeneratingTitleConversationId(prev =>
          prev === event.conversationId ? null : prev
        )
        // Add error as a message
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${event.error}${event.suggestion ? `\n\n${event.suggestion}` : ''}`,
            timestamp: Date.now(),
          },
        ])
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    // Start streaming query (pass selected model so backend uses it)
    const result = await window.api.llm.queryStream(userMessage, {
      conversationId: conversationId || undefined,
      model: selectedModelId || undefined,
    })

    if (result.success && result.conversationId) {
      setConversationId(result.conversationId)
      setStreamingConversationId(result.conversationId)
      setCurrentStreamId(result.streamId ?? null)
      localStorage.setItem(CHAT_LAST_ACTIVE_KEY, result.conversationId)
    } else if (!result.success) {
      setStreamingConversationId(undefined)
      setIsLoading(false)
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${result.error || 'Failed to start streaming'}`,
          timestamp: Date.now(),
        },
      ])
    }
  }

  const handleRestoreFromHere = React.useCallback(
    async (convId: string, lastOutputMessageIndex: number) => {
      const result = await window.api.conversations.getCheckpointIdForRestore(
        convId,
        lastOutputMessageIndex
      )
      if (!result.success || result.checkpointId == null || result.messageCount == null) {
        console.error('Restore from here failed:', result.error)
        return
      }
      const setResult = await window.api.conversations.setRestorePoint(
        convId,
        result.checkpointId,
        result.messageCount
      )
      if (!setResult.success) {
        console.error('setRestorePoint failed:', setResult.error)
        return
      }
      const msgResult = await window.api.conversations.getMessages(convId)
      if (msgResult.success && msgResult.messages) {
        setMessages(msgResult.messages)
      }
    },
    []
  )

  const handleSelectConversation = async (conversation: ConversationMetadata) => {
    // Don't reload if already selected
    if (conversationId === conversation.id) return

    // Save draft and composer mode for the conversation we're leaving
    const leavingId = conversationId ?? '_new'
    localStorage.setItem(CHAT_DRAFT_KEY_PREFIX + leavingId, input)
    localStorage.setItem(CHAT_COMPOSER_MODE_KEY_PREFIX + leavingId, composerMode)

    // Clear optimistic state immediately so we don't show previous conversation's content
    setMessages([])
    setStreamingContent('')
    currentTraceRef.current = []
    setCurrentTrace([])
    setConversationId(conversation.id)
    setIsLoading(true)
    setIsEditingTitle(false)

    const list = modelList?.all ?? []
    const fallback =
      defaultModel && list.some(m => m.id === defaultModel)
        ? defaultModel
        : (list[0]?.id ?? '')
    // Prefer this conversation's last-used model; only use default/first when none set
    setSelectedModelId(conversation.currentModel ?? fallback)
    localStorage.setItem(CHAT_LAST_ACTIVE_KEY, conversation.id)
    localStorage.setItem(
      CHAT_LAST_VIEWED_KEY_PREFIX + conversation.id,
      String(Date.now())
    )

    try {
      const result = await window.api.conversations.getMessages(conversation.id)
      if (result.success && result.messages) {
        setMessages(result.messages)
      } else {
        setMessages([])
        console.error('Failed to load messages:', result.error)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setMessages([])
    } finally {
      setIsLoading(false)
      // Restore draft for this conversation (or migrate from _new when switching
      // from no-conversation)
      const draftKey = CHAT_DRAFT_KEY_PREFIX + conversation.id
      const fromNew =
        conversationId === null
          ? localStorage.getItem(CHAT_DRAFT_KEY_PREFIX + '_new')
          : null
      const draft = localStorage.getItem(draftKey) ?? fromNew ?? ''
      if (fromNew) localStorage.removeItem(CHAT_DRAFT_KEY_PREFIX + '_new')
      setInput(draft)
      const storedMode =
        localStorage.getItem(CHAT_COMPOSER_MODE_KEY_PREFIX + conversation.id) ===
        'preview'
          ? 'preview'
          : 'plain'
      setComposerMode(storedMode)
      inputRef.current?.focus()
    }
  }

  const handleComposerModeChange = React.useCallback(
    (mode: PromptInputMode) => {
      setComposerMode(mode)
      const key = conversationId
        ? CHAT_COMPOSER_MODE_KEY_PREFIX + conversationId
        : CHAT_COMPOSER_MODE_KEY_PREFIX + '_new'
      localStorage.setItem(key, mode)
    },
    [conversationId]
  )

  // Register view-scoped hotkey: toggle composer mode (only active while ChatView is mounted)
  React.useEffect(() => {
    let unregister: (() => void) | null = null

    const setup = async () => {
      const result = await window.api?.settings?.get()
      const data = result?.success ? result.data : null
      const shortcut = (data as { 'chatView.hotkeys.toggleComposerMode'?: string })?.[
        'chatView.hotkeys.toggleComposerMode'
      ]
      setComposerModeShortcut(shortcut ?? null)
      if (!shortcut) return
      if (unregister) unregister()
      unregister = registerHotkey(shortcut, () => {
        const next = composerModeRef.current === 'plain' ? 'preview' : 'plain'
        handleComposerModeChange(next)
      })
    }

    setup()

    const unsubscribe = window.api?.settings?.onChange?.((data: { key: string }) => {
      if (data.key === 'chatView.hotkeys.toggleComposerMode') {
        setup()
      }
    })

    return () => {
      if (unregister) unregister()
      unsubscribe?.()
    }
  }, [handleComposerModeChange])

  // Debounced draft persistence (save as user types)
  const DRAFT_DEBOUNCE_MS = 400
  React.useEffect(() => {
    const key = conversationId
      ? CHAT_DRAFT_KEY_PREFIX + conversationId
      : CHAT_DRAFT_KEY_PREFIX + '_new'
    const t = window.setTimeout(() => {
      localStorage.setItem(key, input)
    }, DRAFT_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [input, conversationId])

  const handleStartEditTitle = () => {
    const currentTitle = conversations.find(c => c.id === conversationId)?.title ?? ''
    setEditingTitleValue(currentTitle)
    setIsEditingTitle(true)
    // Focus the input after render
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false)
    setEditingTitleValue('')
  }

  const handleSaveTitle = async () => {
    const newTitle = editingTitleValue.trim()
    if (!newTitle || !conversationId) {
      handleCancelEditTitle()
      return
    }

    try {
      const result = await window.api.conversations.update(conversationId, {
        title: newTitle,
      })
      if (result.success) {
        // Update shared list state so header and sidebar stay in sync
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, title: newTitle } : c))
        )
      }
    } catch (err) {
      console.error('Failed to update title:', err)
    } finally {
      setIsEditingTitle(false)
      setEditingTitleValue('')
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEditTitle()
    }
  }

  const handleModelChange = async (modelId: string) => {
    setSelectedModelId(modelId)
    if (conversationId) {
      try {
        await window.api.conversations.update(conversationId, {
          currentModel: modelId,
        })
        conversationListRef.current?.updateCurrentModel?.(conversationId, modelId)
      } catch (err) {
        console.error('Failed to update conversation model:', err)
      }
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation Sidebar - resizable */}
      <div
        className="
          relative flex-shrink-0 flex flex-col min-h-0 border-r border-border-primary
        "
        style={{ width: sidebarWidth }}
      >
        <ConversationList
          ref={conversationListRef}
          conversations={conversations}
          setConversations={setConversations}
          listLoading={listLoading}
          listError={listError}
          loadConversations={loadConversations}
          selectedId={conversationId || undefined}
          onSelect={handleSelectConversation}
          onTitleUpdate={() => {}}
          modelList={modelList}
          streamingConversationId={streamingConversationId}
          generatingTitleConversationId={generatingTitleConversationId ?? undefined}
          selectedConversationHasDraft={input.trim().length > 0}
          lastMessageAt={lastMessageAt}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-valuemin={180}
          aria-valuemax={480}
          tabIndex={0}
          className="
            absolute top-0 right-0 w-1 h-full cursor-col-resize
            hover:bg-border-primary
            active:bg-border-primary
            -mr-0.5
          "
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Main Chat Area - capped width for readability, centered when narrower than pane */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden items-center">
        <div className="flex flex-col flex-1 min-w-0 w-full max-w-4xl min-h-0">
          {/* Header - fixed at top */}
          <div
            className="
              flex-shrink-0 flex items-center gap-2 p-4 border-b border-border-primary
            "
          >
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  ref={titleInputRef}
                  value={editingTitleValue}
                  onChange={e => setEditingTitleValue(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleSaveTitle}
                  className="h-8 text-lg font-semibold max-w-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSaveTitle}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCancelEditTitle}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-lg font-semibold">
                  {generatingTitleConversationId === conversationId ? (
                    <span className="animate-title-shimmer">Generating title...</span>
                  ) : (
                    (conversations.find(c => c.id === conversationId)?.title ??
                    'New Chat')
                  )}
                </h2>
                {conversationId && (
                  <button
                    onClick={handleStartEditTitle}
                    className="
                      p-1 rounded opacity-0
                      group-hover:opacity-100
                      hover:bg-muted
                      transition-opacity
                    "
                    title="Edit conversation name"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Messages Area - Conversation with scroll-to-bottom */}
          <Conversation className="flex-1 min-h-0 overflow-hidden">
            <ConversationContent className="gap-0">
              {messages.length === 0 && !streamingContent && (
                <ConversationEmptyState
                  icon={<Bot className="h-12 w-12 text-muted-foreground" />}
                  title="Start a conversation"
                  description="Type a message below to begin."
                />
              )}
              {messages.map((message, index) => (
                <ChatTurn
                  key={message.id}
                  message={message}
                  modelList={modelList}
                  conversationId={conversationId}
                  messageIndex={index}
                  onRestoreFromHere={handleRestoreFromHere}
                />
              ))}
              {(streamingContent || (isLoading && currentTrace.length > 0)) && (
                <ChatTurn
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent || '',
                    timestamp: Date.now(),
                    trace: currentTrace,
                    isStreaming: true,
                    ...(selectedModelId ? { model: selectedModelId } : {}),
                  }}
                  modelList={modelList}
                  conversationId={conversationId}
                  messageIndex={messages.length}
                  onRestoreFromHere={handleRestoreFromHere}
                />
              )}
              {isLoading && !streamingContent && currentTrace.length === 0 && (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Composer: full-width footer with input + actions inside one container */}
          <form
            onSubmit={e => {
              e.preventDefault()
              if (input.trim() && !isLoading) handleSubmit(e)
            }}
            className="flex-shrink-0 w-full p-4 pt-2"
          >
            <PromptInput
              key={conversationId ?? '_new'}
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSubmit={() => {
                if (input.trim() && !isLoading)
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent)
              }}
              placeholder="Type a message..."
              disabled={isLoading}
              className="w-full min-h-[60px]"
              mode={composerMode}
              onModeChange={handleComposerModeChange}
              modeToggleShortcut={composerModeShortcut ?? undefined}
              containerHeight={composerHeight}
              onContainerHeightChange={h => {
                const maxPx = (window.innerHeight * CHAT_COMPOSER_HEIGHT_MAX_VH) / 100
                const clamped = Math.min(maxPx, Math.max(CHAT_COMPOSER_HEIGHT_MIN, h))
                setComposerHeight(clamped)
                const key = CHAT_COMPOSER_HEIGHT_KEY_PREFIX + (conversationId ?? '_new')
                localStorage.setItem(key, String(clamped))
              }}
              containerHeightMin={CHAT_COMPOSER_HEIGHT_MIN}
              containerHeightMaxVh={CHAT_COMPOSER_HEIGHT_MAX_VH}
              footer={
                <>
                  <ModelSelector
                    value={selectedModelId}
                    onValueChange={handleModelChange}
                    modelList={modelList}
                    disabled={isLoading}
                    placeholder="Select model"
                    className="flex-1 max-w-xs"
                  />
                  {isLoading && currentStreamId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.api.llm.cancelStream(currentStreamId)}
                      title="Stop generating"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </>
              }
            />
          </form>
        </div>
      </div>
    </div>
  )
}

/** Resolve model id to display label using model list or shortened id. */
function getModelLabel(modelId: string, modelList: ListModelsResult | null): string {
  const label = modelList?.all?.find(m => m.id === modelId)?.label
  if (label) return label
  if (modelId.includes(':')) return modelId.split(':').slice(1).join(':')
  return modelId
}

/**
 * Copy action with right alignment and feedback on copy.
 * Hover color varies by turn: user turns use base-200 for contrast on secondary bg.
 */
function CopyAction({
  messageId,
  content,
  isUser,
}: {
  messageId: string
  content: string
  isUser: boolean
}) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const isCopied = copiedId === messageId

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(messageId)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content, messageId])

  React.useEffect(() => {
    if (!isCopied) return
    const t = setTimeout(() => setCopiedId(null), 2000)
    return () => clearTimeout(t)
  }, [isCopied])

  return (
    <MessageAction
      label={isCopied ? 'Copied!' : 'Copy'}
      tooltip={isCopied ? 'Copied!' : 'Copy message'}
      onClick={handleCopy}
      className={cn('rounded-md', isUser ? 'hover:bg-base-200' : 'hover:bg-muted')}
    >
      {isCopied ? (
        <Check className="h-3 w-3 text-success-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </MessageAction>
  )
}

/**
 * ChatTurn: full-width turn with top border, avatar on the line (agent left, user right), lighter background.
 * Uses AI Elements Message / MessageContent / MessageResponse; keeps TraceDisplay and copy/timestamp/model.
 */
function ChatTurn({
  message,
  modelList = null,
  conversationId,
  messageIndex,
  onRestoreFromHere,
}: {
  message: ChatMessage
  modelList?: ListModelsResult | null
  conversationId: string | null
  messageIndex: number
  onRestoreFromHere: (convId: string, lastOutputMessageIndex: number) => Promise<void>
}) {
  const isUser = message.role === 'user'
  const [restoring, setRestoring] = React.useState(false)
  const handleRestore = React.useCallback(async () => {
    if (!conversationId) return
    setRestoring(true)
    try {
      await onRestoreFromHere(conversationId, messageIndex)
    } finally {
      setRestoring(false)
    }
  }, [conversationId, messageIndex, onRestoreFromHere])
  const orderedTraceItems = React.useMemo(
    () => (message.trace ? buildOrderedTraceItems(message.trace) : []),
    [message.trace]
  )
  const hasTrace = orderedTraceItems.length > 0

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={cn(
        `
          relative border-t px-4 pb-12
          last:pb-4
        `,
        isUser ? 'border-bg-secondary bg-bg-secondary' : 'border-border bg-background'
      )}
    >
      {/* Avatar on the divider (left) */}
      <div className="absolute top-0 left-0 flex -translate-y-1/2 px-4">
        <div
          className={cn(
            `
              flex h-8 w-8 shrink-0 items-center justify-center rounded-full border
              border-border bg-background
            `,
            isUser ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : message.model ? (
            <ProviderIcon
              providerId={getProviderIdFromModelId(message.model)}
              size={16}
              className="shrink-0"
            />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Metadata row: top-aligned below the line, right side */}
      <div className="flex items-start justify-between pt-2">
        <div className="h-8 w-8 shrink-0" aria-hidden />
        <div
          className="
            flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground
          "
        >
          {!isUser && message.model && (
            <span>{getModelLabel(message.model, modelList)}</span>
          )}
          <span>{formatTime(message.timestamp)}</span>
        </div>
      </div>

      <Message from={message.role} className="mt-2 max-w-full">
        {hasTrace && (
          <TraceDisplay
            orderedItems={orderedTraceItems}
            isStreaming={message.isStreaming}
          />
        )}
        <MessageContent
          className="
            group-[.is-assistant]:bg-transparent group-[.is-assistant]:p-0
            group-[.is-user]:bg-transparent group-[.is-user]:p-0
          "
        >
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
        {!message.isStreaming && message.content && (
          <MessageActions className="mt-2 w-full justify-end">
            {!isUser && conversationId && (
              <MessageAction
                label="Restore from here"
                tooltip="Remove later messages and continue from here"
                onClick={handleRestore}
                disabled={restoring}
                className={cn('rounded-md', 'hover:bg-muted')}
              >
                <RotateCcw className="h-3 w-3" />
              </MessageAction>
            )}
            <CopyAction
              messageId={message.id}
              content={message.content}
              isUser={isUser}
            />
          </MessageActions>
        )}
      </Message>
    </div>
  )
}

/**
 * Grouped tool execution - pairs a tool_call with its result.
 */
interface GroupedToolExecution {
  toolName: string
  toolCallId?: string
  args?: Record<string, unknown>
  result?: string
  duration?: number
  error?: string
  isComplete: boolean
}

/** Ordered trace item: either reasoning (thinking) or a grouped tool execution. */
type OrderedTraceItem =
  | { kind: 'reasoning'; content: string }
  | { kind: 'tool'; execution: GroupedToolExecution }

/**
 * Build an ordered list of trace items (reasoning + tool steps) for display.
 */
function buildOrderedTraceItems(trace: TraceEntry[]): OrderedTraceItem[] {
  const ordered: OrderedTraceItem[] = []
  const pendingById = new Map<string, GroupedToolExecution>()
  const pendingByName = new Map<string, GroupedToolExecution[]>()

  for (const entry of trace) {
    if (entry.type === 'reasoning' && entry.content?.trim()) {
      ordered.push({ kind: 'reasoning', content: entry.content.trim() })
    } else if (entry.type === 'tool_call' && entry.toolName) {
      const group: GroupedToolExecution = {
        toolName: entry.toolName,
        toolCallId: entry.toolCallId,
        args: entry.args,
        isComplete: false,
      }
      ordered.push({ kind: 'tool', execution: group })
      if (entry.toolCallId) {
        pendingById.set(entry.toolCallId, group)
      } else {
        if (!pendingByName.has(entry.toolName)) {
          pendingByName.set(entry.toolName, [])
        }
        pendingByName.get(entry.toolName)!.push(group)
      }
    } else if (entry.type === 'tool_result') {
      let group: GroupedToolExecution | undefined
      if (entry.toolCallId && pendingById.has(entry.toolCallId)) {
        group = pendingById.get(entry.toolCallId)!
        pendingById.delete(entry.toolCallId)
      } else if (entry.toolName) {
        const pending = pendingByName.get(entry.toolName)
        if (pending?.length) group = pending.shift()!
      }
      if (group) {
        group.result = entry.result
        group.duration = entry.duration
        group.error = entry.error
        group.isComplete = true
      } else {
        ordered.push({
          kind: 'tool',
          execution: {
            toolName: entry.toolName || 'unknown',
            toolCallId: entry.toolCallId,
            result: entry.result,
            duration: entry.duration,
            error: entry.error,
            isComplete: true,
          },
        })
      }
    }
  }

  return ordered
}

/**
 * Determine ToolInvocation status from execution state.
 */
function getToolStatus(
  execution: GroupedToolExecution,
  isStreaming?: boolean
): ToolInvocationStatus {
  if (execution.error) return 'error'
  if (execution.isComplete) return 'complete'
  if (isStreaming) return 'calling'
  return 'complete'
}

/**
 * TraceDisplay Component
 *
 * Displays reasoning (thinking) and tool executions in order using ChainOfThought.
 * Reasoning blocks are collapsible; tool steps use ToolInvocation.
 */
function TraceDisplay({
  orderedItems,
  isStreaming,
}: {
  orderedItems: OrderedTraceItem[]
  isStreaming?: boolean
}) {
  return (
    <ChainOfThought defaultOpen={true} className="mb-2">
      <ChainOfThoughtHeader>
        {orderedItems.length} step{orderedItems.length !== 1 ? 's' : ''}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="space-y-2">
          {orderedItems.map((item, index) =>
            item.kind === 'reasoning' ? (
              <Collapsible key={`reasoning-${index}`} defaultOpen={false}>
                <div className="rounded-lg border border-border bg-muted/30 text-sm">
                  <CollapsibleTrigger
                    className="
                      flex w-full items-center gap-2 px-3 py-2
                      hover:bg-muted/50
                      transition-colors
                    "
                  >
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">Thinking</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div
                      className="
                        border-t border-border px-3 py-2 text-muted-foreground
                        whitespace-pre-wrap text-xs font-mono max-h-48 overflow-y-auto
                      "
                    >
                      {item.content}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ) : (
              <ToolInvocation
                key={item.execution.toolCallId || index}
                name={item.execution.toolName}
                args={item.execution.args}
                result={item.execution.result}
                duration={item.execution.duration}
                error={item.execution.error}
                status={getToolStatus(item.execution, isStreaming)}
                defaultOpen={true}
              />
            )
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
