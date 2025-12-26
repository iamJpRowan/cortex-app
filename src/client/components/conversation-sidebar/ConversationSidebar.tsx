import { useState, useMemo } from 'react';
import { useMutation } from '@apollo/client';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Pin,
  PinOff,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  MessageSquarePlus,
} from 'lucide-react';
import {
  RENAME_CONVERSATION,
  ARCHIVE_CONVERSATION,
  UNARCHIVE_CONVERSATION,
  DELETE_CONVERSATION,
  PIN_CONVERSATION,
  UNPIN_CONVERSATION,
} from './ConversationSidebar.queries';
import { useConversations, type ConversationWithDraft } from '../../contexts/ConversationContext';
import { useToast } from '../../contexts/ToastContext';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeConversationIds?: Set<string>; // Conversations with active requests
  unreadConversationIds?: Set<string>; // Conversations with unread updates
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
}

export default function ConversationSidebar({
  isOpen,
  onToggle,
  activeConversationIds = new Set(),
  unreadConversationIds = new Set(),
  onMarkRead,
  onMarkUnread,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    refreshConversations,
    removeConversation,
  } = useConversations();
  
  
  const { showToast } = useToast();

  const [renameConversation] = useMutation(RENAME_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation renamed', 'success');
    },
    onError: (error) => {
      console.error('Failed to rename conversation:', error);
      showToast(`Failed to rename conversation: ${error.message}`, 'error');
    },
  });

  const [archiveConversation] = useMutation(ARCHIVE_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation archived', 'success');
    },
    onError: (error) => {
      console.error('Failed to archive conversation:', error);
      showToast(`Failed to archive conversation: ${error.message}`, 'error');
    },
  });

  const [unarchiveConversation] = useMutation(UNARCHIVE_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation unarchived', 'success');
    },
    onError: (error) => {
      console.error('Failed to unarchive conversation:', error);
      showToast(`Failed to unarchive conversation: ${error.message}`, 'error');
    },
  });

  const [deleteConversation] = useMutation(DELETE_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation deleted', 'success');
      // Clear active conversation if it was deleted
      if (activeConversationId && !conversations.has(activeConversationId)) {
        setActiveConversationId(null);
      }
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      showToast(`Failed to delete conversation: ${errorMessage}`, 'error');
      // Refresh to restore if delete failed
      refreshConversations();
    },
  });

  const [pinConversation] = useMutation(PIN_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation pinned', 'success');
    },
    onError: (error) => {
      console.error('Failed to pin conversation:', error);
      showToast(`Failed to pin conversation: ${error.message}`, 'error');
    },
  });

  const [unpinConversation] = useMutation(UNPIN_CONVERSATION, {
    onCompleted: () => {
      refreshConversations();
      showToast('Conversation unpinned', 'success');
    },
    onError: (error) => {
      console.error('Failed to unpin conversation:', error);
      showToast(`Failed to unpin conversation: ${error.message}`, 'error');
    },
  });

  const filteredConversations = useMemo(() => {
    const convsArray: ConversationWithDraft[] = Array.from(conversations.values());

    // Filter by search
    let filtered: ConversationWithDraft[] = convsArray;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.title?.toLowerCase().includes(query) ||
          conv.id.toLowerCase().includes(query) ||
          conv.draft?.toLowerCase().includes(query)
      );
    }

    // Separate pinned and unpinned
    const pinned = filtered.filter((c) => c.pinned && !c.archived);
    const unpinned = filtered.filter((c) => !c.pinned && !c.archived);
    const archived = filtered.filter((c) => c.archived);

    // Sort by updatedAt
    const sortByDate = (a: ConversationWithDraft, b: ConversationWithDraft) =>
      b.updatedAt.localeCompare(a.updatedAt);

    return {
      pinned: pinned.sort(sortByDate),
      unpinned: unpinned.sort(sortByDate),
      archived: archived.sort(sortByDate),
    };
  }, [conversations, searchQuery]);

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await renameConversation({ variables: { id, title: newTitle.trim() } });
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      // Error toast is handled by mutation onError
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveConversation({ variables: { id } });
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      // Error toast is handled by mutation onError
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveConversation({ variables: { id } });
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
      // Error toast is handled by mutation onError
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return;
    }
    
    // Remove from context immediately for instant UI feedback
    removeConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    
    try {
      await deleteConversation({ variables: { id } });
    } catch (error) {
      console.error('Delete handler error:', error);
      // Error toast is handled by mutation onError, but we also refresh to restore
      refreshConversations();
    }
  };

  const handlePin = async (id: string) => {
    try {
      await pinConversation({ variables: { id } });
    } catch (error) {
      console.error('Failed to pin conversation:', error);
      // Error toast is handled by mutation onError
    }
  };

  const handleUnpin = async (id: string) => {
    try {
      await unpinConversation({ variables: { id } });
    } catch (error) {
      console.error('Failed to unpin conversation:', error);
      // Error toast is handled by mutation onError
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversationItem = (conv: ConversationWithDraft) => {
    const isSelected = conv.id === activeConversationId;
    const isProcessing = activeConversationIds.has(conv.id);
    const isUnread = unreadConversationIds.has(conv.id);
    const isEditing = editingId === conv.id;
    const isMenuOpen = openMenuId === conv.id;

    return (
      <div
        key={conv.id}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        onClick={() => {
          if (!isEditing) {
            setActiveConversationId(conv.id);
            if (isUnread && onMarkRead) {
              onMarkRead(conv.id);
            }
          }
        }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim()) {
                handleRename(conv.id, editTitle);
              } else {
                setEditingId(null);
                setEditTitle('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editTitle.trim()) {
                  handleRename(conv.id, editTitle);
                }
              } else if (e.key === 'Escape') {
                setEditingId(null);
                setEditTitle('');
              }
            }}
            className="flex-1 px-2 py-1 text-sm border rounded bg-white text-gray-900"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                {isUnread && !isProcessing && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                <span className={`truncate font-medium ${
                  isProcessing 
                    ? 'bg-gradient-to-r from-primary via-white via-primary to-primary bg-[length:300%_100%] bg-clip-text text-transparent animate-shimmer' 
                    : ''
                }`}>
                  {conv.title || (conv.draft ? 'Draft' : 'New Conversation')}
                </span>
                {conv.pinned && (
                  <Pin className="w-3 h-3 flex-shrink-0 opacity-60" />
                )}
                {conv.draft && !conv.title && (
                  <span className="text-xs opacity-60">(draft)</span>
                )}
              </div>
              <div className="text-xs opacity-70 mt-0.5">
                {formatDate(conv.updatedAt)} • {conv.messages.length} msgs
                {conv.draft && ' • draft'}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : conv.id);
                }}
                className={`p-1 hover:bg-gray-200 rounded transition-opacity ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                    }}
                  />
                  <div className="absolute right-0 top-6 z-20 bg-white border border-gray-300 rounded-md shadow-xl py-1 min-w-[160px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(conv.id);
                        setEditTitle(conv.title || '');
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-700" />
                      Rename
                    </button>
                    {conv.pinned ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnpin(conv.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <PinOff className="w-3.5 h-3.5 text-gray-700" />
                        Unpin
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePin(conv.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5 text-gray-700" />
                        Pin
                      </button>
                    )}
                    {conv.archived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(conv.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5 text-gray-700" />
                        Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(conv.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Archive className="w-3.5 h-3.5 text-gray-700" />
                        Archive
                      </button>
                    )}
                    {isUnread && onMarkUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkUnread(conv.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-gray-700" />
                        Mark unread
                      </button>
                    )}
                    <div className="border-t border-gray-300 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Collapsed state - just show the toggle and chat icon
  if (!isOpen) {
    return (
      <div className="bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-2">
        <button
          onClick={onToggle}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Show sidebar"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            const newId = createConversation();
            setActiveConversationId(newId);
          }}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="New Conversation"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
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
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden" style={{ height: '100%' }}>
      {/* Toggle and Search */}
      <div className="p-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            title="Hide sidebar"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => {
              const newId = createConversation();
              setActiveConversationId(newId);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            title="New Conversation"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {conversations.size === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            No conversations yet
          </div>
        )}

        {conversations.size > 0 && (
          <>
            {/* Pinned */}
            {filteredConversations.pinned.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 px-2 py-1">Pinned</div>
                {filteredConversations.pinned.map(renderConversationItem)}
              </div>
            )}

            {/* Regular */}
            {filteredConversations.unpinned.length > 0 && (
              <div>
                {filteredConversations.pinned.length > 0 && (
                  <div className="text-xs font-medium text-gray-500 px-2 py-1 mt-2">Recent</div>
                )}
                {filteredConversations.unpinned.map(renderConversationItem)}
              </div>
            )}

            {/* Archived */}
            {filteredConversations.archived.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {showArchived ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Archived ({filteredConversations.archived.length})</span>
                </button>
                {showArchived && (
                  <div className="mt-1">
                    {filteredConversations.archived.map(renderConversationItem)}
                  </div>
                )}
              </div>
            )}

            {filteredConversations.pinned.length === 0 &&
              filteredConversations.unpinned.length === 0 &&
              filteredConversations.archived.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              )}
          </>
        )}
      </div>
    </div>
    </>
  );
}

