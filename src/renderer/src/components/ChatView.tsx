import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Send, Loader2, User, Bot, Pencil, Check, X, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConversationList, type ConversationListRef } from './ConversationList'
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
} from '@/components/ai-elements/chain-of-thought'
import {
  ToolInvocation,
  type ToolInvocationStatus,
} from '@/components/ai-elements/tool-invocation'
import type {
  ChatMessage,
  StreamEvent,
  TraceEntry,
  ConversationMetadata,
} from '@/types/api'

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
  const [conversationTitle, setConversationTitle] = React.useState('New Chat')
  const [currentTrace, setCurrentTrace] = React.useState<TraceEntry[]>([])
  const [streamingContent, setStreamingContent] = React.useState('')
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [editingTitleValue, setEditingTitleValue] = React.useState('')

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const titleInputRef = React.useRef<HTMLInputElement>(null)
  const conversationListRef = React.useRef<ConversationListRef>(null)

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Subscribe to stream events
  React.useEffect(() => {
    const unsubscribe = window.api.llm.onStream(handleStreamEvent)
    return () => {
      unsubscribe()
    }
  }, [])

  const handleStreamEvent = (event: StreamEvent) => {
    switch (event.type) {
      case 'start':
        setStreamingContent('')
        setCurrentTrace([])
        break

      case 'token':
        setStreamingContent(event.accumulated || '')
        break

      case 'trace':
        setCurrentTrace(prev => [...prev, event.trace])
        break

      case 'complete': {
        // Add the completed message
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: event.response,
          timestamp: Date.now(),
          trace: event.trace,
        }
        setMessages(prev => [...prev, newMessage])
        setStreamingContent('')
        setCurrentTrace([])
        setIsLoading(false)
        break
      }

      case 'error':
        console.error('Stream error:', event.error)
        setStreamingContent('')
        setIsLoading(false)
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

    // Start streaming query
    const result = await window.api.llm.queryStream(userMessage, {
      conversationId: conversationId || undefined,
    })

    if (result.success && result.conversationId) {
      setConversationId(result.conversationId)
    } else if (!result.success) {
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

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setConversationTitle('New Chat')
    setStreamingContent('')
    setCurrentTrace([])
    setIsLoading(false)
    setIsEditingTitle(false)
    inputRef.current?.focus()
  }

  const handleSelectConversation = async (conversation: ConversationMetadata) => {
    // Don't reload if already selected
    if (conversationId === conversation.id) return

    setConversationId(conversation.id)
    setConversationTitle(conversation.title)
    setStreamingContent('')
    setCurrentTrace([])
    setIsLoading(true)
    setIsEditingTitle(false)

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
      inputRef.current?.focus()
    }
  }

  const handleStartEditTitle = () => {
    setEditingTitleValue(conversationTitle)
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
        setConversationTitle(newTitle)
        // Update the title in the conversation list
        conversationListRef.current?.updateTitle(conversationId, newTitle)
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

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation Sidebar */}
      <div
        className="
          w-64 flex-shrink-0 flex flex-col min-h-0 border-r border-border-primary
        "
      >
        <ConversationList
          ref={conversationListRef}
          selectedId={conversationId || undefined}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
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
              <h2 className="text-lg font-semibold">{conversationTitle}</h2>
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

        {/* Messages Area - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Start a conversation...</p>
            </div>
          )}

          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Streaming message or loading with trace */}
          {(streamingContent || (isLoading && currentTrace.length > 0)) && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent || '',
                timestamp: Date.now(),
                trace: currentTrace,
                isStreaming: true,
              }}
            />
          )}

          {/* Loading indicator (only when no trace yet) */}
          {isLoading && !streamingContent && currentTrace.length === 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - fixed at bottom */}
        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 p-4 border-t border-border-primary flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

/**
 * MessageBubble Component
 *
 * Displays a single chat message with role-based styling,
 * markdown rendering, and collapsible trace display.
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = React.useState(false)

  const isUser = message.role === 'user'
  const hasTrace = message.trace && message.trace.length > 0

  // Memoize grouped trace entries to avoid recomputing on each render
  const groupedTrace = React.useMemo(
    () => (message.trace ? groupTraceEntries(message.trace) : []),
    [message.trace]
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={`
        group flex gap-3
        ${isUser ? 'flex-row-reverse' : ''}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}
        `}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={`
          flex-1 max-w-[80%]
          ${isUser ? 'text-right' : ''}
        `}
      >
        {/* Trace display - ChainOfThought handles its own collapse */}
        {hasTrace && groupedTrace.length > 0 && (
          <TraceDisplay groupedTrace={groupedTrace} isStreaming={message.isStreaming} />
        )}

        {/* Message bubble */}
        <div
          className={`
            relative inline-block rounded-lg px-4 py-2 max-w-full
            ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}

          {/* Copy button - appears on hover */}
          {!message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className={`
                absolute -top-2 -right-2 p-1 rounded bg-background border border-border
                opacity-0
                group-hover:opacity-100
                transition-opacity
                hover:bg-muted
              `}
              title={copied ? 'Copied!' : 'Copy message'}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`
            text-xs text-muted-foreground mt-1
            ${isUser ? 'text-right' : 'text-left'}
          `}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

/**
 * MarkdownContent Component
 *
 * Renders markdown content with syntax highlighting for code blocks.
 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="
        prose prose-sm
        dark:prose-invert
        max-w-none
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match

            if (isInline) {
              return (
                <code
                  className="bg-muted-foreground/20 px-1 py-0.5 rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-md text-sm"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
          p({ children }) {
            return (
              <p
                className="
                  mb-2
                  last:mb-0
                "
              >
                {children}
              </p>
            )
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2">{children}</ol>
          },
        }}
      >
        {content}
      </ReactMarkdown>
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

/**
 * Groups trace entries by pairing tool_call with their corresponding tool_result.
 * Uses toolCallId for robust matching; falls back to sequential matching by toolName.
 */
function groupTraceEntries(trace: TraceEntry[]): GroupedToolExecution[] {
  const groups: GroupedToolExecution[] = []
  const pendingById = new Map<string, GroupedToolExecution>()
  const pendingByName = new Map<string, GroupedToolExecution[]>()

  for (const entry of trace) {
    if (entry.type === 'tool_call' && entry.toolName) {
      const group: GroupedToolExecution = {
        toolName: entry.toolName,
        toolCallId: entry.toolCallId,
        args: entry.args,
        isComplete: false,
      }
      groups.push(group)

      // Track by ID if available, otherwise by name for fallback matching
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

      // Try to match by toolCallId first (most reliable)
      if (entry.toolCallId && pendingById.has(entry.toolCallId)) {
        group = pendingById.get(entry.toolCallId)!
        pendingById.delete(entry.toolCallId)
      } else if (entry.toolName) {
        // Fall back to matching by tool name
        const pending = pendingByName.get(entry.toolName)
        if (pending && pending.length > 0) {
          group = pending.shift()!
        }
      }

      if (group) {
        group.result = entry.result
        group.duration = entry.duration
        group.error = entry.error
        group.isComplete = true
      } else {
        // Result without a matching call (shouldn't happen, but handle gracefully)
        groups.push({
          toolName: entry.toolName || 'unknown',
          toolCallId: entry.toolCallId,
          result: entry.result,
          duration: entry.duration,
          error: entry.error,
          isComplete: true,
        })
      }
    }
  }

  return groups
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
 * Displays grouped tool executions using ChainOfThought and ToolInvocation components.
 * Shows steps expanded by default for visibility.
 */
function TraceDisplay({
  groupedTrace,
  isStreaming,
}: {
  groupedTrace: GroupedToolExecution[]
  isStreaming?: boolean
}) {
  return (
    <ChainOfThought defaultOpen={true} className="mb-2">
      <ChainOfThoughtHeader>
        {groupedTrace.length} step{groupedTrace.length !== 1 ? 's' : ''}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="space-y-2">
          {groupedTrace.map((execution, index) => (
            <ToolInvocation
              key={execution.toolCallId || index}
              name={execution.toolName}
              args={execution.args}
              result={execution.result}
              duration={execution.duration}
              error={execution.error}
              status={getToolStatus(execution, isStreaming)}
              defaultOpen={true}
            />
          ))}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
