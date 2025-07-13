# Scripts Directory

This directory contains essential utility and testing scripts for the RAG application.

## 🧪 Core Testing Scripts

| Script | Purpose | Command | Description |
|--------|---------|---------|-------------|
| `test-calculator-tools.ts` | Agent tools testing | `npx tsx scripts/test-calculator-tools.ts` | Tests all agent tools (calculators, contact, subscribe, knowledge base) |
| `test-auth-consolidated.ts` | Authentication testing | `npx tsx scripts/test-auth-consolidated.ts` | Complete authentication system testing (OAuth, credentials, user creation) |
| `test-ingestion-debug.ts` | Ingestion pipeline | `npx tsx scripts/test-ingestion-debug.ts` | Tests complete document ingestion pipeline (URLs, content processing, vector storage) |
| `test-knowledge-base.ts` | Knowledge base service | `npx tsx scripts/test-knowledge-base.ts` | Core knowledge base service functionality testing |

## 👥 Admin Management Scripts

| Script | Purpose | Command | Description |
|--------|---------|---------|-------------|
| `create-admin.ts` | Create admin user | `npx tsx scripts/create-admin.ts` | Creates admin user with email/password |
| `delete-admin.ts` | Delete admin user | `npx tsx scripts/delete-admin.ts` | Removes admin user |
| `recreate-admin.ts` | Recreate admin user | `npx tsx scripts/recreate-admin.ts` | Recreates admin user (delete + create) |

## 🛠️ Utility Scripts

| Script | Purpose | Command | Description |
|--------|---------|---------|-------------|
| `fetch-openai-models.ts` | Model discovery | `npx tsx scripts/fetch-openai-models.ts` | Discovers available OpenAI models |
| `models-util.ts` | Model utilities | - | OpenAI model utilities and helpers |

## 🚀 Quick Start Testing

```bash
# Test core functionality
npx tsx scripts/test-calculator-tools.ts    # Test all agent tools
npx tsx scripts/test-ingestion-debug.ts     # Test ingestion pipeline  
npx tsx scripts/test-knowledge-base.ts      # Test knowledge base
npx tsx scripts/test-auth-consolidated.ts   # Test authentication

# Admin user management
npx tsx scripts/create-admin.ts            # Create admin
npx tsx scripts/recreate-admin.ts          # Recreate admin (if needed)

# Utilities
npx tsx scripts/fetch-openai-models.ts     # Check available models
```

## 📋 Requirements

All scripts require:
- `.env.local` file with proper API keys
- Running PostgreSQL database  
- Active Pinecone index

## 📝 Notes

- Most scripts validate environment variables and provide helpful error messages
- Admin scripts are interactive and will prompt for input
- Testing scripts may create/cleanup test data automatically
- Scripts are designed to be run independently and in any order
- For development testing, also use the live chat interface and admin panel