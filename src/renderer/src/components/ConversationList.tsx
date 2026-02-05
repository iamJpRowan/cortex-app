import * as React from 'react'
import { MessageSquare, MessageSquarePlus, Trash2, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { ConversationMetadata } from '@/types/api'

interface ConversationListProps {
  /** Currently selected conversation ID */
  selectedId?: string
  /** Called when a conversation is selected */
  onSelect?: (conversation: ConversationMetadata) => void
  /** Called when new chat is requested */
  onNewChat?: () => void
}

/** Methods exposed via ref */
export interface ConversationListRef {
  /** Update the title of a conversation in the list */
  updateTitle: (conversationId: string, newTitle: string) => void
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
>(function ConversationList({ selectedId, onSelect, onNewChat }, ref) {
  const [conversations, setConversations] = React.useState<ConversationMetadata[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
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

  // Expose methods via ref for parent component
  React.useImperativeHandle(ref, () => ({
    updateTitle: (conversationId: string, newTitle: string) => {
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, title: newTitle } : c))
      )
    },
  }))

  // Load conversations on mount
  React.useEffect(() => {
    loadConversations()
  }, [])

  // Focus input when editing starts
  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.conversations.list({ limit: 50 })
      if (result.success && result.conversations) {
        setConversations(result.conversations)
      } else {
        setError(result.error || 'Failed to load conversations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = async () => {
    try {
      const result = await window.api.conversations.create()
      if (result.success && result.conversation) {
        // Add to list and select
        setConversations(prev => [result.conversation!, ...prev])
        onSelect?.(result.conversation)
        onNewChat?.()
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
        setConversations(prev => prev.filter(c => c.id !== id))
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
      if (result.success && result.conversation) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, title: editingTitle.trim() } : c))
        )
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

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        <p>Error: {error}</p>
        <Button variant="link" size="sm" onClick={loadConversations}>
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
            {filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`
                  group flex items-start gap-2 p-2 rounded-md text-left text-sm
                  hover:bg-accent hover:text-accent-foreground
                  transition-colors cursor-pointer
                  ${selectedId === conversation.id ? 'bg-accent' : ''}
                `}
                onClick={() => editingId !== conversation.id && onSelect?.(conversation)}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => handleRenameKeyDown(e, conversation.id)}
                        onBlur={() => handleSaveRename(conversation.id)}
                        className="h-6 text-sm px-1"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="truncate font-medium">{conversation.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(conversation.updatedAt)}
                        {conversation.messageCount > 0 && (
                          <span className="ml-2">
                            {conversation.messageCount} message
                            {conversation.messageCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {editingId !== conversation.id && (
                  <div
                    className="
                      flex gap-1 opacity-0
                      group-hover:opacity-100
                      transition-opacity
                    "
                  >
                    <button
                      className="
                        p-1 rounded
                        hover:bg-muted
                      "
                      onClick={e => handleStartRename(conversation, e)}
                      title="Rename conversation"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="
                        p-1 rounded
                        hover:bg-destructive hover:text-destructive-foreground
                      "
                      onClick={e => handleDelete(conversation.id, e)}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
