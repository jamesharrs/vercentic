import React, { useState, useEffect, useRef } from 'react';
import { FileText, Search, ExternalLink, Book } from 'lucide-react';

// Mock document search results
const searchDocuments = (query) => {
  const mockResults = {
    'brand': [
      {
        document: 'Talentos Brand Guidelines 2024.pdf',
        page: 8,
        excerpt: 'Our voice is professional yet approachable. We use data to inform decisions but never lose sight of the human element. Avoid corporate jargon and speak directly to candidates as if having a conversation with a colleague.',
        relevance: 0.94
      },
      {
        document: 'Talentos Brand Guidelines 2024.pdf',
        page: 12,
        excerpt: 'When writing job descriptions, lead with impact. Start with what the role achieves, not just what it does. Use active voice and "you" language to make it personal.',
        relevance: 0.89
      }
    ],
    'benefits': [
      {
        document: 'Employee Handbook v3.2.pdf',
        page: 23,
        excerpt: 'Annual Leave: All employees receive 25 days of paid annual leave plus UK bank holidays (8 days), for a total of 33 days off per year. Unused days can be carried over up to 5 days into the next calendar year.',
        relevance: 0.96
      },
      {
        document: 'Employee Handbook v3.2.pdf',
        page: 24,
        excerpt: 'Learning & Development Budget: Each employee has an annual L&D budget of £1,500 to spend on courses, conferences, certifications, or books. Approval required for expenses over £500.',
        relevance: 0.93
      },
      {
        document: 'Employee Handbook v3.2.pdf',
        page: 28,
        excerpt: 'Parental Leave: Primary caregivers receive 6 months fully paid leave, secondary caregivers receive 2 months. This applies regardless of gender or how you became a parent (birth, adoption, surrogacy).',
        relevance: 0.91
      }
    ],
    'interview': [
      {
        document: 'Engineering Interview Guide.pdf',
        page: 5,
        excerpt: 'Stage 3: Technical Assessment - We use a take-home project approach rather than live coding. Candidates have 48 hours to complete a real-world problem similar to what they\'d work on. We\'re evaluating code quality, architecture decisions, and how they communicate their approach.',
        relevance: 0.95
      },
      {
        document: 'Engineering Interview Guide.pdf',
        page: 7,
        excerpt: 'When evaluating candidates against our "Ownership" value, look for examples where they took initiative beyond their job description, made decisions with incomplete information, or fixed something broken without being asked.',
        relevance: 0.88
      }
    ],
    'culture': [
      {
        document: 'Employee Handbook v3.2.pdf',
        page: 4,
        excerpt: 'Our four core values: Customer Obsession (start with the customer and work backwards), Ownership (act like an owner, think long-term), Bias for Action (speed matters, make decisions quickly), Learn and Be Curious (never done learning).',
        relevance: 0.97
      }
    ]
  };

  // Determine which category to return based on query
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('brand') || lowerQuery.includes('voice') || lowerQuery.includes('tone') || lowerQuery.includes('write')) {
    return mockResults.brand;
  }
  if (lowerQuery.includes('benefit') || lowerQuery.includes('leave') || lowerQuery.includes('pto') || lowerQuery.includes('l&d')) {
    return mockResults.benefits;
  }
  if (lowerQuery.includes('interview') || lowerQuery.includes('assessment') || lowerQuery.includes('technical')) {
    return mockResults.interview;
  }
  if (lowerQuery.includes('culture') || lowerQuery.includes('value')) {
    return mockResults.culture;
  }
  
  return [];
};

const DocumentReference = ({ doc, excerpt, page, onView }) => (
  <div style={{
    marginTop: '12px',
    padding: '12px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px'
  }}>
    <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
      <FileText size={16} style={{ color: '#667eea', flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
          {doc}
        </div>
        <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>
          Page {page}
        </div>
        <div style={{ 
          color: '#4b5563', 
          lineHeight: '1.6',
          borderLeft: '3px solid #667eea',
          paddingLeft: '12px',
          fontStyle: 'italic'
        }}>
          "{excerpt}"
        </div>
      </div>
      <button
        onClick={onView}
        style={{
          padding: '6px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#667eea'
        }}
        title="View in document"
      >
        <ExternalLink size={14} />
      </button>
    </div>
  </div>
);

const CopilotWithDocuments = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentDocRefs, setCurrentDocRefs] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Hi! I\'m Copilot for the **Engineering Manager** role at **Talentos**. I have access to your company profile and all uploaded documents. What would you like help with?',
      documentRefs: []
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Show searching state
    setIsSearching(true);
    
    setTimeout(() => {
      // Search documents
      const docResults = searchDocuments(input);
      setCurrentDocRefs(docResults);

      // Generate response using document context
      const response = generateResponseWithDocs(input, docResults);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        documentRefs: docResults
      }]);
      
      setIsSearching(false);
    }, 1200);

    setInput('');
  };

  const generateResponseWithDocs = (query, docRefs) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('brand') || lowerQuery.includes('write') || lowerQuery.includes('jd') || lowerQuery.includes('job description')) {
      if (docRefs.length > 0) {
        return `I've checked our Brand Guidelines. Here's how to write job descriptions in Talentos' voice:

**Tone & Voice:**
According to our Brand Guidelines (page 8), we should be "professional yet approachable" and use data to inform decisions without losing the human element. Avoid corporate jargon and speak directly to candidates.

**Structure (from page 12):**
- Lead with impact, not just tasks
- Use active voice and "you" language
- Make it personal and conversational

For example, instead of "The successful candidate will be responsible for managing...", write "You'll lead a team of 6-8 engineers building..."

Would you like me to draft a full JD following these guidelines?`;
      }
    }

    if (lowerQuery.includes('benefit') || lowerQuery.includes('leave') || lowerQuery.includes('pto')) {
      if (docRefs.length > 0) {
        return `I've pulled the exact benefits from our Employee Handbook:

**Annual Leave (page 23):**
25 days paid leave + 8 UK bank holidays = 33 days total per year. Up to 5 days can be carried over.

**Learning & Development (page 24):**
£1,500 annual budget per employee for courses, conferences, certifications, or books. Expenses over £500 need approval.

**Parental Leave (page 28):**
- Primary caregivers: 6 months fully paid
- Secondary caregivers: 2 months fully paid
- Applies regardless of gender or how you became a parent

These are standout benefits we should highlight to candidates, especially the generous parental leave and L&D budget.`;
      }
    }

    if (lowerQuery.includes('interview') || lowerQuery.includes('assessment') || lowerQuery.includes('technical')) {
      if (docRefs.length > 0) {
        return `Based on our Engineering Interview Guide:

**Technical Assessment Approach (page 5):**
We use take-home projects, not live coding. Candidates get 48 hours to solve a real-world problem similar to actual work. We evaluate:
- Code quality and architecture
- Decision-making process
- How they communicate their approach

**Evaluating "Ownership" Value (page 7):**
Look for examples where candidates:
- Took initiative beyond their job description
- Made decisions with incomplete information
- Fixed something broken without being asked

This assessment approach is less stressful for candidates and gives us better signal on how they'd actually work.`;
      }
    }

    if (lowerQuery.includes('culture') || lowerQuery.includes('value')) {
      if (docRefs.length > 0) {
        return `Our core values from the Employee Handbook (page 4):

**Customer Obsession** - Start with the customer and work backwards
**Ownership** - Act like an owner, think long-term
**Bias for Action** - Speed matters, make decisions quickly
**Learn and Be Curious** - Never done learning

These should guide how we evaluate candidates and how we present opportunities. For example, when discussing this Engineering Manager role, emphasize how they'd embody "Ownership" by leading their team autonomously and "Bias for Action" in our fast-paced shipping culture.`;
      }
    }

    return `I can help with that. Let me check our company documents for the most accurate information...`;
  };

  const viewDocument = (docName, page) => {
    alert(`Opening ${docName} at page ${page}\n\n(In production, this would open the document viewer)`);
  };

  const quickActions = [
    { label: "Write a job description", icon: "📝" },
    { label: "What benefits can I mention?", icon: "🎁" },
    { label: "How does our interview process work?", icon: "🎯" },
    { label: "Tell me about our company culture", icon: "🏢" }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Main Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Book size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>
                Vercentic Copilot
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Engineering Manager @ Talentos • 5 documents indexed
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                marginBottom: '24px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{ maxWidth: '85%' }}>
                <div style={{ 
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? '#667eea' : 'white',
                  color: msg.role === 'user' ? 'white' : '#374151',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}>
                  {msg.content}
                </div>

                {/* Document References */}
                {msg.role === 'assistant' && msg.documentRefs && msg.documentRefs.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      fontWeight: 600,
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <FileText size={14} />
                      Referenced from company documents:
                    </div>
                    {msg.documentRefs.map((ref, refIdx) => (
                      <DocumentReference
                        key={refIdx}
                        doc={ref.document}
                        excerpt={ref.excerpt}
                        page={ref.page}
                        onView={() => viewDocument(ref.document, ref.page)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSearching && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#667eea'
              }}>
                <Search size={16} className="spin" />
                <span style={{ fontSize: '14px' }}>Searching company documents...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
              QUICK ACTIONS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => setInput(action.label)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about company info, benefits, culture..."
              disabled={isSearching}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isSearching}
              style={{
                padding: '12px 24px',
                background: isSearching ? '#d1d5db' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSearching ? 'not-allowed' : 'pointer'
              }}
            >
              Send
            </button>
          </div>
          <div style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FileText size={12} />
            Responses use your company profile + 5 indexed documents
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CopilotWithDocuments;
