import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConversationProvider, useConversations } from './contexts/ConversationContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/layout/Layout';
import ChatPage from './pages/ChatPage';

function AppContent() {
  const { processingConversationIds = new Set() } = useConversations();
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());

  const handleMarkRead = (id: string) => {
    setUnreadConversationIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMarkUnread = (id: string) => {
    setUnreadConversationIds((prev) => new Set(prev).add(id));
  };

  return (
    <Layout
      activeConversationIds={processingConversationIds}
      unreadConversationIds={unreadConversationIds}
      onMarkRead={handleMarkRead}
      onMarkUnread={handleMarkUnread}
    >
      <Routes>
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConversationProvider>
          <AppContent />
        </ConversationProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
