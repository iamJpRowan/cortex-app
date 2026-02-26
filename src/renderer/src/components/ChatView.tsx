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
import type { LucideIcon } from 'lucide-react'
import { getToolIcon } from '@/lib/tool-icons'
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
import { ToolInvocationDetails } from '@/components/ai-elements/tool-invocation'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ModelSelector } from './ModelSelector'
import { ModeSelector } from './ModeSelector'
import { ProviderIcon, getProviderIdFromModelId } from './ProviderIcon'
import type {
  ChatMessage,
  StreamEvent,
  TraceEntry,
  ConversationMetadata,
  TurnBlock,
} from '@/types/api'
import {
  buildDisplayItems,
  buildOrderedTraceItems,
  formatStepDuration,
  formatToolStepForCopy,
  getToolStatus,
  type OrderedTraceItem,
} from '@/lib/chat-blocks'
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
import type { ListModelsResult, PermissionMode } from '@shared/types'
import { registerHotkey } from '@/lib/hotkeys'

/**
 * Streaming blocks debug: set localStorage DEBUG_STREAMING_BLOCKS='1' then run a tool (e.g. Run Cypher).
 * Console will log:
 * - [ChatView trace] each trace event: type, toolCallId, toolName, prevBlocksLen.
 * - [BlockBasedTurn] on each render: blocks, displayItems, and each trace group's groupKey/entriesLen/entryTypes/toolCallIds.
 * Use to verify tool_call and tool_result share the same toolCallId and that buildDisplayItems produces one group.
 */
const isStreamingBlocksDebug = () =>
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('DEBUG_STREAMING_BLOCKS') === '1'

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
  /** Structured blocks (message, tool, message, tool) during streaming; cleared on start/complete. */
  const [streamingBlocks, setStreamingBlocks] = React.useState<TurnBlock[]>([])
  const streamingBlocksRef = React.useRef<TurnBlock[]>([])
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [editingTitleValue, setEditingTitleValue] = React.useState('')
  const [modelList, setModelList] = React.useState<ListModelsResult | null>(null)
  const [defaultModel, setDefaultModel] = React.useState<string>('')
  /** Model to use for the next request (conversation's current or default). */
  const [selectedModelId, setSelectedModelId] = React.useState<string>('')
  /** Per-conversation last message time (for unread indicator when stream completes). */
  const [lastMessageAt, setLastMessageAt] = React.useState<Record<string, number>>({})
  /** Permission modes (from modes.list()); used for mode selector. */
  const [modeList, setModeList] = React.useState<PermissionMode[] | null>(null)
  /** Default permission mode for new chats (from settings). */
  const [defaultModeId, setDefaultModeId] = React.useState<string>('full')
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
  /** Time of last stream event (token/trace/start) for "Still working..." indicator. */
  const lastEventTimeRef = React.useRef<number>(0)
  const [showStillWorking, setShowStillWorking] = React.useState(false)
  /** Tool name -> { displayName, icon } from registry (resolved at render, not stored in chat). */
  const [toolMetadataMap, setToolMetadataMap] = React.useState<
    Map<string, { displayName?: string; icon?: string }>
  >(new Map())
  /** Index of the latest assistant message in current list (for default-expand steps). -1 when loaded from history. */
  const [latestAssistantMessageIndex, setLatestAssistantMessageIndex] =
    React.useState<number>(-1)
  /** Set after appending on stream complete; applied in useEffect to avoid setState inside setState. */
  const nextAssistantIndexRef = React.useRef<number | null>(null)
  /** Throttle token updates: latest accumulated from token events. */
  const latestAccumulatedRef = React.useRef<string>('')
  /** Last time we pushed streaming content to state (ms). */
  const lastStreamingUpdateRef = React.useRef<number>(0)
  /** Pending timeout for throttled streaming update. */
  const streamingThrottleTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  React.useEffect(() => {
    if (nextAssistantIndexRef.current !== null) {
      setLatestAssistantMessageIndex(nextAssistantIndexRef.current)
      nextAssistantIndexRef.current = null
    }
  }, [messages])

  React.useEffect(() => {
    let cancelled = false
    window.api.llm
      .toolsList()
      .then(res => {
        if (cancelled || !res.success || !res.tools) return
        const map = new Map<string, { displayName?: string; icon?: string }>()
        for (const { name, metadata } of res.tools) {
          const m = metadata as { displayName?: string; icon?: string }
          if (name) map.set(name, { displayName: m?.displayName, icon: m?.icon })
        }
        setToolMetadataMap(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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

  // Focus prompt input when starting a new chat or switching conversations.
  // Try immediately and once more after a short delay (rich editor may not be ready yet).
  React.useEffect(() => {
    const id1 = setTimeout(() => inputRef.current?.focus(), 0)
    const id2 = setTimeout(() => inputRef.current?.focus(), 120)
    return () => {
      clearTimeout(id1)
      clearTimeout(id2)
    }
  }, [conversationId])

  const STILL_WORKING_THRESHOLD_MS = 5000
  const STILL_WORKING_CHECK_MS = 1000
  React.useEffect(() => {
    if (!isLoading) {
      setShowStillWorking(false)
      return
    }
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current
      setShowStillWorking(elapsed >= STILL_WORKING_THRESHOLD_MS)
    }, STILL_WORKING_CHECK_MS)
    return () => clearInterval(interval)
  }, [isLoading])

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
        setLatestAssistantMessageIndex(-1)
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

  // Load permission modes (enabled only) and default mode for selector
  const loadModeList = React.useCallback(() => {
    window.api.modes.list().then(listRes => {
      if (listRes?.success && listRes.modes) {
        setModeList(listRes.modes)
      }
    })
  }, [])

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.modes.list(),
      window.api.settings
        .get('agents.defaultModeId')
        .then(r => (r.success && typeof r.data === 'string' ? r.data : 'full')),
    ]).then(([listRes, defaultMode]) => {
      if (!cancelled && listRes?.success && listRes.modes) {
        setModeList(listRes.modes)
        setDefaultModeId(defaultMode)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Refetch enabled-only mode list on window focus (e.g. after changing modes in Settings)
  React.useEffect(() => {
    const onFocus = () => loadModeList()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadModeList])

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
      if (streamingThrottleTimeoutRef.current) {
        clearTimeout(streamingThrottleTimeoutRef.current)
        streamingThrottleTimeoutRef.current = null
      }
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
      case 'start': {
        lastEventTimeRef.current = Date.now()
        setShowStillWorking(false)
        setStreamingContent('')
        setStreamingBlocks([])
        streamingBlocksRef.current = []
        setCurrentTrace([])
        currentTraceRef.current = []
        latestAccumulatedRef.current = ''
        lastStreamingUpdateRef.current = 0
        if (streamingThrottleTimeoutRef.current) {
          clearTimeout(streamingThrottleTimeoutRef.current)
          streamingThrottleTimeoutRef.current = null
        }
        break
      }

      case 'token': {
        lastEventTimeRef.current = Date.now()
        setShowStillWorking(false)
        // Use currentSegment when present (structured streaming); else accumulated for legacy
        const segmentOrAccumulated =
          event.currentSegment !== undefined
            ? event.currentSegment
            : event.accumulated || ''
        latestAccumulatedRef.current = segmentOrAccumulated
        const now = Date.now()
        const elapsed = now - lastStreamingUpdateRef.current
        const STREAMING_THROTTLE_MS = 80
        if (lastStreamingUpdateRef.current === 0 || elapsed >= STREAMING_THROTTLE_MS) {
          setStreamingContent(segmentOrAccumulated)
          lastStreamingUpdateRef.current = now
        } else if (streamingThrottleTimeoutRef.current === null) {
          streamingThrottleTimeoutRef.current = setTimeout(() => {
            streamingThrottleTimeoutRef.current = null
            const latest = latestAccumulatedRef.current
            setStreamingContent(latest)
            lastStreamingUpdateRef.current = Date.now()
          }, STREAMING_THROTTLE_MS - elapsed)
        }
        break
      }

      case 'trace': {
        lastEventTimeRef.current = Date.now()
        setShowStillWorking(false)
        const traceEntry = event.trace
        const completedSegment = event.completedSegment
        if (isStreamingBlocksDebug()) {
          console.log('[ChatView trace]', {
            type: traceEntry.type,
            toolCallId: traceEntry.toolCallId,
            toolName: traceEntry.toolName,
            completedSegmentLen: completedSegment?.length ?? 0,
            prevBlocksLen: streamingBlocksRef.current.length,
          })
        }
        requestAnimationFrame(() => {
          currentTraceRef.current = [...currentTraceRef.current, traceEntry]
          setCurrentTrace(prev => [...prev, traceEntry])
          // Append from ref so we never drop an entry when two trace events are processed in one batch
          const prevBlocks = streamingBlocksRef.current
          const next: TurnBlock[] = [
            ...prevBlocks,
            ...(completedSegment
              ? [{ type: 'text' as const, text: completedSegment }]
              : []),
            { type: 'trace' as const, entry: traceEntry },
          ]
          streamingBlocksRef.current = next
          if (isStreamingBlocksDebug()) {
            console.log(
              '[ChatView trace] next blocks len',
              next.length,
              'block types',
              next.map(b => (b.type === 'text' ? 'text' : b.entry.type))
            )
          }
          setStreamingBlocks(next)
          setStreamingContent('')
        })
        break
      }

      case 'complete': {
        setGeneratingTitleConversationId(prev =>
          prev === event.conversationId ? null : prev
        )
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: event.response,
          timestamp: Date.now(),
          ...(event.blocks && event.blocks.length > 0 ? { blocks: event.blocks } : {}),
          ...(event.trace?.length ? { trace: event.trace } : {}),
          ...(event.model != null && event.model !== '' ? { model: event.model } : {}),
          ...(event.tokensUsed != null ? { tokensUsed: event.tokensUsed } : {}),
        }
        setMessages(prev => {
          nextAssistantIndexRef.current = prev.length
          return [...prev, newMessage]
        })
        setStreamingContent('')
        setStreamingBlocks([])
        streamingBlocksRef.current = []
        currentTraceRef.current = []
        setCurrentTrace([])
        setIsLoading(false)
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
        setStreamingBlocks([])
        streamingBlocksRef.current = []
        currentTraceRef.current = []
        setCurrentTrace([])
        setIsLoading(false)
        break
      }

      case 'error': {
        console.error('Stream error:', event.error)
        setStreamingContent('')
        setStreamingBlocks([])
        streamingBlocksRef.current = []
        setIsLoading(false)
        setGeneratingTitleConversationId(prev =>
          prev === event.conversationId ? null : prev
        )
        const errorPartial = event.accumulated?.trim() ?? ''
        const errorBody = `Error: ${event.error}${event.suggestion ? `\n\n${event.suggestion}` : ''}`
        const errorContent = errorPartial ? `${errorPartial}\n\n${errorBody}` : errorBody
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: errorContent,
            timestamp: Date.now(),
            trace: currentTraceRef.current.length
              ? [...currentTraceRef.current]
              : undefined,
          },
        ])
        currentTraceRef.current = []
        setCurrentTrace([])
        break
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    lastEventTimeRef.current = Date.now()
    setShowStillWorking(false)
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
        setLatestAssistantMessageIndex(-1)
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
    setLatestAssistantMessageIndex(-1)
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
        setLatestAssistantMessageIndex(-1)
      } else {
        setMessages([])
        setLatestAssistantMessageIndex(-1)
        console.error('Failed to load messages:', result.error)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setMessages([])
      setLatestAssistantMessageIndex(-1)
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

  const handleModeChange = async (modeId: string) => {
    if (!conversationId) return
    try {
      await window.api.conversations.update(conversationId, { modeId })
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, modeId } : c))
      )
    } catch (err) {
      console.error('Failed to update conversation mode:', err)
    }
  }

  /** Memoized streaming message so we don't create a new object on every unrelated re-render. */
  const streamingMessage = React.useMemo((): ChatMessage | null => {
    if (!streamingContent && !isLoading) return null
    const content =
      streamingBlocks.length > 0
        ? [
            ...streamingBlocks
              .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
              .map(b => b.text),
            streamingContent,
          ]
            .filter(Boolean)
            .join('\n\n')
        : streamingContent || ''
    const blocks =
      streamingBlocks.length > 0 || streamingContent
        ? [
            ...streamingBlocks,
            ...(streamingContent
              ? [{ type: 'text' as const, text: streamingContent }]
              : []),
          ]
        : undefined
    return {
      id: 'streaming',
      role: 'assistant',
      content,
      timestamp: Date.now(),
      blocks,
      trace: currentTrace,
      isStreaming: true,
      ...(selectedModelId ? { model: selectedModelId } : {}),
    }
  }, [streamingBlocks, streamingContent, currentTrace, selectedModelId, isLoading])

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
        {/* Header: full-width divider, content in max-w-4xl */}
        <div className="flex-shrink-0 w-full border-b border-border-primary">
          <div className="flex items-center gap-2 p-4 max-w-4xl mx-auto w-full">
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
        </div>

        <div className="flex flex-col flex-1 min-w-0 w-full max-w-4xl min-h-0">
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
                  toolMetadataMap={toolMetadataMap}
                  defaultStepsExpanded={
                    index === latestAssistantMessageIndex && message.role === 'assistant'
                  }
                />
              ))}
              {streamingMessage && (
                <ChatTurn
                  message={streamingMessage}
                  modelList={modelList}
                  conversationId={conversationId}
                  messageIndex={messages.length}
                  onRestoreFromHere={handleRestoreFromHere}
                  showStillWorking={showStillWorking}
                  toolMetadataMap={toolMetadataMap}
                  defaultStepsExpanded={true}
                />
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
                  {conversationId ? (
                    <ModeSelector
                      value={
                        conversations.find(c => c.id === conversationId)?.modeId ??
                        defaultModeId ??
                        'full'
                      }
                      onValueChange={handleModeChange}
                      modeList={modeList}
                      disabled={isLoading}
                      placeholder="Permission mode"
                      className="flex-1 max-w-[11rem]"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground px-2 py-1.5">
                      New chats:{' '}
                      {modeList?.find(m => m.id === defaultModeId)?.name ?? defaultModeId}
                    </span>
                  )}
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
 * Renders blocks as display items: text segments and grouped trace steps (one row per tool execution).
 * Uses TraceDisplayForGroup so orderedItems are memoized by groupKey and avoid icon flicker.
 */
const BlockBasedTurn = React.memo(function BlockBasedTurn({
  blocks,
  isStreaming,
  showStillWorking,
  toolMetadataMap,
}: {
  blocks: TurnBlock[]
  isStreaming?: boolean
  showStillWorking?: boolean
  toolMetadataMap: Map<string, { displayName?: string; icon?: string }>
}) {
  const displayItems = React.useMemo(() => buildDisplayItems(blocks), [blocks])
  const total = displayItems.length
  if (isStreamingBlocksDebug() && blocks.some(b => b.type === 'trace')) {
    const traceGroups = displayItems.filter(
      (i): i is { kind: 'traceGroup'; entries: TraceEntry[]; groupKey: string } =>
        i.kind === 'traceGroup'
    )
    console.log('[BlockBasedTurn]', {
      blocksLen: blocks.length,
      blockTypes: blocks.map(b => (b.type === 'text' ? 'text' : b.entry.type)),
      displayItemCount: displayItems.length,
      traceGroups: traceGroups.map(t => ({
        groupKey: t.groupKey,
        entriesLen: t.entries.length,
        entryTypes: t.entries.map(e => e.type),
        toolCallIds: t.entries.map(e => e.toolCallId),
      })),
    })
  }
  return (
    <div className="flex flex-col gap-3">
      {displayItems.map((item, idx) =>
        item.kind === 'text' ? (
          item.text.trim() ? (
            <MessageContent
              key={`text-${idx}`}
              className="
                group-[.is-assistant]:bg-transparent group-[.is-assistant]:p-0
                group-[.is-user]:bg-transparent group-[.is-user]:p-0
              "
            >
              <MessageResponse>{item.text}</MessageResponse>
            </MessageContent>
          ) : null
        ) : (
          <TraceDisplayForGroup
            key={`trace-${item.groupKey}`}
            entries={item.entries}
            groupKey={item.groupKey}
            isStreaming={isStreaming}
            showStillWorking={showStillWorking && idx === total - 1}
            toolMetadataMap={toolMetadataMap}
            defaultStepsExpanded={false}
          />
        )
      )}
    </div>
  )
})

/**
 * ChatTurn: full-width turn with top border, avatar on the line (agent left, user right), lighter background.
 * Uses AI Elements Message / MessageContent / MessageResponse; keeps TraceDisplay and copy/timestamp/model.
 * Memoized so trace updates only re-render the streaming turn, not the whole list (avoids re-parsing
 * all message markdown via Streamdown when e.g. a tool result arrives).
 */
const ChatTurn = React.memo(function ChatTurn({
  message,
  modelList = null,
  conversationId,
  messageIndex,
  onRestoreFromHere,
  showStillWorking = false,
  toolMetadataMap,
  defaultStepsExpanded = false,
}: {
  message: ChatMessage
  modelList?: ListModelsResult | null
  conversationId: string | null
  messageIndex: number
  onRestoreFromHere: (convId: string, lastOutputMessageIndex: number) => Promise<void>
  showStillWorking?: boolean
  toolMetadataMap: Map<string, { displayName?: string; icon?: string }>
  defaultStepsExpanded?: boolean
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
  const hasBlocksWithTrace =
    message.blocks != null && message.blocks.some(b => b.type === 'trace')
  const showSteps = !isUser && (hasTrace || hasBlocksWithTrace || message.isStreaming)

  const formatTokensUsed = (tokens: {
    input?: number
    output?: number
    thinking?: number
  }) => {
    const total = (tokens.input ?? 0) + (tokens.output ?? 0) + (tokens.thinking ?? 0)
    if (total === 0) return null
    const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
    if (
      tokens.input != null &&
      tokens.output != null &&
      total === tokens.input + tokens.output
    ) {
      return `${fmt(tokens.input)} in / ${fmt(tokens.output)} out`
    }
    return `${fmt(total)} tokens`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round(
      (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 0) return `Today, ${timeStr}`
    if (diffDays === 1) return `Yesterday, ${timeStr}`
    const dateStr = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
    return `${dateStr}, ${timeStr}`
  }

  return (
    <div
      className={cn(
        `
          relative border-t px-4 pt-5 pb-6
          last:pb-3
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

      <Message from={message.role} className="mt-1 max-w-full">
        {message.blocks && message.blocks.length > 0 ? (
          <BlockBasedTurn
            blocks={message.blocks}
            isStreaming={message.isStreaming}
            showStillWorking={showStillWorking}
            toolMetadataMap={toolMetadataMap}
          />
        ) : (
          <>
            {showSteps && (
              <TraceDisplay
                orderedItems={orderedTraceItems}
                isStreaming={message.isStreaming}
                showStillWorking={showStillWorking}
                toolMetadataMap={toolMetadataMap}
                defaultStepsExpanded={defaultStepsExpanded}
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
          </>
        )}
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

      {/* Message details below actions: model, tokens, timestamp (both AI and user) */}
      <div className="flex items-start justify-between pt-0.5 pb-0.5">
        <div className="w-8 shrink-0" aria-hidden />
        <div
          className="
            flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground
          "
        >
          {!isUser && message.model && (
            <span>{getModelLabel(message.model, modelList)}</span>
          )}
          {!isUser &&
            message.tokensUsed != null &&
            formatTokensUsed(message.tokensUsed) != null && (
              <span>{formatTokensUsed(message.tokensUsed)}</span>
            )}
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    </div>
  )
})

function StepContentWithCopy({
  copyValue,
  children,
}: {
  copyValue?: string
  children: React.ReactNode
}) {
  const [copied, setCopied] = React.useState(false)
  const handleCopy = React.useCallback(() => {
    if (!copyValue?.trim()) return
    navigator.clipboard.writeText(copyValue).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [copyValue])
  return (
    <>
      {copyValue != null && copyValue.trim() !== '' && (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={handleCopy}
            className="
              flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground
              hover:bg-muted hover:text-foreground
            "
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {children}
    </>
  )
}

/**
 * Memoized wrapper that builds orderedItems from entries only when groupKey changes.
 * Reduces re-renders and icon flicker when only the streaming segment updates.
 */
const TraceDisplayForGroup = React.memo(function TraceDisplayForGroup({
  entries,
  groupKey,
  isStreaming,
  showStillWorking,
  toolMetadataMap,
  defaultStepsExpanded = false,
}: {
  entries: TraceEntry[]
  groupKey: string
  isStreaming?: boolean
  showStillWorking?: boolean
  toolMetadataMap: Map<string, { displayName?: string; icon?: string }>
  defaultStepsExpanded?: boolean
}) {
  // Recompute when entries change (e.g. tool_result added) so loading → complete updates; groupKey stays stable to avoid remount
  const orderedItems = React.useMemo(
    () => buildOrderedTraceItems(entries),
    [groupKey, entries.length]
  )
  return (
    <TraceDisplay
      orderedItems={orderedItems}
      isStreaming={isStreaming}
      showStillWorking={showStillWorking}
      toolMetadataMap={toolMetadataMap}
      defaultStepsExpanded={defaultStepsExpanded}
    />
  )
})

/**
 * TraceDisplay Component
 *
 * Unified step rows: thinking and tools use the same layout (icon + label + duration + chevron).
 * Clicking the row expands to show content (thinking text or tool args/result/error).
 * When streaming with no steps yet, shows a single "Thinking..." placeholder step.
 */
function TraceDisplay({
  orderedItems,
  isStreaming,
  showStillWorking = false,
  toolMetadataMap,
  defaultStepsExpanded = false,
}: {
  orderedItems: OrderedTraceItem[]
  isStreaming?: boolean
  showStillWorking?: boolean
  toolMetadataMap: Map<string, { displayName?: string; icon?: string }>
  defaultStepsExpanded?: boolean
}) {
  const total = orderedItems.length
  const showPlaceholder = total === 0 && isStreaming

  const stepRow = (
    isLastStep: boolean,
    Icon: LucideIcon,
    label: React.ReactNode,
    durationMs: number | undefined,
    hasExpandContent: boolean,
    isActive: boolean,
    children: React.ReactNode,
    groupClass: 'group/thinking' | 'group/tool',
    defaultOpen?: boolean,
    copyValue?: string
  ) => {
    const statusStyles = {
      complete: 'text-muted-foreground',
      active: 'text-foreground',
    }
    const chevronRotateClass =
      groupClass === 'group/thinking'
        ? 'group-data-[state=open]/thinking:rotate-180'
        : 'group-data-[state=open]/tool:rotate-180'
    return (
      <div
        className={cn(
          'flex gap-2 text-sm fade-in-0 slide-in-from-top-2 animate-in',
          statusStyles[isActive ? 'active' : 'complete']
        )}
      >
        <div className="relative mt-0.5">
          <Icon className="size-4 shrink-0" />
          {!isLastStep && (
            <div className="absolute top-7 bottom-0 left-1/2 -mx-px w-px bg-border" />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <Collapsible defaultOpen={defaultOpen ?? false} className={groupClass}>
            <CollapsibleTrigger
              className="
                flex w-full items-center gap-2 text-left
                hover:opacity-80
                transition-opacity py-0.5
              "
              disabled={!hasExpandContent}
            >
              {label}
              {durationMs != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatStepDuration(durationMs)}
                </span>
              )}
              {hasExpandContent && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    chevronRotateClass
                  )}
                />
              )}
              {isActive && (
                <Loader2 className="
                  h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground
                " />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <StepContentWithCopy copyValue={copyValue}>{children}</StepContentWithCopy>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-2 w-full max-w-none bg-muted/10 py-2 pl-1 pr-3">
      <div className="mt-2 space-y-3">
        {showPlaceholder && (
          <div className="flex gap-2 text-sm text-foreground">
            <div className="relative mt-0.5">
              <Brain className="size-4 shrink-0" />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}
        {orderedItems.map((item, index) => {
          const isLastStep = index === total - 1
          const defaultOpen = defaultStepsExpanded
          if (item.kind === 'reasoning') {
            return (
              <React.Fragment key={`reasoning-${index}`}>
                {stepRow(
                  isLastStep,
                  Brain,
                  <span className="text-xs">Thinking</span>,
                  item.duration,
                  true,
                  false,
                  <div
                    className="
                      mt-1.5 text-muted-foreground whitespace-pre-wrap text-xs font-mono
                      rounded bg-muted/50 px-2 py-1.5 max-h-48 overflow-y-auto
                    "
                  >
                    {item.content}
                  </div>,
                  'group/thinking',
                  defaultOpen,
                  item.content?.trim() ?? undefined
                )}
              </React.Fragment>
            )
          }
          const exec = item.execution
          // Prefer current registry; fall back to trace displayName/icon (old messages).
          const fromMap = toolMetadataMap.get(exec.toolName)
          const fromTrace =
            exec.displayName || exec.icon
              ? { displayName: exec.displayName, icon: exec.icon }
              : undefined
          const toolMeta = fromMap ?? fromTrace
          const toolLabel = toolMeta?.displayName ?? exec.toolName
          const toolStatus = getToolStatus(exec, isStreaming)
          const hasDetails = Boolean(
            (exec.args && Object.keys(exec.args).length > 0) || exec.result || exec.error
          )
          const isActive = toolStatus === 'calling'
          const ToolIcon = getToolIcon(toolMeta?.icon)
          const toolCopyText = hasDetails ? formatToolStepForCopy(exec) : undefined
          return (
            <React.Fragment key={exec.toolCallId ?? index}>
              {stepRow(
                isLastStep,
                ToolIcon,
                <span className="truncate text-xs">{toolLabel}</span>,
                exec.duration,
                hasDetails,
                isActive,
                <div className="mt-1.5">
                  <ToolInvocationDetails
                    args={exec.args}
                    result={exec.result}
                    error={exec.error}
                  />
                </div>,
                'group/tool',
                defaultOpen,
                toolCopyText
              )}
            </React.Fragment>
          )
        })}
        {showStillWorking && (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>Still working…</span>
          </div>
        )}
      </div>
    </div>
  )
}
