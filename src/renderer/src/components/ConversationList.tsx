import * as React from 'react'
import {
  MessageSquarePlus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  FileEdit,
  MessageSquareDot,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ProviderIcon, getProviderIdFromModelId } from '@/components/ProviderIcon'
import { cn } from '@/lib/utils'
import type { ConversationMetadata } from '@/types/api'
import type { ListModelsResult } from '@shared/types'
import { CHAT_DRAFT_KEY_PREFIX, CHAT_LAST_VIEWED_KEY_PREFIX } from '@/lib/chat-storage'

interface ConversationListProps {
  /** List of conversations (controlled by parent for single source of truth with header). */
  conversations: ConversationMetadata[]
  /** Update conversations (called by list and by ref methods). */
  setConversations: React.Dispatch<React.SetStateAction<ConversationMetadata[]>>
  /** Whether the list is loading (e.g. initial fetch). */
  listLoading?: boolean
  /** Error message if list failed to load. */
  listError?: string | null
  /** Load/reload conversations (e.g. for retry). */
  loadConversations: () => void | Promise<void>
  /** Currently selected conversation ID */
  selectedId?: string
  /** Called when a conversation is selected */
  onSelect?: (conversation: ConversationMetadata) => void
  /** Called when a conversation title is updated (e.g. rename in sidebar). */
  onTitleUpdate?: (conversationId: string, newTitle: string) => void
  /** Model list to resolve currentModel id to label (show below chat name). */
  modelList?: ListModelsResult | null
  /** Conversation currently receiving a stream (shows spinner). */
  streamingConversationId?: string
  /** Conversation ID currently generating title (shows "Generating title..." in list). */
  generatingTitleConversationId?: string
  /** Whether the selected conversation has an unsaved draft. */
  selectedConversationHasDraft?: boolean
  /** Per-conversation last message timestamp (for unread indicator). */
  lastMessageAt?: Record<string, number>
  /** Conversation IDs with a pending tool approval (Phase 9: runtime approval). */
  pendingApprovalConversationIds?: Set<string>
}

/** Methods exposed via ref */
export interface ConversationListRef {
  /** Update the title of a conversation in the list (may fetch and add if missing). */
  updateTitle: (conversationId: string, newTitle: string) => void | Promise<void>
  /** Update the current model shown for a conversation (e.g. after stream complete). */
  updateCurrentModel: (conversationId: string, currentModel: string) => void
  /** Add a placeholder conversation (e.g. while generating title for first message). */
  addPlaceholderConversation: (conversationId: string) => void
}

/**
 * ConversationList Component
 *
 * Displays a list of conversations with basic CRUD operations.
 * Minimal implementation for Phase 3 - will be enhanced in later phases.
 */
export const ConversationList = React.forwardRef<
  ConversationListRef,
  ConversationListProps
>(function ConversationList(
  {
    conversations,
    setConversations,
    listLoading = false,
    listError = null,
    loadConversations,
    selectedId,
    onSelect,
    onTitleUpdate,
    modelList,
    streamingConversationId,
    generatingTitleConversationId,
    selectedConversationHasDraft = false,
    lastMessageAt = {},
    pendingApprovalConversationIds,
  },
  ref
) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const editInputRef = React.useRef<HTMLInputElement>(null)

  // Filter conversations based on search query
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const query = searchQuery.toLowerCase()
    return conversations.filter(c => c.title.toLowerCase().includes(query))
  }, [conversations, searchQuery])

  // Expose methods via ref for parent component (use parent's setConversations for single source of truth)
  React.useImperativeHandle(
    ref,
    () => ({
      updateTitle: async (conversationId: string, newTitle: string) => {
        setConversations(prev => {
          const found = prev.find(c => c.id === conversationId)
          if (found) {
            return prev.map(c =>
              c.id === conversationId ? { ...c, title: newTitle } : c
            )
          }
          return prev
        })
        // If conversation not in list (e.g. created from first message), fetch and add
        try {
          const result = await window.api.conversations.get(conversationId)
          if (result.success && result.conversation) {
            setConversations(prev => {
              const found = prev.find(c => c.id === conversationId)
              if (found) return prev // Already updated by sync path above
              return [{ ...result.conversation!, title: newTitle }, ...prev]
            })
          }
        } catch {
          // Ignore; conversation may not exist yet
        }
      },
      updateCurrentModel: (conversationId: string, currentModel: string) => {
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, currentModel } : c))
        )
      },
      addPlaceholderConversation: (conversationId: string) => {
        setConversations(prev => {
          if (prev.some(c => c.id === conversationId)) return prev
          const now = Date.now()
          return [
            {
              id: conversationId,
              title: 'New Chat',
              currentModel: null,
              agentId: null,
              createdAt: now,
              updatedAt: now,
              messageCount: 0,
            },
            ...prev,
          ]
        })
      },
    }),
    [setConversations]
  )

  // Focus input when editing starts
  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleNewChat = async () => {
    try {
      const result = await window.api.conversations.create()
      if (result.success && result.conversation) {
        // Add to list and select so ChatView shows this conversation.
        setConversations(prev => [result.conversation!, ...prev])
        onSelect?.(result.conversation)
        // Do not clear selection; that broke title/editing for new chats.
      }
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await window.api.conversations.delete(id)
      if (result.success) {
        const deleteIndex = conversations.findIndex(c => c.id === id)
        const newList = conversations.filter(c => c.id !== id)
        setConversations(newList)
        if (selectedId === id && newList.length > 0) {
          const nextIndex = Math.min(deleteIndex, newList.length - 1)
          onSelect?.(newList[nextIndex])
        } else if (selectedId === id && newList.length === 0) {
          const createResult = await window.api.conversations.create()
          if (createResult.success && createResult.conversation) {
            setConversations(prev => [createResult.conversation!, ...prev])
            onSelect?.(createResult.conversation)
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleStartRename = (conversation: ConversationMetadata, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditingTitle(conversation.title)
  }

  const handleCancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) {
      handleCancelRename()
      return
    }

    try {
      const newTitle = editingTitle.trim()
      const result = await window.api.conversations.update(id, { title: newTitle })
      if (result.success) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, title: newTitle } : c))
        )
        onTitleUpdate?.(id, newTitle)
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    } finally {
      setEditingId(null)
      setEditingTitle('')
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id)
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  const hasDraft = (id: string) =>
    id === selectedId
      ? selectedConversationHasDraft
      : (localStorage.getItem(CHAT_DRAFT_KEY_PREFIX + id) ?? '').trim().length > 0

  const isUnread = (conv: ConversationMetadata) => {
    const lastMsg = lastMessageAt[conv.id] ?? conv.updatedAt
    const lastViewed = parseInt(
      localStorage.getItem(CHAT_LAST_VIEWED_KEY_PREFIX + conv.id) ?? '0',
      10
    )
    return lastMsg > lastViewed && conv.id !== selectedId
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (listLoading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (listError) {
    return (
      <div className="p-4 text-sm text-destructive">
        <p>Error: {listError}</p>
        <Button variant="link" size="sm" onClick={() => loadConversations()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Search Input */}
      <div className="flex-shrink-0 p-2">
        <div className="relative">
          <Search
            className="
              absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground
            "
          />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="flex-shrink-0 px-2 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No conversations yet
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No matching conversations
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {filteredConversations.map(conversation => {
              const isStreaming = streamingConversationId === conversation.id
              const isGeneratingTitle = generatingTitleConversationId === conversation.id
              const hasDraftIcon = hasDraft(conversation.id)
              const unread = isUnread(conversation)
              const awaitingApproval = pendingApprovalConversationIds?.has(conversation.id) ?? false
              // Single source of truth: derive display title (generating vs stored)
              const displayTitle = isGeneratingTitle
                ? 'Generating title...'
                : (conversation.title ?? 'New Chat')

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    `
                      group flex flex-col p-2 rounded-md text-left text-sm
                      transition-colors
                    `,
                    'cursor-pointer w-full',
                    'hover:bg-accent hover:text-accent-foreground',
                    selectedId === conversation.id
                      ? 'selected-item'
                      : 'border border-transparent'
                  )}
                  onClick={() =>
                    editingId !== conversation.id && onSelect?.(conversation)
                  }
                >
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => handleRenameKeyDown(e, conversation.id)}
                        onBlur={() => handleSaveRename(conversation.id)}
                        className="h-6 text-sm px-1 flex-1 min-w-0"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Row 1: title; status icons (draft, streaming); actions on hover */}
                      <div className="flex items-center gap-2 min-w-0 w-full">
                        <div
                          className={cn(
                            'truncate flex-1 min-w-0',
                            unread ? 'font-bold' : 'font-medium'
                          )}
                        >
                          {isGeneratingTitle ? (
                            <span className="animate-title-shimmer">{displayTitle}</span>
                          ) : (
                            displayTitle
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasDraftIcon && (
                            <span title="Draft">
                              <FileEdit className="h-3 w-3 text-muted-foreground" />
                            </span>
                          )}
                          {awaitingApproval && (
                            <span title="Awaiting tool approval">
                              <ShieldAlert className="h-3 w-3 text-amber-500" />
                            </span>
                          )}
                          {isStreaming && !awaitingApproval && (
                            <span title="AI responding">
                              <Loader2
                                className="h-3 w-3 animate-spin text-muted-foreground"
                              />
                            </span>
                          )}
                          {unread && (
                            <span title="Unread response">
                              <MessageSquareDot className="h-3 w-3 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            'flex gap-1 flex-nowrap shrink-0 overflow-hidden',
                            `
                              max-w-0 opacity-0 transition-[max-width,opacity]
                              duration-150
                            `,
                            'group-hover:max-w-[5rem] group-hover:opacity-100'
                          )}
                        >
                          <button
                            className={cn('p-1 rounded', 'hover:bg-muted')}
                            onClick={e => handleStartRename(conversation, e)}
                            title="Rename conversation"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            className={cn(
                              'p-1 rounded',
                              'hover:bg-destructive hover:text-destructive-foreground'
                            )}
                            onClick={e => handleDelete(conversation.id, e)}
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {/* Row 2: details full width, timestamp right-aligned */}
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 w-full text-xs',
                          'text-muted-foreground min-w-0'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          {conversation.currentModel && (
                            <>
                              <span className="flex items-center gap-1.5 min-w-0">
                                <ProviderIcon
                                  providerId={getProviderIdFromModelId(
                                    conversation.currentModel
                                  )}
                                  size={12}
                                  className="shrink-0"
                                />
                                <span className="truncate">
                                  {modelList?.all?.find(
                                    m => m.id === conversation.currentModel
                                  )?.label ??
                                    (conversation.currentModel.includes(':')
                                      ? conversation.currentModel
                                          .split(':')
                                          .slice(1)
                                          .join(':')
                                      : conversation.currentModel)}
                                </span>
                              </span>
                              <span className="shrink-0">·</span>
                            </>
                          )}
                          {conversation.messageCount > 0 && (
                            <span className="shrink-0">
                              {conversation.messageCount} message
                              {conversation.messageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0">
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
