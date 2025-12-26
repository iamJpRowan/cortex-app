import { ReactNode, useState } from 'react';
import { Database } from 'lucide-react';
import { SchemaSidebar } from '../schema-sidebar';
import { ConversationSidebar } from '../conversation-sidebar';

interface LayoutProps {
  children: ReactNode;
  activeConversationIds?: Set<string>;
  unreadConversationIds?: Set<string>;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
}

export default function Layout({
  children,
  activeConversationIds,
  unreadConversationIds,
  onMarkRead,
  onMarkUnread,
}: LayoutProps) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(true); // Default open

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 overflow-hidden">
          <ConversationSidebar
            isOpen={isConversationsOpen}
            onToggle={() => setIsConversationsOpen(!isConversationsOpen)}
            activeConversationIds={activeConversationIds}
            unreadConversationIds={unreadConversationIds}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
          />
        </div>
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsSchemaOpen(!isSchemaOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                isSchemaOpen
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
              title="View Graph Schema"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Schema</span>
            </button>
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <SchemaSidebar isOpen={isSchemaOpen} onClose={() => setIsSchemaOpen(false)} />
    </div>
  );
}

