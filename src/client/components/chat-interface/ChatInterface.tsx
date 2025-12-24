import { useState, useEffect } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { Sparkles, Database, MessageSquare, ChevronDown, Copy, Check } from 'lucide-react';
import { SEND_MESSAGE, CHAT_STEP_UPDATES } from './ChatInterface.queries';
import type { ChatStep } from '../../../shared/types/ChatStep';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: ChatStep[];
  cypherQuery?: string;
  resultCount?: number;
  requestId?: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [sendMessage, { error: mutationError }] = useMutation(SEND_MESSAGE);

  // Subscribe to step updates for the active request
  const { data: subscriptionData } = useSubscription(CHAT_STEP_UPDATES, {
    variables: { requestId: activeRequestId || '' },
    skip: !activeRequestId,
  });

  // Update message steps when subscription data arrives
  useEffect(() => {
    if (subscriptionData?.chatStepUpdates) {
      const { requestId, step } = subscriptionData.chatStepUpdates;
      
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.requestId === requestId) {
            const currentSteps = msg.steps || [];
            const stepIndex = currentSteps.findIndex((s) => s.id === step.id);
            
            let updatedSteps: ChatStep[];
            if (stepIndex >= 0) {
              // Update existing step
              updatedSteps = [...currentSteps];
              updatedSteps[stepIndex] = step;
            } else {
              // Add new step
              updatedSteps = [...currentSteps, step];
            }
            
            return {
              ...msg,
              steps: updatedSteps,
              // Update cypherQuery and resultCount from step data
              cypherQuery: step.cypherQuery || msg.cypherQuery,
              resultCount: step.resultCount !== undefined ? step.resultCount : msg.resultCount,
            };
          }
          return msg;
        })
      );
    }
  }, [subscriptionData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Generate requestId on client so we can subscribe immediately
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder assistant message with requestId
    const placeholderMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      steps: [],
      requestId,
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    // Start subscription immediately BEFORE sending mutation
    setActiveRequestId(requestId);

    try {
      const result = await sendMessage({
        variables: { 
          message: userMessage.content,
          requestId,
        },
      });

      if (result.data?.sendMessage) {
        const response = result.data.sendMessage;
        
        // Update the placeholder message with final response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderMessage.id
              ? {
                  ...msg,
                  content: response.response,
                  cypherQuery: response.cypherQuery,
                  resultCount: response.resultCount,
                  steps: response.steps || [],
                }
              : msg
          )
        );
      } else {
        throw new Error('No response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderMessage.id
            ? {
                ...msg,
                content: error instanceof Error ? error.message : 'Sorry, I encountered an error processing your request.',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      // Clear active request after a delay to allow final updates
      setTimeout(() => setActiveRequestId(null), 2000);
    }
  };

  // Generic toggle function for expansion state
  const toggleExpansion = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    requestId: string
  ) => {
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const copyQuery = async (query: string, requestId: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedQueryId(requestId);
      setTimeout(() => setCopiedQueryId(null), 2000);
    } catch (err) {
      console.error('Failed to copy query:', err);
    }
  };

  const getStepIcon = (stepName: string) => {
    if (stepName.includes('query') || stepName.includes('Generating')) {
      return Sparkles;
    }
    if (stepName.includes('database') || stepName.includes('Searching')) {
      return Database;
    }
    if (stepName.includes('response')) {
      return MessageSquare;
    }
    return Sparkles;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mutationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              <strong>Connection Error:</strong> Unable to connect to the GraphQL server. 
              Make sure the server is running on port 4000.
            </p>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation to explore your knowledge graph.</p>
            <p className="text-sm mt-2">Try asking: "Show me all my notes about projects"</p>
          </div>
        )}
        {messages.map((message) => {
          const steps = message.steps || [];

          return (
            <div key={message.id} className="space-y-2">
              {/* User message */}
              {message.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              )}

              {/* Assistant message with steps */}
              {message.role === 'assistant' && (
                <div className="flex flex-col space-y-2">
                  {/* Steps - including thinking state */}
                  <div className="space-y-2">
                    {/* Thinking indicator when no steps yet */}
                    {steps.length === 0 && !message.content && (
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm bg-gradient-to-r from-primary via-white via-primary to-primary bg-[length:300%_100%] bg-clip-text text-transparent animate-shimmer font-medium">
                          Thinking...
                        </span>
                      </div>
                    )}
                    {steps.map((step) => {
                        const Icon = getStepIcon(step.name);
                        const isActive = step.status === 'RUNNING';
                        const isCompleted = step.status === 'COMPLETED';
                        const isError = step.status === 'ERROR';
                        const isQueryStep = step.id === 'step_1';
                        const isSearchStep = step.id === 'step_2';
                        const stepHasQuery = step.cypherQuery || (isQueryStep && message.cypherQuery);
                        const stepHasResults = step.resultCount !== undefined || (isSearchStep && message.resultCount !== undefined);
                        const isExpandable = (isQueryStep && stepHasQuery) || (isSearchStep && stepHasResults);
                        const isExpanded = message.requestId && (
                          (isQueryStep && expandedQueries.has(message.requestId)) ||
                          (isSearchStep && expandedResults.has(message.requestId))
                        );

                        return (
                          <div key={step.id} className="space-y-1">
                            {/* Clickable step row - no background, shimmer on text */}
                            <button
                              onClick={() => {
                                if (isExpandable && message.requestId) {
                                  if (isQueryStep) {
                                    toggleExpansion(setExpandedQueries, message.requestId);
                                  } else if (isSearchStep) {
                                    toggleExpansion(setExpandedResults, message.requestId);
                                  }
                                }
                              }}
                              disabled={!isExpandable}
                              className={`w-full flex items-center gap-2 text-left transition-colors ${
                                isExpandable ? 'hover:text-foreground cursor-pointer' : 'cursor-default'
                              }`}
                            >
                              {/* Icon - no animation */}
                              <div className="flex-shrink-0">
                                <Icon
                                  className={`w-4 h-4 ${
                                    isError
                                      ? 'text-destructive'
                                      : isCompleted
                                      ? 'text-primary'
                                      : isActive
                                      ? 'text-primary'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </div>
                              
                              {/* Text with shimmer when active */}
                              <span
                                className={`text-sm ${
                                  isActive
                                    ? 'bg-gradient-to-r from-primary via-white via-primary to-primary bg-[length:300%_100%] bg-clip-text text-transparent animate-shimmer font-medium'
                                    : isError
                                    ? 'text-destructive'
                                    : isCompleted
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {step.name}
                              </span>
                              
                              {/* Duration when completed - always aligned to the right */}
                              {isCompleted && step.duration && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {step.duration.toFixed(1)}s
                                </span>
                              )}
                              
                              {/* Expand/collapse indicator - only for expandable steps */}
                              {isExpandable ? (
                                <ChevronDown
                                  className={`w-3 h-3 text-muted-foreground transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              ) : (
                                // Spacer for non-expandable steps to maintain alignment
                                <span className="w-3 h-3" />
                              )}
                            </button>

                            {/* Error message */}
                            {isError && step.error && (
                              <p className="text-xs text-destructive ml-6">{step.error}</p>
                            )}

                            {/* Expanded content - query or results */}
                            {isExpanded && (
                              <div className="ml-6 space-y-2">
                                {/* Cypher Query */}
                                {isQueryStep && stepHasQuery && (
                                  <div className="relative">
                                    <pre className="p-3 bg-muted/50 rounded text-xs overflow-x-auto border border-border">
                                      <code>{step.cypherQuery || message.cypherQuery}</code>
                                    </pre>
                                    {message.requestId && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyQuery(step.cypherQuery || message.cypherQuery || '', message.requestId || '');
                                        }}
                                        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background rounded transition-colors"
                                      >
                                        {copiedQueryId === message.requestId ? (
                                          <>
                                            <Check className="w-3 h-3" />
                                            <span>Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Results Summary */}
                                {isSearchStep && stepHasResults && (
                                  <div className="p-3 bg-muted/50 rounded text-sm border border-border">
                                    <p className="text-muted-foreground">
                                      The query returned {step.resultCount ?? message.resultCount ?? 0}{' '}
                                      {(step.resultCount ?? message.resultCount ?? 0) === 1 ? 'result' : 'results'} from the graph database.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Response content */}
                  {message.content && (
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted text-muted-foreground">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your knowledge graph..."
            className="flex-1 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 300% 0;
          }
          100% {
            background-position: -300% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 4.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
