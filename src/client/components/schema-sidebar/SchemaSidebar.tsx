import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Database,
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';
import { GET_GRAPH_SCHEMA } from './SchemaSidebar.queries';

interface NodeLabel {
  name: string;
  count: number;
}

interface RelationshipType {
  name: string;
  count: number;
}

interface Property {
  name: string;
  type: string;
}

interface GraphSchema {
  nodeLabels: NodeLabel[];
  relationshipTypes: RelationshipType[];
  allProperties: Property[];
}

interface SchemaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemaSidebar({ isOpen, onClose }: SchemaSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLabelsSection, setExpandedLabelsSection] = useState(true);
  const [expandedRelationshipsSection, setExpandedRelationshipsSection] = useState(true);
  const [expandedPropertiesSection, setExpandedPropertiesSection] = useState(true);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ graphSchema: GraphSchema }>(
    GET_GRAPH_SCHEMA,
    {
      skip: !isOpen, // Only fetch when sidebar is open
    }
  );

  const handleRefresh = async () => {
    try {
      await refetch({ forceRefresh: true });
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    } catch (error) {
      // Error is already handled by the query's error state
      console.error('Failed to refresh schema:', error);
    }
  };

  // Filter schema based on search query
  const filteredSchema = useMemo(() => {
    if (!data?.graphSchema || !searchQuery.trim()) {
      return data?.graphSchema;
    }

    const query = searchQuery.toLowerCase();
    
    return {
      nodeLabels: data.graphSchema.nodeLabels.filter(
        (label) => label.name.toLowerCase().includes(query)
      ),
      relationshipTypes: data.graphSchema.relationshipTypes.filter(
        (rel) => rel.name.toLowerCase().includes(query)
      ),
      allProperties: data.graphSchema.allProperties.filter(
        (prop) => 
          prop.name.toLowerCase().includes(query) ||
          prop.type.toLowerCase().includes(query)
      ),
    };
  }, [data?.graphSchema, searchQuery]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Success Toast */}
        {refreshSuccess && (
          <div className="absolute top-16 right-4 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm text-green-800 shadow-sm z-10 animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Schema refreshed</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Graph Schema</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-1.5 rounded transition-all ${
                loading 
                  ? 'cursor-wait opacity-60' 
                  : refreshSuccess
                  ? 'bg-green-50 hover:bg-green-100'
                  : 'hover:bg-gray-100'
              }`}
              title="Refresh schema"
            >
              <RefreshCw className={`w-4 h-4 transition-colors ${
                loading 
                  ? 'text-gray-600 animate-spin' 
                  : refreshSuccess
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search labels, relationships, properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                Failed to load schema. {error.message}
              </p>
            </div>
          )}

          {!loading && !error && filteredSchema && (
            <>
              {/* Labels & Relationships Section */}
              <div>
                {/* Node Labels */}
                <button
                  onClick={() => setExpandedLabelsSection(!expandedLabelsSection)}
                  className="flex items-center justify-between w-full mb-3 p-2 -mx-2 rounded hover:bg-gray-100 transition-colors group"
                >
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                    Node Labels ({filteredSchema.nodeLabels?.length || 0})
                  </h3>
                  {expandedLabelsSection ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  )}
                </button>
                {expandedLabelsSection && (
                  <>
                    {!filteredSchema.nodeLabels || filteredSchema.nodeLabels.length === 0 ? (
                      <p className="text-sm text-gray-500">No node labels found</p>
                    ) : (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {filteredSchema.nodeLabels.map((label) => (
                            <div
                              key={label.name}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {label.name}
                              </span>
                              <span className="text-xs text-gray-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                {label.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Relationships */}
                <button
                  onClick={() => setExpandedRelationshipsSection(!expandedRelationshipsSection)}
                  className="flex items-center justify-between w-full mb-3 mt-6 p-2 -mx-2 rounded hover:bg-gray-100 transition-colors group"
                >
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                    Relationships ({filteredSchema.relationshipTypes?.length || 0})
                  </h3>
                  {expandedRelationshipsSection ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  )}
                </button>
                {expandedRelationshipsSection && (
                  <>
                    {!filteredSchema.relationshipTypes || filteredSchema.relationshipTypes.length === 0 ? (
                      <p className="text-sm text-gray-500">No relationships found</p>
                    ) : (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {filteredSchema.relationshipTypes.map((relType) => (
                            <div
                              key={relType.name}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {relType.name}
                              </span>
                              <span className="text-xs text-gray-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                {relType.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* All Properties Section */}
              <div>
                <button
                  onClick={() => setExpandedPropertiesSection(!expandedPropertiesSection)}
                  className="flex items-center justify-between w-full mb-3 p-2 -mx-2 rounded hover:bg-gray-100 transition-colors group"
                >
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                    All Properties ({filteredSchema.allProperties?.length || 0})
                  </h3>
                  {expandedPropertiesSection ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                  )}
                </button>
                {expandedPropertiesSection && (
                  <>
                    {!filteredSchema.allProperties || filteredSchema.allProperties.length === 0 ? (
                      <p className="text-sm text-gray-500">No properties found</p>
                    ) : (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {filteredSchema.allProperties.map((property) => (
                            <div
                              key={property.name}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-xs font-mono text-gray-700">
                                {property.name}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {property.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {!loading && !error && (!filteredSchema || 
            ((!filteredSchema.nodeLabels || filteredSchema.nodeLabels.length === 0) && 
             (!filteredSchema.relationshipTypes || filteredSchema.relationshipTypes.length === 0) && 
             (!filteredSchema.allProperties || filteredSchema.allProperties.length === 0))) && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No results found' : 'No schema data available'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
