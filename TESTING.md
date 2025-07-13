# RAG App Testing Guide

Essential testing guide for the current RAG application implementation.

## 🏁 Quick Start

```bash
# 1. Start PostgreSQL
docker start rag-pg

# 2. Start development server
yarn dev

# 3. Create admin user
yarn create-admin
```

**Default Admin**: `admin@example.com` / `admin123`

## 🧪 Testing Commands

### Authentication & User Management
```bash
yarn test:auth          # Consolidated authentication testing (OAuth, direct auth, user creation)
yarn create-admin       # Create admin user
yarn recreate-admin     # Reset admin user
yarn delete-admin       # Remove admin user
```

### AI Services
```bash
yarn test:embedding     # Comprehensive embedding service testing (all providers + demos)
yarn test:vector-store  # Test vector store service implementation
yarn test:knowledge-base # Test knowledge base service integration
```

## 🌐 Manual Testing

**Authentication Flow**:
- Login: `http://localhost:3000/auth/signin`
- Dashboard: `http://localhost:3000/dashboard`
- OAuth: Google/GitHub (if configured)

**API Endpoints**:
```bash
curl http://localhost:3000/api/auth/providers
curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/ingest
```

## 📊 Implementation Status

| Component | Status | 
|-----------|--------|
| **Authentication** | ✅ NextAuth + Credentials + OAuth |
| **Database** | ✅ PostgreSQL + Prisma (User, Document, Chunk) |
| **Type System** | ✅ Interfaces for embedding/vector services |
| **Embedding Service** | ✅ OpenAI, Cohere, HuggingFace support |
| **Vector Store Service** | ✅ Pinecone implementation with full CRUD |
| **Text Processing** | ✅ LangChain text splitters with chunking |
| **Knowledge Base Service** | ✅ Full ingestion pipeline + RAG retrieval |
| **Ingestion API** | ✅ Admin-only document ingestion endpoint |
| **RAG Implementation** | ❌ Not implemented |
| **Agentic Chatbot** | ❌ Not implemented |

## 🔧 Environment Variables

**Required**:
```bash
DATABASE_URL="postgresql://postgres:rebranding@localhost:5432/rag_app"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

**For Knowledge Base** (for ingestion pipeline):
```bash
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=rag-knowledge-base
PINECONE_ENVIRONMENT=gcp-starter
```

**For AI Features**:
```bash
OPENAI_API_KEY=sk-your-openai-key
```

**For Pinecone** (optional):
```bash
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=rag-knowledge-base
PINECONE_ENVIRONMENT=gcp-starter
```
**For OAuth** (optional):
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 🚨 Troubleshooting

```bash
# Database issues
docker logs rag-pg
npx prisma studio

# Auth issues  
yarn recreate-admin

# AI service issues
yarn test:openai-models
```

## 🎯 Next Steps

**Ready to implement**: RAG Retrieval & Agentic Chatbot (Milestone 3.1-3.4)
- Implement RAG retrieval mechanism
- Create chatbot UI and API integration
- Build agentic AI with tool usage
- Add conversation memory and context
