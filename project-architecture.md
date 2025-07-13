# Project Architecture: RAG Knowledge Base Application

## Overview

The RAG Knowledge Base Application is a modern, production-ready platform for secure knowledge management and Retrieval-Augmented Generation (RAG). It combines a robust Next.js frontend, scalable API backend, PostgreSQL and Pinecone for storage and retrieval, and LangChain for advanced AI-powered search and chat capabilities.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                 │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │   Auth Pages    │  Knowledge Base │   Chat Interface│   │
│  │  - Sign in/up   │  - Upload docs  │  - AI Assistant │   │
│  │  - OAuth flows  │  - Browse/edit  │  - Conversation │   │
│  │  - User profile │  - Admin panel  │  - Real-time UI │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
│                    React + Tailwind CSS                   │
└───────────────▲───────────────────────────────┬────────────┘
                │                               │
                │ Next.js API Routes (Backend)  │
                │ ┌─────────────────────────────┐│
                │ │ /api/auth/*    - NextAuth   ││
                │ │ /api/documents/* - CRUD     ││
                │ │ /api/ingest/*  - URL parse  ││
                │ │ /api/chat/*    - LangChain  ││
                │ │ /api/admin/*   - Management ││
                │ └─────────────────────────────┘│
                ▼                               │
┌──────────────────────────────┐   ┌─────────────────────────┐
│      PostgreSQL Database     │   │   Pinecone Vector DB    │
│  ┌─────────────────────────┐ │   │  ┌─────────────────────┐│
│  │ Users, Roles, Sessions  │ │   │  │   Document Chunks   ││
│  │ Documents, Metadata     │ │   │  │   Vector Embeddings ││
│  │ Conversations, History  │ │   │  │   Semantic Search   ││
│  │ Contact Forms          │ │   │  │   Similarity Match   ││
│  └─────────────────────────┘ │   │  └─────────────────────┘│
│         Prisma ORM           │   │      AI Embeddings      │
└──────────────────────────────┘   └─────────────────────────┘
                │                               │
                └─────────────┬─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   LangChain RAG   │
                    │ ┌───────────────┐ │
                    │ │ Text Splitter │ │
                    │ │ Embeddings    │ │
                    │ │ Retrievers    │ │
                    │ │ Chat Models   │ │
                    │ │ Agents/Tools  │ │
                    │ └───────────────┘ │
                    │  Multi-Provider   │
                    │ OpenAI, Cohere,   │
                    │ HuggingFace, etc. │
                    └───────────────────┘
```

---

## Core Components

### 1. Frontend Layer (Next.js + React + Tailwind CSS)

**Pages & Components:**
- **Authentication Pages**: Sign-in/up with email/password and OAuth (Google, GitHub)
- **Knowledge Base**: Document upload, browse, search, CRUD operations
- **Chat Interface**: Real-time AI assistant with conversation history
- **Admin Dashboard**: User management, document oversight, system health

**Key Features:**
- Responsive design with accessibility support
- Role-based UI rendering (User vs Admin)
- Real-time chat with markdown rendering
- Modern, clean interface with Tailwind CSS

### 2. Backend/API Layer (Next.js API Routes)

**Authentication Endpoints** (`/api/auth/*`):
- NextAuth.js integration for secure sessions
- Email/password and OAuth provider support
- Role-based access control middleware

**Knowledge Base Endpoints** (`/api/documents/*`):
- Document CRUD operations
- File upload and processing
- Metadata management and search

**Ingestion Endpoints** (`/api/ingest/*`):
- URL content extraction and parsing
- Web scraping and content processing
- Automatic chunking and embedding generation

**Chat Endpoints** (`/api/chat/*`):
- LangChain-powered conversational AI
- Context-aware RAG implementation
- Multi-turn conversation support

**Admin Endpoints** (`/api/admin/*`):
- User and role management
- System monitoring and health checks
- Performance analytics

### 3. Database Layer

#### PostgreSQL (Primary Database via Prisma)
```sql
-- Core Tables:
- Users (id, email, name, role, createdAt)
- Documents (id, title, content, userId, metadata)
- Conversations (id, userId, title, createdAt)
- Messages (id, conversationId, content, role, timestamp)
- ContactFormSubmissions (id, name, email, message, status)
```

**Features:**
- ACID compliance for data integrity
- Performance indexes for common queries
- User sessions and role management
- Document metadata and relationships

#### Pinecone (Vector Database)
```javascript
// Vector Storage Structure:
{
  id: "doc_uuid",
  values: [0.1, 0.2, ...], // 1536-dim embeddings
  metadata: {
    documentId: "doc_id",
    chunkIndex: 0,
    content: "text_chunk",
    title: "document_title"
  }
}
```

**Features:**
- Semantic similarity search
- Scalable vector storage
- Fast retrieval for RAG
- Metadata filtering

### 4. RAG & AI Layer (LangChain)

**Modular Architecture:**
```
src/lib/
├── conversationalRAG.ts          # Main orchestrator
├── errors/ConversationalRAGErrors.ts
├── constants/conversationalRAG.ts
├── utils/
│   ├── MarkdownProcessor.ts      # Response formatting
│   └── MessageUtils.ts           # Chat utilities
├── handlers/
│   ├── CompanyInfoHandler.ts     # Company-specific queries
│   └── RAGHandler.ts             # Document retrieval
└── managers/ConversationManager.ts
```

**AI Provider Support:**
- **Embeddings**: OpenAI, Cohere, HuggingFace
- **Chat**: OpenAI GPT models, Perplexity
- **Configurable**: Switch providers via environment variables

---

## Key Functionalities

### 1. Knowledge Base Management
- **Document Upload**: PDF, TXT, DOCX support with automatic processing
- **URL Ingestion**: Web page content extraction and parsing
- **CRUD Operations**: Create, read, update, delete documents
- **Search & Filter**: Full-text and semantic search capabilities
- **Metadata Management**: Tags, categories, and custom fields

### 2. Agentic Chatbot
- **Context-Aware Responses**: Uses RAG for relevant information retrieval
- **Multi-Turn Conversations**: Maintains conversation history and context
- **Company Information**: Handles company-specific queries intelligently
- **Real-Time Streaming**: Progressive response rendering
- **Markdown Support**: Rich formatting for code, lists, and emphasis

### 3. Authentication & Authorization
- **Multiple Auth Methods**: Email/password, Google OAuth, GitHub OAuth
- **Role-Based Access**: User and Admin roles with granular permissions
- **Secure Sessions**: NextAuth.js with encrypted session management
- **Protected Routes**: API and page-level access control

### 4. URL Ingestion & Web Content Processing
- **Intelligent Parsing**: Extracts meaningful content from web pages
- **Content Cleaning**: Removes navigation, ads, and irrelevant elements
- **Automatic Chunking**: Splits content for optimal vector storage
- **Metadata Extraction**: Captures titles, descriptions, and structure
- **Bulk Processing**: Handles multiple URLs efficiently

### 5. Admin Features
- **User Management**: View, edit, and manage user accounts
- **Document Oversight**: Monitor all documents across the platform
- **System Health**: Performance metrics and error monitoring
- **Analytics**: Usage statistics and trend analysis

---

## Security & Best Practices

### Security Measures
- **Environment Variables**: All secrets managed via `.env.local`
- **Strong Authentication**: Secure password policies and session management
- **HTTPS Enforcement**: SSL/TLS in production
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Sanitization of all user inputs
- **Rate Limiting**: API endpoint protection against abuse

### Development Best Practices
- **TypeScript**: Full type safety across the application
- **Modular Architecture**: Separation of concerns and reusable components
- **Error Handling**: Comprehensive error tracking and user feedback
- **Performance Optimization**: Caching strategies and database indexing
- **Code Quality**: ESLint, Prettier, and automated testing
- **Documentation**: Comprehensive guides and API documentation

---

## Performance Optimizations

### Database Optimizations
- **Strategic Indexes**: Optimized queries for users, documents, conversations
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Reduced N+1 queries and improved joins
- **Caching Strategies**: Intelligent caching for frequent operations

### Vector Store Optimizations
- **Intelligent Chunking**: Optimal chunk sizes for retrieval accuracy
- **Metadata Filtering**: Efficient vector search with constraints
- **Embedding Caching**: Reduced API calls for duplicate content
- **Batch Processing**: Efficient bulk operations

### Frontend Optimizations
- **Code Splitting**: Lazy loading of components and pages
- **Image Optimization**: Next.js built-in image optimization
- **Bundle Analysis**: Minimized JavaScript bundle sizes
- **Progressive Enhancement**: Core functionality without JavaScript

---

## Extensibility & Scalability

### Easy Extensions
- **New AI Providers**: Simple environment variable configuration
- **Additional Document Types**: Pluggable document processors
- **Custom Chat Features**: Modular chat component architecture
- **Integration APIs**: RESTful endpoints for external systems

### Scalability Considerations
- **Horizontal Scaling**: Stateless API design for load balancing
- **Database Scaling**: PostgreSQL read replicas and partitioning
- **Vector Store Scaling**: Pinecone auto-scaling capabilities
- **Caching Layer**: Redis integration for session and data caching
- **CDN Integration**: Static asset optimization and distribution

---

## Directory Structure

```
rag-app/
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js 13+ app router
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── chat/             # Chat interface
│   │   ├── admin/            # Admin dashboard
│   │   └── knowledge-base/   # Document management
│   ├── components/           # Reusable React components
│   │   ├── chat/            # Chat-specific components
│   │   └── knowledge-base/  # Document-specific components
│   ├── lib/                 # Core libraries and utilities
│   │   ├── auth-config.ts   # Authentication configuration
│   │   ├── prisma.ts        # Database client
│   │   ├── conversationalRAG.ts # Main RAG orchestrator
│   │   ├── clients/         # External service clients
│   │   ├── handlers/        # Business logic handlers
│   │   ├── managers/        # Service managers
│   │   └── utils/           # Utility functions
│   ├── services/            # Service layer implementations
│   └── types/               # TypeScript type definitions
├── scripts/                 # Development and admin scripts
├── docs/                    # Project documentation
└── nginx/                   # Production deployment configs
```

---

## Deployment Architecture

### Development Environment
- **Node.js**: Version managed with `nvm use`
- **Package Manager**: Yarn for dependency management
- **Database**: Docker PostgreSQL container
- **Vector Store**: Pinecone cloud service
- **Environment**: `.env.local` for local configuration

### Production Environment
- **Application Server**: Next.js production build
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Vector Database**: Pinecone production index
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **Monitoring**: Health checks and performance monitoring
- **Security**: Environment variables and secret management

### CI/CD Pipeline
- **Build Process**: Automated testing and building
- **Database Migrations**: Prisma migrate deploy
- **Environment Promotion**: Staged deployments
- **Health Checks**: Automated verification of deployed services

---

## API Documentation

### Authentication Endpoints
```
POST /api/auth/signin       # User login
POST /api/auth/signup       # User registration
GET  /api/auth/session      # Current user session
POST /api/auth/signout      # User logout
```

### Knowledge Base Endpoints
```
GET    /api/documents       # List documents
POST   /api/documents       # Upload document
GET    /api/documents/:id   # Get document
PUT    /api/documents/:id   # Update document
DELETE /api/documents/:id   # Delete document
```

### Chat Endpoints
```
POST /api/chat             # Send chat message
GET  /api/conversations    # List conversations
POST /api/conversations    # Create conversation
GET  /api/conversations/:id # Get conversation history
```

### Ingestion Endpoints
```
POST /api/ingest/url       # Ingest URL content
POST /api/ingest/batch     # Batch URL processing
GET  /api/ingest/status/:id # Check ingestion status
```

---

## References & Resources

### Internal Documentation
- [README.md](./README.md) - Setup and usage guide
- [TESTING.md](./TESTING.md) - Testing documentation
- [docs/](./docs/) - Detailed guides and troubleshooting

### External Dependencies
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [LangChain](https://js.langchain.com/) - AI framework
- [Pinecone](https://www.pinecone.io/) - Vector database
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

**Last Updated**: July 13, 2025  
**Architecture Version**: 4.0 (Production Ready)
