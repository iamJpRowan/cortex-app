import * as React from 'react'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

/**
 * ConversationList Component
 *
 * Displays a list of conversations with basic CRUD operations.
 * Minimal implementation for Phase 3 - will be enhanced in later phases.
 */
export function ConversationList({
  selectedId,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const [conversations, setConversations] = React.useState<ConversationMetadata[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load conversations on mount
  React.useEffect(() => {
    loadConversations()
  }, [])

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
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No conversations yet
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {conversations.map(conversation => (
              <button
                key={conversation.id}
                className={`
                  group flex items-start gap-2 p-2 rounded-md text-left text-sm
                  hover:bg-accent hover:text-accent-foreground
                  transition-colors
                  ${selectedId === conversation.id ? 'bg-accent' : ''}
                `}
                onClick={() => onSelect?.(conversation)}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
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
                </div>
                <button
                  className="
                    opacity-0
                    group-hover:opacity-100
                    p-1 rounded
                    hover:bg-destructive hover:text-destructive-foreground
                    transition-opacity
                  "
                  onClick={e => handleDelete(conversation.id, e)}
                  title="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
