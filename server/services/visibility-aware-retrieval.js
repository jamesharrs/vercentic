/**
 * DOCUMENT VISIBILITY & COPILOT CONTEXT FILTERING
 * 
 * System for enforcing document visibility rules based on copilot context
 */

// ============================================================================
// COPILOT CONTEXTS
// ============================================================================

const COPILOT_CONTEXTS = {
  INTERNAL: {
    id: 'internal',
    name: 'Internal Copilot',
    description: 'For employees managing recruitment',
    allowedVisibility: ['internal', 'candidate', 'public'],
    capabilities: [
      'Access all company documents',
      'View salary bands and compensation data',
      'Reference interview scoring guides',
      'Access internal policies'
    ]
  },
  CANDIDATE_PORTAL: {
    id: 'candidate_portal',
    name: 'Candidate Portal Copilot',
    description: 'For candidates applying to roles',
    allowedVisibility: ['candidate', 'public'],
    capabilities: [
      'Answer questions about benefits',
      'Explain company culture',
      'Describe interview process (high-level)',
      'Share team structure'
    ],
    restrictions: [
      'Cannot access salary bands',
      'Cannot see interview scoring criteria',
      'Cannot view internal policies',
      'Cannot access employee-only content'
    ]
  },
  PUBLIC_WEBSITE: {
    id: 'public_website',
    name: 'Public Website',
    description: 'For public-facing content',
    allowedVisibility: ['public'],
    capabilities: [
      'General company information',
      'Public press releases',
      'Marketing materials'
    ]
  }
};

// ============================================================================
// VISIBILITY-AWARE DOCUMENT SEARCH
// ============================================================================

const searchDocumentsWithVisibility = async (query, context) => {
  const { companyId, copilotContext, userId } = context;

  // 1. Determine allowed visibility levels based on context
  const allowedVisibility = COPILOT_CONTEXTS[copilotContext].allowedVisibility;

  // 2. Generate query embedding
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });

  // 3. Search with visibility filter
  const searchResults = await vectorDB.query({
    vector: queryEmbedding.data[0].embedding,
    filter: {
      companyId: companyId,
      visibility: { $in: allowedVisibility } // CRITICAL: Filter by visibility
    },
    topK: 5,
    includeMetadata: true
  });

  // 4. Additional safety check: filter results again
  const filteredResults = searchResults.matches.filter(match => 
    allowedVisibility.includes(match.metadata.visibility)
  );

  // 5. Format results
  return filteredResults.map(match => ({
    document: match.metadata.documentName,
    page: match.metadata.pageNumber,
    excerpt: match.metadata.text,
    visibility: match.metadata.visibility,
    relevance: match.score
  }));
};

// ============================================================================
// CONTEXT-AWARE SYSTEM PROMPT
// ============================================================================

const buildContextAwarePrompt = (companyProfile, documentContext, copilotContext) => {
  const context = COPILOT_CONTEXTS[copilotContext];

  let systemPrompt = `You are Vercentic ${context.name}, helping with ${context.description}.

COMPANY: ${companyProfile.name}

AVAILABLE CAPABILITIES:
${context.capabilities.map(c => `- ${c}`).join('\n')}
`;

  if (context.restrictions) {
    systemPrompt += `
IMPORTANT RESTRICTIONS:
${context.restrictions.map(r => `- ${r}`).join('\n')}
`;
  }

  if (documentContext.length > 0) {
    systemPrompt += `
RELEVANT DOCUMENT EXCERPTS (${context.name} has access to):
${documentContext.map((doc, idx) => `
[${idx + 1}] From "${doc.document}" (Page ${doc.page}) [${doc.visibility.toUpperCase()}]
"${doc.excerpt}"
`).join('\n')}
`;
  }

  // Add context-specific guidelines
  if (copilotContext === 'CANDIDATE_PORTAL') {
    systemPrompt += `
CANDIDATE COMMUNICATION GUIDELINES:
- Be welcoming and transparent about the process
- Focus on culture, benefits, and what makes working here great
- If asked about salary, reference general ranges from public documents only
- If asked about internal processes you don't have access to, politely explain you can connect them with the team
- Never mention that you're restricted from certain information - frame it positively
- Example: Instead of "I can't access salary bands", say "For specific compensation details, your recruiter will discuss that in your next call"
`;
  } else if (copilotContext === 'INTERNAL') {
    systemPrompt += `
INTERNAL TEAM GUIDELINES:
- You have full access to all company documents including sensitive data
- Be precise and reference specific page numbers when citing policies
- Include salary bands, scoring criteria, and internal guidance when relevant
- Help with confidential tasks like offer letter creation and compensation analysis
`;
  }

  return systemPrompt;
};

// ============================================================================
// API ENDPOINT WITH CONTEXT VALIDATION
// ============================================================================

// Internal copilot endpoint (for employees)
app.post('/api/copilot/internal/chat', authenticateUser, async (req, res) => {
  const { companyId, message, conversationHistory } = req.body;
  const userId = req.user.id;

  // Verify user has access to this company
  const hasAccess = await verifyEmployeeAccess(userId, companyId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Search documents with INTERNAL context
    const documentContext = await searchDocumentsWithVisibility(message, {
      companyId,
      copilotContext: 'INTERNAL',
      userId
    });

    const companyProfile = await db.companies.findById(companyId);
    const systemPrompt = buildContextAwarePrompt(
      companyProfile,
      documentContext,
      'INTERNAL'
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    });

    res.json({
      content: response.content[0].text,
      documentRefs: documentContext,
      context: 'INTERNAL'
    });

  } catch (error) {
    console.error('Internal copilot error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Candidate portal copilot endpoint
app.post('/api/copilot/candidate-portal/chat', authenticateCandidate, async (req, res) => {
  const { companyId, jobId, message, conversationHistory } = req.body;
  const candidateId = req.candidate.id;

  // Verify candidate is actually applying to this job
  const hasAccess = await verifyCandidateJobAccess(candidateId, jobId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Search documents with CANDIDATE_PORTAL context (restricted visibility)
    const documentContext = await searchDocumentsWithVisibility(message, {
      companyId,
      copilotContext: 'CANDIDATE_PORTAL',
      userId: candidateId
    });

    const companyProfile = await db.companies.findById(companyId);
    const systemPrompt = buildContextAwarePrompt(
      companyProfile,
      documentContext,
      'CANDIDATE_PORTAL'
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    });

    // Log candidate copilot usage for analytics
    await logCandidateInteraction(candidateId, jobId, message, response);

    res.json({
      content: response.content[0].text,
      documentRefs: documentContext.map(d => ({
        // Remove internal metadata from candidate view
        document: d.document,
        excerpt: d.excerpt
        // Note: No page numbers or visibility info exposed to candidates
      })),
      context: 'CANDIDATE_PORTAL'
    });

  } catch (error) {
    console.error('Candidate copilot error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// ============================================================================
// EXAMPLE FILTERED RESPONSES
// ============================================================================

const exampleScenarios = {
  
  // Scenario 1: Candidate asks about salary
  candidateSalaryQuestion: {
    query: "What's the salary range for this role?",
    context: 'CANDIDATE_PORTAL',
    
    internalDocumentsFound: [
      {
        document: 'Compensation Philosophy & Bands.xlsx',
        visibility: 'internal',
        excerpt: 'Engineering Manager L3: £90k-£120k base + 0.1-0.25% equity'
      }
    ],
    
    candidateDocumentsFound: [
      {
        document: 'Benefits Overview for Candidates.pdf',
        visibility: 'candidate',
        excerpt: 'We offer competitive, market-leading salaries benchmarked against London tech companies, plus equity participation.'
      }
    ],
    
    // Candidate copilot only sees the candidate-safe doc
    copilotResponse: `We offer competitive, market-leading salaries that are benchmarked against London tech companies. All roles include equity participation as well.

Your recruiter will discuss the specific compensation range for this Engineering Manager position during your initial screening call. They'll work with you to understand your expectations and ensure we're aligned.

Is there anything else about our benefits or culture you'd like to know?`,
    
    // Internal copilot sees everything
    internalCopilotResponse: `Based on our Compensation Philosophy & Bands document:

Engineering Manager L3: £90k-£120k base + 0.1-0.25% equity

This is benchmarked against London tech companies and includes:
- Performance bonus (up to 15% of base)
- Annual equity refresh grants
- Pension matching up to 5%

The exact offer will depend on the candidate's experience level and our leveling assessment.`
  },

  // Scenario 2: Candidate asks about interview process
  candidateInterviewQuestion: {
    query: "What's your interview process like?",
    context: 'CANDIDATE_PORTAL',
    
    internalDocumentsFound: [
      {
        document: 'Engineering Interview Guide.pdf',
        visibility: 'internal',
        excerpt: 'Technical assessment scoring: 1-5 scale on code quality, architecture, communication. Candidates scoring <3 in any area are rejected.'
      }
    ],
    
    candidateDocumentsFound: [
      {
        document: 'Benefits Overview for Candidates.pdf',
        visibility: 'candidate',
        excerpt: 'Our interview process typically takes 2-3 weeks and includes: initial screen, hiring manager interview, technical assessment (take-home project), team interview, and final interview with leadership.'
      }
    ],
    
    copilotResponse: `Our interview process is designed to be thorough but respectful of your time. Here's what to expect:

**Timeline:** 2-3 weeks from start to finish

**Stages:**
1. **Initial Screen** (30 mins) - Get to know each other and discuss the role
2. **Hiring Manager Interview** (60 mins) - Deep dive into your experience
3. **Technical Assessment** - Take-home project (you'll have 48 hours to complete it)
4. **Team Interview** (60 mins) - Meet potential teammates
5. **Final Interview** (45 mins) - Chat with leadership about vision and fit

We provide detailed feedback after each stage, usually within 48 hours. The technical assessment is a real-world problem similar to what you'd work on, not whiteboard coding.

Any specific questions about a particular stage?`
  },

  // Scenario 3: Internal team asks for interview scoring guide
  internalScoringQuestion: {
    query: "What's our scoring criteria for technical assessments?",
    context: 'INTERNAL',
    
    documentsFound: [
      {
        document: 'Engineering Interview Guide.pdf',
        visibility: 'internal',
        excerpt: 'Technical assessment scoring: 1-5 scale on three dimensions: (1) Code Quality - clean, maintainable, follows best practices; (2) Architecture - appropriate patterns, scalable design; (3) Communication - clear README, explains decisions. Candidates scoring <3 in any area are rejected.'
      }
    ],
    
    copilotResponse: `From our Engineering Interview Guide (page 7):

**Technical Assessment Scoring (1-5 scale):**

**1. Code Quality**
- Clean, readable, maintainable code
- Follows language best practices
- Appropriate abstractions

**2. Architecture**
- Uses appropriate design patterns
- Scalable and extensible
- Shows systems thinking

**3. Communication**
- Clear README with setup instructions
- Explains technical decisions
- Documents trade-offs

**Scoring Threshold:** Candidates must score 3+ in all dimensions to proceed. Any score below 3 is an automatic reject.

**Pro tip:** When debriefing candidates, focus feedback on the dimension(s) where they scored lowest.`
  }
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

const logDocumentAccess = async (context) => {
  await db.auditLog.create({
    timestamp: new Date(),
    copilotContext: context.copilotContext,
    userId: context.userId,
    companyId: context.companyId,
    query: context.query,
    documentsAccessed: context.documentsAccessed.map(d => ({
      documentId: d.id,
      documentName: d.name,
      visibility: d.visibility,
      pageAccessed: d.page
    })),
    resultReturned: true
  });
};

// Query: Which internal documents have candidates tried to access?
const getBlockedAccessAttempts = async (companyId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return db.auditLog.aggregate([
    {
      $match: {
        companyId,
        copilotContext: 'CANDIDATE_PORTAL',
        timestamp: { $gte: cutoff }
      }
    },
    {
      // Find queries where internal docs matched but weren't returned
      $lookup: {
        from: 'vectorSearchLogs',
        localField: '_id',
        foreignField: 'auditLogId',
        as: 'searchResults'
      }
    },
    {
      $project: {
        query: 1,
        internalDocsFound: {
          $filter: {
            input: '$searchResults',
            as: 'result',
            cond: { $eq: ['$$result.visibility', 'internal'] }
          }
        }
      }
    },
    {
      $match: {
        'internalDocsFound.0': { $exists: true }
      }
    }
  ]);
};

module.exports = {
  COPILOT_CONTEXTS,
  searchDocumentsWithVisibility,
  buildContextAwarePrompt,
  exampleScenarios,
  logDocumentAccess,
  getBlockedAccessAttempts
};
