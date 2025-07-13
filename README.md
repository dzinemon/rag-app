# RAG Knowledge Base Application

A comprehensive Retrieval-Augmented Generation (RAG) application built with Next.js, featuring secure authentication, role-based access control, and optimized performance.

## 🚀 Key Features

- **🔐 Secure Authentication**: Email/password + OAuth (Google, GitHub) with NextAuth.js
- **👥 Role-Based Access**: User and Admin roles with granular permissions
- **🤖 Flexible AI Providers**: Easy switching between OpenAI, Perplexity for Completions and Open AI for embeddings
- **📚 Knowledge Base Management**: Document CRUD operations with PostgreSQL + Pinecone vector database
- **🌐 URL Ingestion & Web Parsing**: Intelligent web content extraction, parsing, and storage
- **💬 Agentic Chatbot**: LangChain-powered intelligent assistant with modern UI
- **⚡ Performance Optimized**: Intelligent caching, database indexes, and query optimization
- **🎨 Modern UI/UX**: Clean, responsive design with accessibility features
- **🔧 Production Ready**: Health checks, monitoring, and deployment configurations

## 🎯 Project Status: PRODUCTION READY ✅

**Latest Updates (Phase 4 Complete):**
- ✅ Modern chat interface with custom markdown styling
- ✅ Enhanced admin knowledge base with search/filter/sort
- ✅ Performance optimizations (caching, database indexes)
- ✅ Production deployment configurations
- ✅ Health monitoring and error handling
- ✅ Comprehensive documentation

## 🔧 AI Provider Configuration

### Embedding Providers (Choose One)

The application supports multiple embedding providers. Simply set the `EMBEDDING_PROVIDER` environment variable:

#### OpenAI (Default - Recommended)
```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional
```

### Vector Database (Pinecone)
```bash
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=rag-knowledge-base
PINECONE_DIMENSION=1536  # Must match your embedding model
```

## 🚀 Local Development Setup

Follow this comprehensive guide to set up the RAG Knowledge Base application on your local machine.

### Prerequisites

- **Node.js** (18.17 or later) - Use nvm to manage versions
- **Yarn** package manager
- **PostgreSQL** database
- **Git** for version control

### Step 1: Node.js Setup with NVM

```bash
# Install/use the correct Node.js version
nvm use 18.17.0  # or latest LTS

# If you don't have the version, install it
nvm install 18.17.0
nvm use 18.17.0
```

### Step 2: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd rag-app

# Install dependencies with Yarn
yarn install
```

### Step 3: Database Setup

#### Option A: Docker PostgreSQL (Recommended)
```bash
# Pull and run PostgreSQL container
docker run --name rag-pg \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=rag_app \
  -p 5432:5432 \
  -d postgres:15

# Verify container is running
docker ps
```

#### Option B: Local PostgreSQL Installation
```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb rag_app
```

### Step 4: Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your configuration:**
   ```bash
   # Required: Database
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/rag_app"
   
   # Required: Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate a secure secret
   
   # Required: AI Provider Configuration
   EMBEDDING_PROVIDER="openai"
   CHAT_PROVIDER="openai"
   OPENAI_API_KEY="sk-your-openai-api-key"
   
   # Required: Vector Database
   PINECONE_API_KEY="your-pinecone-api-key"
   PINECONE_ENVIRONMENT="your-environment"
   PINECONE_INDEX_NAME="rag-knowledge-base"
   PINECONE_DIMENSION="1536"  # Match your embedding model
   
   # Required: Company Information
   COMPANY_NAME="Your Company Name"
   COMPANY_INDUSTRY="Your Industry"
   COMPANY_EMAIL="contact@company.com"
   COMPANY_PHONE="+1-555-0123"
   ```

### Step 5: Database Schema Setup

```bash
# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Verify database setup
npx prisma studio  # Opens database browser
```

### Step 6: Pinecone Index Setup

1. **Create a Pinecone account** at [pinecone.io](https://pinecone.io)
2. **Create an index** with these settings:
   - **Name**: `rag-knowledge-base`
   - **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
   - **Metric**: `cosine`
   - **Pod Type**: `p1.x1` (starter tier)

### Step 7: Create Admin User

```bash
# Create the default admin user
yarn create-admin

# This creates:
# Email: admin@example.com
# Password: admin123
```

### Step 8: Start Development Server

```bash
# Start the development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Step 9: Verify Setup

1. **Visit the application** at `http://localhost:3000`
2. **Sign in** with admin credentials (admin@example.com / admin123)
3. **Test knowledge base** by uploading a document
4. **Test chat functionality** by asking questions

## 🔧 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth encryption secret | Generate with `openssl rand -base64 32` |
| `EMBEDDING_PROVIDER` | Embedding service | `openai`, `cohere`, or `huggingface` |
| `CHAT_PROVIDER` | Chat completion service | `openai` or `perplexity` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `PINECONE_API_KEY` | Pinecone API key | Your Pinecone key |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-east-1-aws`, etc. |
| `PINECONE_INDEX_NAME` | Pinecone index name | `rag-knowledge-base` |
| `PINECONE_DIMENSION` | Embedding dimensions | `1536` for OpenAI |
| `COMPANY_NAME` | Your company name | For company-specific queries |
| `COMPANY_INDUSTRY` | Your industry | Context for AI responses |
| `COMPANY_EMAIL` | Contact email | For contact forms |
| `COMPANY_PHONE` | Contact phone | For contact forms |

### Optional OAuth Variables

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Google Cloud Console |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | [GitHub Developer Settings](https://github.com/settings/developers) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | GitHub Developer Settings |

## 🎯 AI Provider Setup Guides

### OpenAI Setup (Recommended)
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Set `EMBEDDING_PROVIDER=openai` and `CHAT_PROVIDER=openai`
3. Add `OPENAI_API_KEY=sk-your-key`

### Alternative Providers
- **Cohere**: Set `EMBEDDING_PROVIDER=cohere` + `COHERE_API_KEY`
- **HuggingFace**: Set `EMBEDDING_PROVIDER=huggingface` + `HUGGINGFACE_API_KEY`
- **Perplexity**: Set `CHAT_PROVIDER=perplexity` + `PERPLEXITY_API_KEY`

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check if PostgreSQL is running
docker ps  # or brew services list

# Reset database if needed
npx prisma migrate reset --force
```

**Environment Variable Errors:**
```bash
# Verify .env.local exists and has all required variables
cat .env.local

# Check for missing variables
yarn dev  # Will show specific missing variables
```

**Pinecone Errors:**
- Verify index name and dimensions match your configuration
- Check API key and environment are correct
- Ensure index is created and active

**Authentication Issues:**
- Verify `NEXTAUTH_SECRET` is set and secure
- Check `NEXTAUTH_URL` matches your development URL
- For OAuth, verify callback URLs are configured

### Getting Help

1. Check the `/docs` folder for detailed guides
2. Review error messages in the terminal
3. Use `yarn test:auth` to test authentication setup
4. Use `npx prisma studio` to inspect database state

## 👤 Default Admin Credentials

**Email**: admin@example.com  
**Password**: admin123

## 📊 Available Scripts

### Development Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server on port 3000 |
| `yarn build` | Build application for production |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint code quality checks |

### Database Management

| Command | Description |
|---------|-------------|
| `npx prisma studio` | Open Prisma Studio (database browser) |
| `npx prisma migrate dev` | Apply database migrations |
| `npx prisma migrate reset` | Reset database (development only) |
| `npx prisma generate` | Generate Prisma client after schema changes |
| `npx prisma db push` | Push schema changes without migrations |

### Admin User Management

| Command | Description |
|---------|-------------|
| `yarn create-admin` | Create admin user (admin@example.com/admin123) |
| `yarn recreate-admin` | Delete and recreate admin user |
| `yarn delete-admin` | Delete admin user |

### Testing & Development Tools

| Command | Description |
|---------|-------------|
| `yarn test:auth` | Test authentication configuration |
| `yarn test:knowledge-base` | Test knowledge base functionality |
| `yarn fetch:openai-models` | Fetch available OpenAI models |

### Docker Database Commands

| Command | Description |
|---------|-------------|
| `docker ps` | View running containers |
| `docker stop rag-pg` | Stop PostgreSQL container |
| `docker start rag-pg` | Start PostgreSQL container |
| `docker logs rag-pg` | View container logs |

## 🏗️ Architecture & Recent Optimizations

### Core Architecture
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes with optimized request handling
- **Database**: PostgreSQL with Prisma ORM and performance indexes
- **Vector Store**: Pinecone with intelligent chunking and retrieval
- **Authentication**: NextAuth.js with multiple OAuth providers
- **AI Framework**: LangChain with modular RAG implementation

For detailed system architecture, design decisions, and component interactions, see [**Project Architecture**](project-architecture.md).

### Recent Performance Optimizations (Phase 4)

**Modular Conversational RAG Service:**
- ✅ Refactored from monolithic 596-line service to modular 164-line architecture
- ✅ Separated concerns: error handling, message utilities, RAG handlers
- ✅ Improved maintainability and testability with dedicated managers
- ✅ Centralized constants and enhanced markdown processing

**Database Performance:**
- ✅ Added strategic indexes for user queries, document searches, and conversations
- ✅ Optimized query patterns and reduced database round trips
- ✅ Implemented intelligent caching strategies

**UI/UX Enhancements:**
- ✅ Modern chat interface with real-time streaming
- ✅ Enhanced admin knowledge base with search, filter, and sort
- ✅ Responsive design with accessibility improvements
- ✅ Custom markdown rendering with syntax highlighting

### Modular RAG Components

```
src/lib/
├── conversationalRAG.ts          # Central export
├── errors/
│   └── ConversationalRAGErrors.ts # Typed error handling
├── constants/
│   └── conversationalRAG.ts      # Centralized configuration
├── utils/
│   ├── MarkdownProcessor.ts      # Markdown formatting
│   └── MessageUtils.ts           # Message utilities
├── handlers/
│   ├── CompanyInfoHandler.ts     # Company queries
│   └── RAGHandler.ts             # RAG retrieval logic
└── managers/
    └── ConversationManager.ts    # Conversation lifecycle
```

## � Production Deployment

### Environment Setup

1. **Copy environment variables to production:**
   ```bash
   # Use .env for production (not .env.local)
   cp .env.example .env
   # Fill in production values
   ```

2. **Generate secure secrets:**
   ```bash
   # Strong NextAuth secret
   openssl rand -base64 32
   
   # Strong database passwords
   openssl rand -base64 24
   ```

3. **Database setup:**
   ```bash
   # Run migrations in production
   npx prisma migrate deploy
   
   # Generate Prisma client
   npx prisma generate
   ```

### Security Checklist

- ✅ Use strong, unique secrets for `NEXTAUTH_SECRET`
- ✅ Secure database with strong passwords and restricted access
- ✅ Use environment variables for all sensitive configuration
- ✅ Enable HTTPS in production
- ✅ Configure proper CORS settings
- ✅ Implement rate limiting for API endpoints
- ✅ Regular security updates for dependencies

### Performance Considerations

- ✅ Database connection pooling configured
- ✅ Vector store optimization for production load
- ✅ Caching strategies for frequent queries
- ✅ API response time monitoring
- ✅ Error tracking and logging

## 🔄 Switching AI Providers

The application supports multiple AI providers with zero code changes:

### Embedding Providers
```bash
# OpenAI (Recommended)
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-your-key

# Cohere
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=your-cohere-key

# HuggingFace
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf-your-token  # Optional for public models
```

### Chat Providers
```bash
# OpenAI
CHAT_PROVIDER=openai
OPENAI_API_KEY=sk-your-key

# Perplexity
CHAT_PROVIDER=perplexity
PERPLEXITY_API_KEY=pplx-your-key
```

**Important**: When switching embedding providers, ensure your Pinecone index dimensions match the new model's output dimensions.

## 📚 Documentation & Resources

### Project Documentation
- [**Project Architecture**](project-architecture.md) - Detailed system architecture and design decisions
- [**RAG Service Optimization**](docs/milestone-3.2-enhanced-chat-completion.md) - Recent performance improvements
- [**Performance Optimization Summary**](docs/performance-optimization-summary.md) - Database and query optimizations
- [**OAuth Troubleshooting**](docs/oauth-troubleshooting-guide.md) - Authentication setup guide
- [**Testing Guide**](TESTING.md) - Comprehensive testing documentation

### Key Features Documentation
- [**Chat Response Enhancement**](docs/chat-response-enhancement.md) - Modern chat interface features
- [**Document Deletion**](docs/document-deletion.md) - Knowledge base management
- [**Provider Configuration**](docs/provider-configuration.md) - AI provider setup guide
- [**Perplexity Integration**](docs/perplexity-integration.md) - Alternative chat provider setup

### Development Resources
- [**Scripts README**](scripts/README.md) - Available development and testing scripts
- [**Vector Store Analysis**](vectorstore-usage-analysis.md) - Vector database optimization insights
- [**Project Completion Summary**](docs/project-completion-summary.md) - Full project overview

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [LangChain Documentation](https://js.langchain.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [NextAuth.js Documentation](https://next-auth.js.org)

---

**Built with ❤️ using Next.js, TypeScript, LangChain, and modern web technologies.**