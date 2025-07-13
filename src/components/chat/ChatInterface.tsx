/**
 * Modern Minimalistic Chat Interface
 * Clean, focused design inspired by ChatGPT and Linear
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/lib/types'; // Importing ChatMessage type

// Sources dropdown component
const SourcesDropdown = ({ sources }: { sources: ChatMessage['sources'] }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging
  console.log('SourcesDropdown - sources:', sources);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span>📚 {sources.length} source{sources.length > 1 ? 's' : ''}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          {sources.map((source, index) => (
            <div key={source.chunkId} className="text-xs">
              <div className="font-medium text-gray-700 mb-1">
                {index + 1}. {source.documentTitle}
              </div>
              <div className="text-gray-600 line-clamp-2 leading-relaxed">
                {source.content.slice(0, 120)}...
              </div>
              <div className="text-gray-400 mt-1">
                Relevance: {(source.similarityScore * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Interface for messages to be sent to the API
type ApiMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface ChatSettings {
  useStreaming: boolean;
}

export default function ChatInterface() {
  const { status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [settings] = useState<ChatSettings>({ useStreaming: true });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages and conversationId from localStorage on initial render
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedConversationId = localStorage.getItem('chatConversationId');
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        const messagesWithDates = parsedMessages.map((msg: {
          id: string;
          role: 'user' | 'assistant';
          content: string;
          timestamp: string;
          isStreaming?: boolean;
          sources?: ChatMessage['sources']; // Include sources in type
        }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    }
    
    if (savedConversationId) {
      setConversationId(savedConversationId);
    }
  }, []);

  // Save messages and conversationId to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
    
    if (conversationId) {
      localStorage.setItem('chatConversationId', conversationId);
    }
  }, [messages, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      if (settings.useStreaming) {
        await handleStreamingResponse(userMessage);
      } else {
        await handleNonStreamingResponse(userMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStreamingResponse = async (userMessage: ChatMessage) => {
    // Convert chat messages to API format
    const apiMessages: ApiMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the new user message
    apiMessages.push({
      role: userMessage.role,
      content: userMessage.content
    });
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        messages: apiMessages,
        conversationId,
        useStreaming: true,
      }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      sources: [], // Initialize sources as empty array
    };

    setMessages(prev => [...prev, assistantMessage]);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'chunk':
                  if (data.content) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    ));
                  }
                  break;
                
                case 'complete':
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          isStreaming: false,
                          sources: data.metadata?.sourceDocuments || []
                        }
                      : msg
                  ));
                  
                  if (data.conversationId) {
                    setConversationId(data.conversationId);
                  }
                  
                  // If the API returns an updated messages array, we could use it
                  // to sync our state with the server's state if needed
                  if (data.metadata?.messages && data.metadata.messages.length > 0) {
                    console.log('✅ Received updated message history from server');
                  }
                  break;
                
                case 'error':
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: 'I encountered an error. Please try again.',
                          isStreaming: false 
                        }
                      : msg
                  ));
                  break;
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleNonStreamingResponse = async (userMessage: ChatMessage) => {
    // Convert chat messages to API format
    const apiMessages: ApiMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the new user message
    apiMessages.push({
      role: userMessage.role,
      content: userMessage.content
    });
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        messages: apiMessages,
        conversationId,
        useStreaming: false,
      }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: data.message || data.response || 'No response received',
      timestamp: new Date(),
      sources: data.metadata?.sourceDocuments || [],
    };

    setMessages(prev => [...prev, assistantMessage]);

    if (data.conversationId) {
      setConversationId(data.conversationId);
    }
    
    // If the API returns an updated messages array, we could use it
    // to sync our state with the server's state if needed
    if (data.metadata?.messages && data.metadata.messages.length > 0) {
      console.log('✅ Received updated message history from server');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    // Clear localStorage
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatConversationId');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in required</h3>
        <p className="text-gray-600 mb-6">Please sign in to start chatting</p>
        <a
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              How can I help you today?
            </h2>
            <p className="text-gray-600 max-w-md">
              Ask me anything about your knowledge base, or chat about general topics.
            </p>
            <div className="flex flex-wrap gap-2 mt-8">
              {[
                "Why choose Kruze Consulting?",
                "Calculate startup cash burn rate",
                "Why use a financial model?"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-6">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {message.role === 'user' ? 'U' : '✨'}
                  </div>
                  
                  {/* Message Content */}
                  <div className={`flex-1 max-w-3xl ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-gray-50 text-gray-900'
                    }`}>
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      ) : (
                        <div className="text-gray-900 leading-relaxed">
                          <ReactMarkdown
                            components={{
                              // Paragraphs
                              p: ({ children }) => (
                                <p className="mb-4 last:mb-0 leading-relaxed text-gray-900">
                                  {children}
                                </p>
                              ),
                              
                              // Headings
                              h1: ({ children }) => (
                                <h1 className="text-xl font-bold mb-4 text-gray-900 border-b border-gray-200 pb-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-lg font-semibold mb-3 mt-4 text-gray-900">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-base font-semibold mb-2 mt-3 text-gray-900">
                                  {children}
                                </h3>
                              ),
                              
                              // Lists
                              ul: ({ children }) => (
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-6 mb-4 space-y-2">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-gray-900 leading-relaxed">
                                  {children}
                                </li>
                              ),
                              
                              // Inline code
                              code: ({ children, className }) => {
                                // Check if it's a code block (has className) or inline code
                                const isCodeBlock = className?.includes('language-');
                                if (isCodeBlock) {
                                  return (
                                    <code className={`${className} block`}>
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
                                    {children}
                                  </code>
                                );
                              },
                              
                              // Code blocks
                              pre: ({ children }) => (
                                <pre className="bg-gray-100 border border-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-3">
                                  {children}
                                </pre>
                              ),
                              
                              // Blockquotes
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-3 italic text-gray-700">
                                  {children}
                                </blockquote>
                              ),
                              
                              // Links
                              a: ({ children, href }) => (
                                <a 
                                  href={href}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                              
                              // Strong/bold text
                              strong: ({ children }) => (
                                <strong className="font-semibold text-gray-900">
                                  {children}
                                </strong>
                              ),
                              
                              // Emphasis/italic text
                              em: ({ children }) => (
                                <em className="italic text-gray-800">
                                  {children}
                                </em>
                              ),
                              
                              // Tables
                              table: ({ children }) => (
                                <div className="overflow-x-auto mb-4 mt-2">
                                  <table className="min-w-full border border-gray-300 rounded-lg bg-white shadow-sm">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-gray-100 border-b border-gray-300">
                                  {children}
                                </thead>
                              ),
                              th: ({ children }) => (
                                <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 last:border-r-0">
                                  {children}
                                </th>
                              ),
                              tr: ({ children }) => (
                                <tr className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                  {children}
                                </tr>
                              ),
                              td: ({ children }) => (
                                <td className="px-4 py-3 text-gray-900 border-r border-gray-200 last:border-r-0 align-top">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      
                      {message.isStreaming && (
                        <div className="flex items-center gap-1 mt-2 opacity-70">
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:0.2s]" />
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:0.4s]" />
                        </div>
                      )}
                    </div>
                    
                    {/* Sources dropdown - only for assistant messages */}
                    {message.role === 'assistant' && !message.isStreaming && (
                      <div>
                        <SourcesDropdown sources={message.sources} />
                      </div>
                    )}
                    
                    {/* Timestamp (subtle, only on hover) */}
                    <div className={`text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shadow bg-white/80 backdrop-blur-sm p-4 rounded-t-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            {/* Clear Chat Button (minimal) */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg"
                title="Clear chat"
              >
                <span className="text-lg">↻</span>
              </button>
            )}
            
            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message..."
                className="w-full p-4 pr-12 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 placeholder-gray-400 bg-white no-scrollbar"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '56px' }}
              />
              
              {/* Send/Stop Button */}
              <div className="absolute right-2 top-2">
                {isLoading ? (
                  <button
                    onClick={handleStopGeneration}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg"
                    title="Stop generation"
                  >
                    <span className="text-lg">⏹</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg"
                    title="Send message"
                  >
                    <span className="text-lg">↗</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
