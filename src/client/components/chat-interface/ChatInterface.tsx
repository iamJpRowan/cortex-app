import { useState, useEffect, useRef } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { Sparkles, Database, MessageSquare, ChevronDown, Copy, Check } from 'lucide-react';
import { SEND_MESSAGE, CHAT_STEP_UPDATES } from './ChatInterface.queries';
import type { ChatStep } from '../../../shared/types/ChatStep';
import { useConversations } from '../../contexts/ConversationContext';
import type { ConversationMessage } from '../../../shared/types/Conversation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: ChatStep[];
  requestId?: string;
}

export default function ChatInterface() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    updateDraft,
    saveDraft,
    addMessage,
    updateConversation,
    loadConversation,
    processingConversationIds,
    setProcessing,
  } = useConversations();
  
  // Check if current conversation is processing
  const isProcessing = activeConversationId ? processingConversationIds.has(activeConversationId) : false;

  const activeConversation = activeConversationId ? conversations.get(activeConversationId) : null;

  const [input, setInput] = useState(activeConversation?.draft || '');
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Derive messages from active conversation
  // Map requestId from activeRequestId for the last assistant message
  const messages: Message[] = activeConversation
    ? activeConversation.messages.map((msg: ConversationMessage, idx: number) => {
        // If this is the last assistant message and we have an active request, use that requestId
        const isLastAssistant = msg.role === 'assistant' && 
          idx === activeConversation.messages.length - 1 && 
          activeRequestId;
        return {
          id: `${activeConversationId}_${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          steps: msg.steps || [], // Preserve steps from conversation
          requestId: isLastAssistant ? activeRequestId : undefined,
        };
      })
    : [];
  const [contextNodes, setContextNodes] = useState<Array<{ id: string; labels?: string[]; properties?: Record<string, unknown> }>>([]);
  const [sendMessage, { error: mutationError }] = useMutation(SEND_MESSAGE);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevInputRef = useRef<string>('');
  // Map requestId to message index for subscription updates
  const requestIdToMessageIndex = useRef<Map<string, number>>(new Map());

  // Load conversation when switching (only when conversation ID changes)
  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.get(activeConversationId);
      if (!conv || conv.messages.length === 0) {
        // Load full conversation if not loaded or empty
        loadConversation(activeConversationId);
      }
      // Update input from draft only when switching conversations
      setInput(conv?.draft || '');
    } else {
      setInput('');
    }
    setContextNodes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]); // Only depend on activeConversationId, not loadConversation or conversations

  // Create conversation if none exists and user starts typing (only when input changes from empty to non-empty)
  useEffect(() => {
    const wasEmpty = !prevInputRef.current.trim();
    const isEmpty = !input.trim();
    prevInputRef.current = input;

    if (!activeConversationId && wasEmpty && !isEmpty) {
      const newId = createConversation();
      setActiveConversationId(newId);
    }
  }, [input, activeConversationId, createConversation, setActiveConversationId]);

  // Save draft as user types (but don't reset input when draft updates)
  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.get(activeConversationId);
      // Only update draft if input differs from what's stored
      // This prevents loops - we update draft when user types, but don't reset input when draft updates
      if (input !== (conv?.draft || '')) {
        updateDraft(activeConversationId, input);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, activeConversationId, updateDraft]); // Don't depend on activeConversation to avoid loops

  // Save draft on blur
  const handleInputBlur = () => {
    if (activeConversationId) {
      saveDraft(activeConversationId);
    }
  };

  // Subscribe to step updates for the active request
  const { data: subscriptionData } = useSubscription(CHAT_STEP_UPDATES, {
    variables: { requestId: activeRequestId || '' },
    skip: !activeRequestId,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, subscriptionData]);

  // Update message steps in context when subscription data arrives
  useEffect(() => {
    if (subscriptionData?.chatStepUpdates && activeConversationId) {
      const { requestId, step } = subscriptionData.chatStepUpdates;
      
      
      // Find the assistant message using requestId mapping
      const conv = conversations.get(activeConversationId);
      if (conv) {
        const messageIndex = requestIdToMessageIndex.current.get(requestId);
        if (messageIndex !== undefined && messageIndex < conv.messages.length) {
          const assistantMsg = conv.messages[messageIndex];
          if (assistantMsg && assistantMsg.role === 'assistant') {
            const currentSteps = assistantMsg.steps || [];
            const stepIndex = currentSteps.findIndex((s: ChatStep) => s.id === step.id);
            
            let updatedSteps: ChatStep[];
            if (stepIndex >= 0) {
              // Update existing step
              updatedSteps = [...currentSteps];
              updatedSteps[stepIndex] = step;
            } else {
              // Add new step
              updatedSteps = [...currentSteps, step];
            }
            
            
            // Update the message in context
            const updatedMessages = [...conv.messages];
            updatedMessages[messageIndex] = {
              ...assistantMsg,
              steps: updatedSteps,
              role: 'assistant' as const,
            };
            
            updateConversation(activeConversationId, { messages: updatedMessages });
          }
        }
      }
    }
  }, [subscriptionData, activeConversationId, conversations, updateConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Ensure we have a conversation
    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
      currentConversationId = createConversation();
      setActiveConversationId(currentConversationId);
    }

    // Clear draft when sending
    if (currentConversationId) {
      updateDraft(currentConversationId, '');
    }

    // Generate requestId on client so we can subscribe immediately
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add user message to context immediately
    const userMsg: ConversationMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    addMessage(currentConversationId, userMsg);

    // Create placeholder assistant message in context
    const conv = conversations.get(currentConversationId);
    const assistantMsgIndex = (conv?.messages.length || 0); // Index after adding user message
    const placeholderAssistantMsg: ConversationMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      steps: [],
    };
    addMessage(currentConversationId, placeholderAssistantMsg);
    
    // Track requestId -> message index mapping for subscription updates
    requestIdToMessageIndex.current.set(requestId, assistantMsgIndex);

    setInput('');
    
    // Mark conversation as processing
    if (currentConversationId) {
      setProcessing(currentConversationId, true);
    }

    // Start subscription immediately BEFORE sending mutation
    setActiveRequestId(requestId);

    try {
      // Build conversation history from active conversation messages
      const conv = conversations.get(currentConversationId);
      const history = (conv?.messages || [])
        .filter((msg: ConversationMessage) => msg.content) // Only messages with content
        .slice(0, -2) // Exclude the two messages we just added
        .map((msg: ConversationMessage) => {
          const queryStep = msg.steps?.find((s: ChatStep) => s.outputs?.query);
          const resultsStep = msg.steps?.find((s: ChatStep) => s.outputs?.results);
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
            query: queryStep?.outputs?.query,
            results: resultsStep?.outputs?.results?.data as Record<string, unknown>[] | undefined,
          };
        })
        .slice(-10); // Last 10 messages for context

      const result = await sendMessage({
        variables: { 
          message: input,
          requestId,
          conversationId: currentConversationId || undefined,
          conversationHistory: history.length > 0 ? history : undefined,
          contextNodes: contextNodes.length > 0 ? contextNodes : undefined,
        },
      });

      if (result.data?.sendMessage) {
        const response = result.data.sendMessage;
        
        // Update conversation with server response
        const finalConversationId = response.conversationId || currentConversationId;
        if (finalConversationId && currentConversationId) {
          // If server returned a different ID (new conversation), we'll handle migration
          if (finalConversationId !== currentConversationId) {
            // Server created new conversation - update our local one
            const oldConv = conversations.get(currentConversationId);
            if (oldConv) {
              // For now, just update the synced status
              // The server will have the new ID, but we keep using our local ID
              updateConversation(currentConversationId, { synced: true });
            }
          } else {
            // Same ID - just mark as synced
            updateConversation(currentConversationId, { synced: true });
          }
        }

        // Update the placeholder assistant message with final response
        const targetConversationId = finalConversationId || currentConversationId;
        if (targetConversationId) {
          const conv = conversations.get(targetConversationId);
          if (conv) {
            const msgIndex = requestIdToMessageIndex.current.get(requestId);
            if (msgIndex !== undefined && msgIndex < conv.messages.length) {
              const assistantMsg = conv.messages[msgIndex];
              if (assistantMsg && assistantMsg.role === 'assistant') {
                const updatedMessages = [...conv.messages];
                updatedMessages[msgIndex] = {
                  ...assistantMsg,
                  content: response.response,
                  steps: response.steps || [],
                  role: 'assistant' as const,
                  // Attach query results if available (for backward compatibility)
                  query: response.steps?.find((s: { outputs?: { query?: string } }) => s.outputs?.query)?.outputs?.query,
                  results: response.steps?.find((s: { outputs?: { results?: unknown } }) => s.outputs?.results)?.outputs?.results?.data as Record<string, unknown>[] | undefined,
                };
                
                updateConversation(targetConversationId, { messages: updatedMessages });
                
                // Update title if this is the first exchange
                if (conv.messages.length === 2 && !conv.title) {
                  const title = input.length > 50
                    ? input.substring(0, 50).replace(/\s+\S*$/, '') + '...'
                    : input;
                  updateConversation(targetConversationId, { title: title || 'New Conversation' });
                }
              }
            }
          }
        }
        
        // Clear context nodes after sending
        setContextNodes([]);
        
        // Clean up requestId mapping after a delay
        setTimeout(() => {
          requestIdToMessageIndex.current.delete(requestId);
        }, 5000);
      } else {
        throw new Error('No response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update placeholder assistant message with error
      const conv = conversations.get(currentConversationId);
      if (conv) {
        const msgIndex = requestIdToMessageIndex.current.get(requestId);
        if (msgIndex !== undefined && msgIndex < conv.messages.length) {
          const assistantMsg = conv.messages[msgIndex];
          if (assistantMsg && assistantMsg.role === 'assistant') {
            const updatedMessages = [...conv.messages];
            updatedMessages[msgIndex] = {
              ...assistantMsg,
              content: error instanceof Error ? error.message : 'Sorry, I encountered an error processing your request.',
              role: 'assistant' as const,
            };
            updateConversation(currentConversationId, { messages: updatedMessages });
          }
        }
      }
      
      // Clean up requestId mapping
      requestIdToMessageIndex.current.delete(requestId);
    } finally {
      // Mark conversation as not processing
      if (currentConversationId) {
        setProcessing(currentConversationId, false);
      }
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
                        
                        // Determine what content this step has from outputs
                        const outputs = step.outputs;
                        const stepHasQuery = !!outputs?.query;
                        const stepHasResults = !!outputs?.results;
                        const stepHasPlan = !!outputs?.plan;
                        const stepHasText = !!outputs?.text;
                        const stepHasData = !!outputs?.data;
                        
                        // Step is expandable if it has any displayable outputs
                        const isExpandable = stepHasQuery || stepHasResults || stepHasPlan || stepHasText || stepHasData;
                        
                        // Use step ID + requestId as unique key for expansion state
                        // Fallback to message id if no requestId
                        const expansionKey = message.requestId 
                          ? `${message.requestId}-${step.id}` 
                          : `${message.id}-${step.id}`;
                        const isExpanded = expandedQueries.has(expansionKey);

                        return (
                          <div key={step.id} className="space-y-1">
                            {/* Clickable step row - no background, shimmer on text */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isExpandable) {
                                  toggleExpansion(setExpandedQueries, expansionKey);
                                }
                              }}
                              className={`w-full flex items-center gap-2 text-left transition-colors ${
                                isExpandable ? 'hover:text-foreground cursor-pointer' : 'cursor-default opacity-50'
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

                            {/* Expanded content - render based on step.outputs */}
                            {isExpanded && outputs && (
                              <div className="ml-6 space-y-2">
                                {/* Planning Result */}
                                {stepHasPlan && outputs.plan && (
                                  <div className="p-3 bg-muted/50 rounded text-sm border border-border space-y-2">
                                    <div>
                                      <p className="font-medium text-foreground mb-1">Tools chosen:</p>
                                      <p className="text-muted-foreground">{outputs.plan.tools.join(', ')}</p>
                                    </div>
                                    {outputs.plan.reasoning && (
                                      <div>
                                        <p className="font-medium text-foreground mb-1">Reasoning:</p>
                                        <p className="text-muted-foreground">{outputs.plan.reasoning}</p>
                                      </div>
                                    )}
                                    {outputs.plan.parameters && Object.keys(outputs.plan.parameters).length > 0 && (
                                      <div>
                                        <p className="font-medium text-foreground mb-1">Parameters:</p>
                                        <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                                          {JSON.stringify(outputs.plan.parameters, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Generated Query (output from query generation step) */}
                                {stepHasQuery && outputs.query && (
                                  <div className="relative">
                                    <pre className="p-3 bg-muted/50 rounded text-xs overflow-x-auto border border-border">
                                      <code>{outputs.query}</code>
                                    </pre>
                                    {message.requestId && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyQuery(outputs.query || '', message.requestId || '');
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

                                {/* Query Results (output from query execution step) */}
                                {stepHasResults && outputs.results && (
                                  <div className="p-3 bg-muted/50 rounded text-sm border border-border">
                                    <p className="text-muted-foreground">
                                      The query returned {outputs.results.count ?? 0}{' '}
                                      {(outputs.results.count ?? 0) === 1 ? 'result' : 'results'} from the graph database.
                                    </p>
                                  </div>
                                )}

                                {/* Generated Text (output from response generation or context tool) */}
                                {stepHasText && outputs.text && (
                                  <div className="p-3 bg-muted/50 rounded text-sm border border-border">
                                    <p className="font-medium text-foreground mb-1">Generated output:</p>
                                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground overflow-x-auto">
                                      {outputs.text}
                                    </pre>
                                  </div>
                                )}

                                {/* Generic Data Output */}
                                {stepHasData && outputs.data != null && (
                                  <div className="p-3 bg-muted/50 rounded text-sm border border-border">
                                    <p className="font-medium text-foreground mb-1">Data:</p>
                                    <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(outputs.data, null, 2)}
                                    </pre>
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
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleInputBlur}
            placeholder="Ask a question about your knowledge graph..."
            className="flex-1 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
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
