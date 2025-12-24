import { ReactNode, useState } from 'react';
import { Database } from 'lucide-react';
import { SchemaSidebar } from '../schema-sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Cortex</h1>
            <button
              onClick={() => setIsSchemaOpen(!isSchemaOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                isSchemaOpen
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="View Graph Schema"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Schema</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <SchemaSidebar isOpen={isSchemaOpen} onClose={() => setIsSchemaOpen(false)} />
    </div>
  );
}

