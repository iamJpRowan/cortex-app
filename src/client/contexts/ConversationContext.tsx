import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  LIST_CONVERSATIONS,
  GET_CONVERSATION,
  CREATE_OR_UPDATE_CONVERSATION,
} from '../components/conversation-sidebar/ConversationSidebar.queries';
import type { Conversation, ConversationMessage } from '@/shared/types/Conversation';

export type ConversationWithDraft = Conversation & {
  draft?: string; // Current draft text
  synced: boolean; // Has this been synced to server?
  messages: ConversationMessage[]; // Ensure messages is always defined
  title?: string; // Ensure title is optional
};

interface ConversationContextType {
  conversations: Map<string, ConversationWithDraft>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createConversation: () => string; // Returns new conversation ID
  updateDraft: (conversationId: string, draft: string) => void;
  saveDraft: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  updateConversation: (conversationId: string, updates: Partial<ConversationWithDraft>) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  removeConversation: (conversationId: string) => void;
  processingConversationIds: Set<string>; // Conversations currently processing
  setProcessing: (conversationId: string, isProcessing: boolean) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Map<string, ConversationWithDraft>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draftSaveTimeouts, setDraftSaveTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [processingConversationIds, setProcessingConversationIds] = useState<Set<string>>(new Set());

  const { data: conversationsData, refetch: refetchConversations } = useQuery<{
    conversations: Array<{
      id: string;
      title?: string;
      updatedAt: string;
      archived: boolean;
      pinned: boolean;
      messageCount: number;
    }>;
  }>(LIST_CONVERSATIONS, {
    variables: { includeArchived: true },
    pollInterval: 10000, // Refresh every 10 seconds
    errorPolicy: 'all', // Continue rendering even if there's an error
    onError: (error) => {
      console.error('Error loading conversations:', error);
    },
  });

  const [createOrUpdateConversationMutation] = useMutation(CREATE_OR_UPDATE_CONVERSATION);
  const [getConversation] = useLazyQuery(GET_CONVERSATION);

  // Load conversations from server into context
  useEffect(() => {
    if (conversationsData?.conversations) {
      setConversations((prev) => {
        const next = new Map(prev);
        const serverIds = new Set(conversationsData.conversations.map(c => c.id));
        
        // Remove conversations that are no longer on the server
        // BUT preserve conversations with drafts (user is typing) even if not on server yet
        prev.forEach((conv, id) => {
          if (conv.synced && !serverIds.has(id)) {
            // Only remove if conversation has no draft (user isn't actively typing)
            // This prevents conversations from disappearing while user is typing
            const hasActiveDraft = conv.draft && conv.draft.trim().length > 0;
            if (!hasActiveDraft) {
              // Conversation was deleted on server and user isn't typing - remove from context
              next.delete(id);
            }
          }
        });
        
        // Update existing conversations with server data
        conversationsData.conversations.forEach((serverConv) => {
          const existing = next.get(serverConv.id);
          if (existing && existing.synced) {
            // Only update if synced (don't overwrite local drafts)
            // Preserve local updatedAt if conversation has a draft (user is typing)
            const preserveLocalTimestamp = existing.draft && existing.draft.trim().length > 0;
            next.set(serverConv.id, {
              ...existing,
              title: serverConv.title,
              // Don't overwrite updatedAt if user is actively typing (has draft)
              updatedAt: preserveLocalTimestamp ? existing.updatedAt : serverConv.updatedAt,
              archived: serverConv.archived,
              pinned: serverConv.pinned,
            });
          } else if (!existing) {
            // New conversation from server - mark as synced
            next.set(serverConv.id, {
              id: serverConv.id,
              title: serverConv.title,
              messages: [],
              createdAt: serverConv.updatedAt,
              updatedAt: serverConv.updatedAt,
              archived: serverConv.archived || false,
              pinned: serverConv.pinned || false,
              synced: true,
            });
          }
        });
        
        return next;
      });
    }
  }, [conversationsData]);

  const createConversation = useCallback((): string => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation: ConversationWithDraft = {
      id,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      pinned: false,
      synced: false, // Not yet synced to server
      draft: '',
    };
    
    setConversations((prev) => {
      const next = new Map(prev);
      next.set(id, newConversation);
      return next;
    });
    
    // Sync to server immediately (create empty conversation)
    // Don't await - let it happen in background
    saveDraft(id).catch(console.error);
    
    return id;
  }, []);

  const updateDraft = useCallback((conversationId: string, draft: string) => {
    setConversations((prev) => {
      const next = new Map(prev);
      const conv = next.get(conversationId);
      if (conv) {
        // Don't update updatedAt for draft changes - only update draft itself
        // This prevents constant re-sorting as user types
        next.set(conversationId, {
          ...conv,
          draft,
          // Keep existing updatedAt - don't change it for draft updates
        });
      }
      return next;
    });

    // Clear existing timeout
    const existingTimeout = draftSaveTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for auto-save (2 seconds after typing stops)
    const timeout = setTimeout(() => {
      saveDraft(conversationId).catch(console.error);
      setDraftSaveTimeouts((prev) => {
        const next = new Map(prev);
        next.delete(conversationId);
        return next;
      });
    }, 2000);

    setDraftSaveTimeouts((prev) => {
      const next = new Map(prev);
      next.set(conversationId, timeout);
      return next;
    });
  }, [draftSaveTimeouts]);

  const saveDraft = useCallback(async (conversationId: string) => {
    const conv = conversations.get(conversationId);
    if (!conv) return;

    // If conversation has no messages and no draft, don't sync yet
    if (conv.messages.length === 0 && !conv.draft) {
      return;
    }

    try {
      // Always pass ID to prevent server from creating duplicates
      await createOrUpdateConversationMutation({
        variables: {
          id: conv.id, // Always pass ID, even for unsynced conversations
          title: conv.title,
          draft: conv.draft, // Server doesn't store draft, but we pass it for consistency
        },
      });

      // Mark as synced
      setConversations((prev) => {
        const next = new Map(prev);
        const updated = next.get(conversationId);
        if (updated) {
          next.set(conversationId, {
            ...updated,
            synced: true,
          });
        }
        return next;
      });

      // Don't refetch conversations after saving draft - it causes unnecessary syncs
      // and can overwrite local state. The conversation list will update naturally
      // when messages are added or when user explicitly refreshes.
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [conversations, createOrUpdateConversationMutation, refetchConversations]);

  const addMessage = useCallback((conversationId: string, message: ConversationMessage) => {
    setConversations((prev) => {
      const next = new Map(prev);
      const conv = next.get(conversationId);
      if (conv) {
        next.set(conversationId, {
          ...conv,
          messages: [...conv.messages, message],
          updatedAt: new Date().toISOString(),
          draft: '', // Clear draft when message is added
        });
      }
      return next;
    });
  }, []);

  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<ConversationWithDraft>) => {
      setConversations((prev) => {
        const next = new Map(prev);
        const conv = next.get(conversationId);
        if (conv) {
          next.set(conversationId, {
            ...conv,
            ...updates,
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    },
    []
  );

  const loadConversation = useCallback(async (conversationId: string) => {
    // Check if we already have full conversation data
    const existing = conversations.get(conversationId);
    if (existing && existing.messages.length > 0) {
      // Already loaded with messages
      return;
    }

    // Load full conversation from server using GET_CONVERSATION
    try {
      const { data } = await getConversation({
        variables: { id: conversationId },
      });

      if (data?.conversation) {
        const serverConv = data.conversation;
        setConversations((prev) => {
          const next = new Map(prev);
          const existing = next.get(conversationId);
          
          // Merge server data with existing (preserve draft if exists)
          next.set(conversationId, {
            id: serverConv.id,
            title: serverConv.title,
            messages: serverConv.messages || [],
            createdAt: serverConv.createdAt,
            updatedAt: serverConv.updatedAt,
            archived: serverConv.archived || false,
            pinned: serverConv.pinned || false,
            synced: true,
            draft: existing?.draft || '', // Preserve draft
          });
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [conversations, getConversation]);

  const refreshConversations = useCallback(async () => {
    await refetchConversations();
  }, [refetchConversations]);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  const setProcessing = useCallback((conversationId: string, isProcessing: boolean) => {
    setProcessingConversationIds((prev) => {
      const next = new Set(prev);
      if (isProcessing) {
        next.add(conversationId);
      } else {
        next.delete(conversationId);
      }
      return next;
    });
  }, []);

  // Save draft when switching conversations
  useEffect(() => {
    return () => {
      // Cleanup: save all drafts when component unmounts
      draftSaveTimeouts.forEach((timeout) => clearTimeout(timeout));
      conversations.forEach((conv, id) => {
        if (conv.draft) {
          saveDraft(id).catch(console.error);
        }
      });
    };
  }, [draftSaveTimeouts, conversations, saveDraft]);

  const value: ConversationContextType = {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    updateDraft,
    saveDraft,
    addMessage,
    updateConversation,
    loadConversation,
    refreshConversations,
    removeConversation,
    processingConversationIds,
    setProcessing,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
}

