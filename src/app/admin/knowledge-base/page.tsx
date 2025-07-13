/**
 * Admin Knowledge Base Management Page
 * Provides UI for URL ingestion, document management, and re-upload functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Document, IngestionResult } from '@/lib/types'; 

export default function AdminKnowledgeBasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for URL ingestion
  const [urlInput, setUrlInput] = useState('');
  const [selectorsInput, setSelectorsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestionResults, setIngestionResults] = useState<IngestionResult | null>(null);

  // State for document management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'chunks'>('newest');

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user?.role !== 'ADMIN') {
      router.push('/chat');
      return;
    }
  }, [session, status, router]);

  // Load documents on component mount
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadDocuments();
    }
  }, [session]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const response = await fetch('/api/knowledge-base/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Filter and sort documents based on search criteria
  useEffect(() => {
    let filtered = [...documents];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(term) ||
        doc.author?.toLowerCase().includes(term) ||
        doc.tags.some(tag => tag.toLowerCase().includes(term)) ||
        doc.documentType?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'chunks':
          return b.chunksCount - a.chunksCount;
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedType, sortBy]);

  // Get unique document types for filter dropdown
  const documentTypes = Array.from(new Set(documents.map(doc => doc.documentType).filter(Boolean)));

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIngestionResults(null);

    try {
      // Parse URLs (split by newlines)
      const urls = urlInput
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      // Parse selectors (split by commas)
      const selectors = selectorsInput
        .split(',')
        .map(selector => selector.trim())
        .filter(selector => selector.length > 0);

      if (urls.length === 0) {
        throw new Error('Please provide at least one URL');
      }

      const requestBody = urls.length === 1
        ? {
            title: `Document from ${urls[0]}`,
            url: urls[0],
            selectorsToIgnore: selectors.length > 0 ? selectors : undefined,
          }
        : {
            title: `Bulk ingestion from ${urls.length} URLs`,
            urls: urls,
            selectorsToIgnore: selectors.length > 0 ? selectors : undefined,
          };

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        setIngestionResults(result);
        setUrlInput('');
        setSelectorsInput('');
        // Reload documents to show new additions
        await loadDocuments();
      } else {
        throw new Error(result.message || 'Failed to ingest URLs');
      }
    } catch (error) {
      setIngestionResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReupload = async (documentId: string, sourceUrl?: string) => {
    if (!sourceUrl) {
      alert('Document does not have a source URL for re-upload');
      return;
    }

    if (!confirm('Are you sure you want to re-upload this document? This will replace all existing content.')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/reupload`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use existing URL for re-upload
          selectorsToIgnore: selectorsInput
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Document re-uploaded successfully!');
        await loadDocuments();
      } else {
        throw new Error(result.message || 'Failed to re-upload document');
      }
    } catch (error) {
      alert(`Failed to re-upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${documentTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        alert('Document deleted successfully!');
        await loadDocuments();
      } else {
        throw new Error(result.message || 'Failed to delete document');
      }
    } catch (error) {
      alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAllDocuments = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL documents and their chunks from the knowledge base. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    // Double confirmation for such a destructive action
    if (!confirm('This is your final confirmation. Type YES in the next prompt to proceed.')) {
      return;
    }

    const userConfirmation = prompt('Please type "DELETE ALL" to confirm (case sensitive):');
    if (userConfirmation !== 'DELETE ALL') {
      alert('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      const response = await fetch('/api/knowledge-base/documents', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully deleted ${result.deletedCount} documents from the knowledge base.`);
        await loadDocuments();
      } else {
        throw new Error(result.message || 'Failed to delete all documents');
      }
    } catch (error) {
      alert(`Failed to delete all documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show nothing if not admin (will redirect)
  if (!session || session.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base Management</h1>
          <p className="mt-2 text-gray-600">Manage documents and URL ingestion</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* URL Ingestion Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 order-2 xl:order-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">URL Ingestion</h2>
            
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label htmlFor="urls" className="block text-sm font-medium text-gray-700 mb-2">
                  URLs (one per line)
                </label>
                <textarea
                  id="urls"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="selectors" className="block text-sm font-medium text-gray-700 mb-2">
                  CSS Selectors to Ignore (comma-separated, optional)
                </label>
                <input
                  id="selectors"
                  type="text"
                  value={selectorsInput}
                  onChange={(e) => setSelectorsInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder=".navbar, .footer, .sidebar, .advertisement"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: .navbar, .footer, .sidebar (removes navigation, footer, and sidebar content)
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Processing...' : 'Ingest URLs'}
              </button>
            </form>

            {/* Ingestion Results */}
            {ingestionResults && (
              <div className={`mt-4 p-4 rounded-md ${
                ingestionResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`text-sm font-medium ${
                  ingestionResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {ingestionResults.message}
                </div>
                {ingestionResults.success && ingestionResults.totalDocuments && (
                  <div className="mt-2 text-sm text-green-700">
                    Successfully processed {ingestionResults.totalDocuments} document(s)
                  </div>
                )}
                {ingestionResults.errors && ingestionResults.errors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-red-800 mb-2">
                      Failed URLs ({ingestionResults.errors.length}):
                    </div>
                    <div className="space-y-1">
                      {ingestionResults.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                          <div className="font-medium">{error.url}</div>
                          <div className="mt-1">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document List Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 order-1 xl:order-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Documents ({filteredDocuments.length})
              </h2>
              <button
                onClick={loadDocuments}
                disabled={isLoadingDocs}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isLoadingDocs ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-4 mb-6">
              {/* Search Input */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search documents by title, author, tags, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                </div>
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex flex-wrap gap-4">
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Type:</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    {documentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title A-Z</option>
                    <option value="chunks">Most Chunks</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchTerm || selectedType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedType('all');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  {documents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No documents found</p>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      <p>No documents match your filters</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedType('all');
                        }}
                        className="text-blue-600 hover:text-blue-800 mt-2"
                      >
                        Clear filters to see all documents
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={doc.title}>
                          {doc.title}
                        </h3>
                        
                        <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500 mb-2">
                          {doc.author && (
                            <span>👤 {doc.author}</span>
                          )}
                          <span>📄 {doc.chunksCount} chunks</span>
                          <span>📅 {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          {doc.documentType && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                              {doc.documentType}
                            </span>
                          )}
                          {doc.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{doc.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4 flex flex-col gap-2">
                        {doc.sourceUrl && (
                          <button
                            onClick={() => handleReupload(doc.id, doc.sourceUrl)}
                            className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-100 border border-orange-200 font-medium"
                            title="Re-upload from source URL"
                          >
                            Re-upload
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-100 border border-red-200 font-medium"
                          title="Delete document"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Delete All Documents Button */}
            {documents.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: {documents.length} documents
                    {filteredDocuments.length !== documents.length && (
                      <span className="ml-2">
                        (showing {filteredDocuments.length} filtered)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleDeleteAllDocuments}
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-medium text-sm"
                  >
                    Delete All Documents
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
