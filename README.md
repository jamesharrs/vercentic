# Vercentic Components

React components for Vercentic recruitment platform with company context-aware copilot system.

## Components

### Jobs Management
- **jobs-table.jsx** - Jobs list with filterable column headers
- **JobFilters.jsx** - Advanced filter component
- **JobsTable.jsx** / **JobsTableWithFilters.jsx** - Full jobs table implementations

### Company Knowledge Base
- **CompanyDocumentManager.jsx** - Document upload and indexing interface
- **DocumentVisibilityManager.jsx** - Document visibility management (Internal/Candidate/Public)
- **CompanySettings.jsx** - Unified company profile and document settings

### Copilot System
- **CopilotWithDocuments.jsx** - Copilot with document search and citations
- **CopilotWithCompanyContext.jsx** - Context-aware copilot interface
- **CopilotVisibilityDemo.jsx** - Demo showing internal vs candidate portal copilot

### Backend Architecture
- **company-context-system.js** - Company profile structure and copilot prompt generation
- **document-retrieval-architecture.js** - Document processing, chunking, and vector search
- **visibility-aware-retrieval.js** - Document visibility filtering and context-aware retrieval

## Features

### Document Visibility Control
- **Internal Only** - Salary bands, interview scoring, internal policies
- **Candidate-Safe** - Benefits overview, culture docs, process overview  
- **Public** - Press releases, public brand materials

### Company Context System
- Structured company profile (brand voice, EVP, values, benefits)
- Uploaded document knowledge base with semantic search
- Context injection into copilot system prompts
- Automatic document chunking and embedding generation

### Copilot Capabilities
- Write job descriptions in company voice
- Answer candidate questions about benefits and culture
- Reference specific documents with page citations
- Different access levels for internal vs candidate-facing copilot

## Tech Stack
- React with Tailwind CSS (inline styles for portability)
- Vector search (Pinecone/pgvector compatible)
- OpenAI embeddings (text-embedding-3-small)
- Anthropic Claude for copilot responses

## Usage

Each component is self-contained and can be integrated into the Vercentic platform independently.

See individual component files for detailed implementation notes and usage examples.
