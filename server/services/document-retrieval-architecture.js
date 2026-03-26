/**
 * COMPANY DOCUMENT KNOWLEDGE BASE ARCHITECTURE
 * 
 * System for indexing company documents and making them searchable for Copilot
 */

// ============================================================================
// DOCUMENT STORAGE & PROCESSING PIPELINE
// ============================================================================

const documentProcessingPipeline = {
  
  // Step 1: Upload & Store
  upload: {
    endpoint: 'POST /api/companies/:companyId/documents',
    accepts: ['.pdf', '.docx', '.txt', '.md'],
    maxSize: '50MB',
    storage: 's3://company-documents/{companyId}/{documentId}.{ext}',
    metadata: {
      id: 'uuid',
      companyId: 'string',
      name: 'string',
      category: 'BRAND | HANDBOOK | POLICIES | PRODUCT | SALES | TRAINING | OTHER',
      uploadedBy: 'userId',
      uploadedAt: 'timestamp',
      size: 'bytes',
      status: 'UPLOADED | PROCESSING | INDEXED | FAILED'
    }
  },

  // Step 2: Extract Text
  extraction: {
    trigger: 'On document upload',
    tools: {
      pdf: 'PyPDF2 or pdfplumber (preserves page numbers)',
      docx: 'python-docx (preserves structure)',
      txt: 'direct read',
      md: 'markdown parser'
    },
    output: {
      fullText: 'string',
      pages: [
        {
          pageNumber: 1,
          text: 'string',
          headings: ['string'],
          images: ['base64 or url']
        }
      ]
    }
  },

  // Step 3: Chunk for Semantic Search
  chunking: {
    strategy: 'Smart chunking with overlap',
    chunkSize: 500, // tokens
    overlap: 50, // tokens overlap between chunks
    rules: {
      preserveContext: true, // Don't split mid-sentence or mid-paragraph
      includeHeadings: true, // Prepend section headings to chunks
      respectPageBoundaries: false // Can chunk across pages if semantically cohesive
    },
    example: {
      input: "Page 23 content...",
      chunks: [
        {
          id: 'chunk_1',
          documentId: 'doc_123',
          documentName: 'Employee Handbook v3.2.pdf',
          pageNumber: 23,
          text: 'Annual Leave: All employees receive 25 days of paid annual leave...',
          heading: 'Benefits > Time Off',
          tokenCount: 487
        },
        {
          id: 'chunk_2',
          documentId: 'doc_123',
          documentName: 'Employee Handbook v3.2.pdf',
          pageNumber: 23,
          text: '...leave plus UK bank holidays (8 days), for a total of 33 days off per year...',
          heading: 'Benefits > Time Off',
          tokenCount: 502
        }
      ]
    }
  },

  // Step 4: Generate Embeddings
  embedding: {
    model: 'text-embedding-3-small', // OpenAI
    // OR: 'sentence-transformers/all-MiniLM-L6-v2' for open-source
    dimensions: 1536,
    process: async (chunk) => {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.text
      });
      return embedding.data[0].embedding; // [0.123, -0.456, ...]
    }
  },

  // Step 5: Store in Vector Database
  vectorStore: {
    database: 'Pinecone, Weaviate, or PostgreSQL with pgvector',
    schema: {
      id: 'chunk_id',
      vector: '[float array]',
      metadata: {
        documentId: 'string',
        documentName: 'string',
        companyId: 'string',
        category: 'string',
        pageNumber: 'int',
        heading: 'string',
        text: 'string (stored for retrieval)',
        uploadedAt: 'timestamp'
      }
    },
    index: 'CREATE INDEX ON chunks (companyId, category)',
    example: {
      upsert: {
        id: 'chunk_abc123',
        values: [0.123, -0.456, /* ...1536 dimensions */],
        metadata: {
          documentId: 'doc_123',
          documentName: 'Employee Handbook v3.2.pdf',
          companyId: 'company_talentos',
          category: 'HANDBOOK',
          pageNumber: 23,
          heading: 'Benefits > Time Off',
          text: 'Annual Leave: All employees receive 25 days...',
          uploadedAt: '2024-03-15T10:30:00Z'
        }
      }
    }
  }
};

// ============================================================================
// COPILOT RETRIEVAL SYSTEM
// ============================================================================

const copilotRetrieval = {
  
  // When copilot receives a user query
  retrievalFlow: async (userQuery, context) => {
    
    // 1. Generate query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userQuery
    });

    // 2. Semantic search in vector DB
    const searchResults = await vectorDB.query({
      vector: queryEmbedding.data[0].embedding,
      filter: {
        companyId: context.companyId,
        // Optional category filter based on query intent
        // category: { $in: ['HANDBOOK', 'BRAND'] }
      },
      topK: 5, // Return top 5 most relevant chunks
      includeMetadata: true
    });

    // 3. Format results for LLM context
    const documentContext = searchResults.matches.map(match => ({
      document: match.metadata.documentName,
      page: match.metadata.pageNumber,
      heading: match.metadata.heading,
      excerpt: match.metadata.text,
      relevance: match.score // 0-1 similarity score
    }));

    // 4. Build enhanced system prompt
    const systemPrompt = buildSystemPromptWithDocs(
      context.companyProfile,
      documentContext
    );

    // 5. Call LLM with context
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userQuery }
      ]
    });

    return {
      content: response.content[0].text,
      documentRefs: documentContext
    };
  }
};

// ============================================================================
// SYSTEM PROMPT CONSTRUCTION
// ============================================================================

const buildSystemPromptWithDocs = (companyProfile, documentContext) => {
  return `You are Vercentic Copilot, helping with recruitment for ${companyProfile.name}.

COMPANY PROFILE:
${JSON.stringify(companyProfile, null, 2)}

RELEVANT DOCUMENT EXCERPTS:
${documentContext.map((doc, idx) => `
[${idx + 1}] From "${doc.document}" (Page ${doc.page}):
${doc.heading ? `Section: ${doc.heading}` : ''}
"${doc.excerpt}"
`).join('\n')}

INSTRUCTIONS:
- Use the document excerpts above as your primary source of truth
- When referencing information from documents, cite the document name and page
- Prefer specific details from documents over general knowledge
- If documents contradict the company profile, trust the documents
- Format document citations naturally, e.g.: "According to the Employee Handbook (page 23)..."

RESPONSE GUIDELINES:
- Be conversational and helpful
- Use ${companyProfile.brand.voiceTone} tone
- Cite sources for factual claims
- If you don't have relevant document context, say so`;
};

// ============================================================================
// EXAMPLE API IMPLEMENTATION
// ============================================================================

// Express route for copilot chat
app.post('/api/copilot/chat', async (req, res) => {
  const { companyId, jobId, message, conversationHistory } = req.body;

  try {
    // 1. Load company profile
    const companyProfile = await db.companies.findById(companyId);

    // 2. Search documents
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message
    });

    const documentResults = await pinecone.query({
      vector: queryEmbedding.data[0].embedding,
      filter: { companyId },
      topK: 5,
      includeMetadata: true
    });

    // 3. Build context
    const documentContext = documentResults.matches.map(m => ({
      document: m.metadata.documentName,
      page: m.metadata.pageNumber,
      excerpt: m.metadata.text,
      relevance: m.score
    }));

    // 4. Generate response
    const systemPrompt = buildSystemPromptWithDocs(companyProfile, documentContext);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    });

    // 5. Return response + document references
    res.json({
      content: response.content[0].text,
      documentRefs: documentContext.filter(d => d.relevance > 0.7), // Only high-relevance refs
      usage: response.usage
    });

  } catch (error) {
    console.error('Copilot error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// ============================================================================
// DOCUMENT INDEXING WORKFLOW
// ============================================================================

const indexDocument = async (documentId) => {
  // 1. Fetch document from S3
  const document = await s3.getObject({
    Bucket: 'company-documents',
    Key: documentKey
  });

  // 2. Extract text based on file type
  let pages;
  if (document.type === 'pdf') {
    pages = await extractPDFPages(document.buffer);
  } else if (document.type === 'docx') {
    pages = await extractDocxPages(document.buffer);
  }

  // 3. Chunk text
  const chunks = [];
  for (const page of pages) {
    const pageChunks = chunkText(page.text, {
      chunkSize: 500,
      overlap: 50,
      preserveContext: true
    });
    
    pageChunks.forEach((chunk, idx) => {
      chunks.push({
        id: `${documentId}_page${page.number}_chunk${idx}`,
        documentId,
        pageNumber: page.number,
        text: chunk,
        heading: page.heading
      });
    });
  }

  // 4. Generate embeddings (batch for efficiency)
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map(c => c.text)
  });

  // 5. Upsert to vector DB
  const vectors = chunks.map((chunk, idx) => ({
    id: chunk.id,
    values: embeddings.data[idx].embedding,
    metadata: {
      documentId: chunk.documentId,
      documentName: document.name,
      companyId: document.companyId,
      category: document.category,
      pageNumber: chunk.pageNumber,
      heading: chunk.heading,
      text: chunk.text,
      uploadedAt: document.uploadedAt
    }
  }));

  await pinecone.upsert({ vectors });

  // 6. Update document status
  await db.documents.update(documentId, {
    status: 'INDEXED',
    pageCount: pages.length,
    chunkCount: chunks.length,
    indexedAt: new Date()
  });
};

// ============================================================================
// SMART CHUNKING IMPLEMENTATION
// ============================================================================

const chunkText = (text, options) => {
  const { chunkSize, overlap, preserveContext } = options;
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const chunks = [];
  let currentChunk = [];
  let currentTokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
      // Chunk is full, save it
      chunks.push(currentChunk.join(' '));
      
      // Start new chunk with overlap
      if (overlap > 0) {
        // Keep last few sentences for context
        const overlapSentences = [];
        let overlapTokens = 0;
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const s = currentChunk[i];
          const tokens = estimateTokens(s);
          if (overlapTokens + tokens <= overlap) {
            overlapSentences.unshift(s);
            overlapTokens += tokens;
          } else {
            break;
          }
        }
        currentChunk = overlapSentences;
        currentTokenCount = overlapTokens;
      } else {
        currentChunk = [];
        currentTokenCount = 0;
      }
    }
    
    currentChunk.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
};

const estimateTokens = (text) => {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
};

// ============================================================================
// USAGE TRACKING & ANALYTICS
// ============================================================================

const trackDocumentUsage = async (companyId, documentId, queryType) => {
  await db.documentUsage.create({
    companyId,
    documentId,
    queryType,
    timestamp: new Date()
  });

  // Update last accessed
  await db.documents.update(documentId, {
    lastAccessed: new Date()
  });
};

// Analytics query: Most referenced documents
const getMostReferencedDocs = async (companyId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return db.documentUsage.aggregate([
    {
      $match: {
        companyId,
        timestamp: { $gte: cutoff }
      }
    },
    {
      $group: {
        _id: '$documentId',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);
};

module.exports = {
  documentProcessingPipeline,
  copilotRetrieval,
  buildSystemPromptWithDocs,
  indexDocument,
  chunkText,
  trackDocumentUsage,
  getMostReferencedDocs
};
