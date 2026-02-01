import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Send, Loader2, User, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChatMessage, StreamEvent, TraceEntry } from '@/types/api'

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
  const [currentTrace, setCurrentTrace] = React.useState<TraceEntry[]>([])
  const [streamingContent, setStreamingContent] = React.useState('')

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
    setStreamingContent('')
    setCurrentTrace([])
    setIsLoading(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-border-primary"
      >
        <h2 className="text-lg font-semibold">Chat</h2>
        <Button variant="outline" size="sm" onClick={handleNewChat}>
          New Chat
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Start a conversation...</p>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
              trace: currentTrace,
              isStreaming: true,
            }}
          />
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border-primary flex gap-2"
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
  )
}

/**
 * MessageBubble Component
 *
 * Displays a single chat message with role-based styling,
 * markdown rendering, and collapsible trace display.
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const [showTrace, setShowTrace] = React.useState(message.isStreaming)

  const isUser = message.role === 'user'
  const hasTrace = message.trace && message.trace.length > 0

  // Auto-expand trace while streaming, collapse when done
  React.useEffect(() => {
    if (message.isStreaming) {
      setShowTrace(true)
    } else if (hasTrace) {
      setShowTrace(false)
    }
  }, [message.isStreaming, hasTrace])

  return (
    <div
      className={`
        flex gap-3
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
        {/* Trace display (for assistant messages) */}
        {hasTrace && (
          <button
            className="
              flex items-center gap-1 text-xs text-muted-foreground
              hover:text-foreground
              mb-1
            "
            onClick={() => setShowTrace(!showTrace)}
          >
            {showTrace ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {message.trace!.length} step{message.trace!.length !== 1 ? 's' : ''}
          </button>
        )}

        {showTrace && hasTrace && (
          <TraceDisplay trace={message.trace!} isStreaming={message.isStreaming} />
        )}

        {/* Message bubble */}
        <div
          className={`
            inline-block rounded-lg px-4 py-2 max-w-full
            ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
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
 * TraceDisplay Component
 *
 * Displays execution trace entries (tool calls, results).
 */
function TraceDisplay({
  trace,
  isStreaming,
}: {
  trace: TraceEntry[]
  isStreaming?: boolean
}) {
  return (
    <div className="mb-2 space-y-1">
      {trace.map((entry, index) => (
        <div key={index} className="text-xs bg-muted/50 rounded px-2 py-1">
          {entry.type === 'tool_call' && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-muted-foreground">Tool:</span>
              <span className="font-mono">{entry.toolName}</span>
              {isStreaming && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            </div>
          )}
          {entry.type === 'tool_result' && (
            <div>
              <span className="font-medium text-muted-foreground">Result:</span>
              <span className="ml-1 truncate block">{entry.result}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
