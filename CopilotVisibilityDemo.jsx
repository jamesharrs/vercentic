import React, { useState } from 'react';
import { Lock, Users, FileText, Shield, AlertCircle, MessageSquare } from 'lucide-react';

const CopilotVisibilityDemo = () => {
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState(null);

  const exampleQueries = [
    {
      query: "What's the salary range for this Engineering Manager role?",
      category: 'compensation'
    },
    {
      query: "Tell me about your interview process",
      category: 'interview'
    },
    {
      query: "What benefits do you offer?",
      category: 'benefits'
    },
    {
      query: "What are your company values?",
      category: 'culture'
    }
  ];

  const generateResponses = (userQuery) => {
    const lowerQuery = userQuery.toLowerCase();

    if (lowerQuery.includes('salary') || lowerQuery.includes('compensation') || lowerQuery.includes('pay')) {
      return {
        internal: {
          response: `Based on our **Compensation Philosophy & Bands** document (page 3):

**Engineering Manager L3: £90,000 - £120,000 base**
- Plus 0.1% - 0.25% equity
- Up to 15% annual performance bonus
- Pension matching (5%)

This is benchmarked against London tech companies at the 75th percentile. The exact offer depends on:
- Years of relevant experience
- Team size they'd manage
- Technical depth vs people management focus

For this specific role, I'd recommend opening at £95k-£100k for someone with 5-7 years experience.`,
          documentsUsed: [
            { name: 'Compensation Philosophy & Bands.xlsx', visibility: 'internal', page: 3, icon: '🔒' }
          ]
        },
        candidate: {
          response: `We offer competitive, market-leading salaries that are benchmarked against London tech companies. According to our benefits overview, all Engineering Manager roles include:

- Competitive base salary
- Equity participation in the company
- Performance bonuses
- Pension matching

Your recruiter will discuss the specific compensation range for this position during your initial screening call. They'll work with you to understand your expectations and ensure we're aligned.

Is there anything else about our benefits or working environment you'd like to know?`,
          documentsUsed: [
            { name: 'Benefits Overview for Candidates.pdf', visibility: 'candidate', page: 2, icon: '👥' }
          ],
          blockedDocuments: [
            { name: 'Compensation Philosophy & Bands.xlsx', reason: 'Contains specific salary bands - Internal only' }
          ]
        }
      };
    }

    if (lowerQuery.includes('interview')) {
      return {
        internal: {
          response: `From our **Engineering Interview Guide** (page 5-7):

**Technical Assessment Scoring:**
1-5 scale across three dimensions:
- **Code Quality:** Clean, maintainable, follows best practices
- **Architecture:** Appropriate patterns, scalable design  
- **Communication:** Clear README, explains decisions

**Rejection Threshold:** Any score below 3 in any dimension = automatic reject

**Typical Questions by Stage:**
- Stage 2 (Hiring Manager): System design, scaling challenges, team conflict resolution
- Stage 4 (Team Interview): Collaboration style, code review approach, mentorship philosophy

**Red Flags to Watch:**
- Can't explain past technical decisions
- Blames former teammates for failures
- No questions about team or culture

Would you like the full question bank or scoring rubric?`,
          documentsUsed: [
            { name: 'Engineering Interview Guide.pdf', visibility: 'internal', page: 5, icon: '🔒' },
            { name: 'Engineering Interview Guide.pdf', visibility: 'internal', page: 7, icon: '🔒' }
          ]
        },
        candidate: {
          response: `Our interview process is designed to be thorough but respectful of your time. Here's what to expect:

**Timeline:** 2-3 weeks from start to finish

**The Stages:**
1. **Initial Screen** (30 mins) - Chat with recruiter about your background
2. **Hiring Manager Interview** (60 mins) - Deep dive into your experience
3. **Technical Assessment** - Take-home project (48 hours to complete)
4. **Team Interview** (60 mins) - Meet potential teammates
5. **Final Interview** (45 mins) - Vision alignment with leadership

We provide detailed feedback after each stage, usually within 48 hours. The technical assessment is a real-world problem similar to what you'd work on here - no whiteboard coding or trick questions.

We value transparency and want you to put your best foot forward. Any questions about what to expect?`,
          documentsUsed: [
            { name: 'Benefits Overview for Candidates.pdf', visibility: 'candidate', page: 4, icon: '👥' }
          ],
          blockedDocuments: [
            { name: 'Engineering Interview Guide.pdf', reason: 'Contains scoring criteria and interview questions - Internal only' }
          ]
        }
      };
    }

    if (lowerQuery.includes('benefit')) {
      return {
        internal: {
          response: `Full benefits package from **Employee Handbook v3.2** (pages 23-28):

**Core Benefits:**
- 25 days annual leave + 8 UK bank holidays (33 total)
- Private health insurance (£450/month cost to company)
- Pension matching up to 5%
- Life insurance (4x salary)

**Enhanced Benefits:**
- £1,500 annual L&D budget (requires manager approval >£500)
- £500 home office setup allowance (one-time)
- £100 monthly wellness stipend (gym, therapy, etc)
- 6 months primary parental leave, 2 months secondary (fully paid)

**Total Benefits Cost:** Approximately £12,000-£15,000 per employee per year

**Usage Stats:**
- 78% of employees use full L&D budget
- Average PTO taken: 28 days (high engagement)
- Parental leave uptake: 100% of eligible employees`,
          documentsUsed: [
            { name: 'Employee Handbook v3.2.pdf', visibility: 'internal', page: 23, icon: '🔒' },
            { name: 'Employee Handbook v3.2.pdf', visibility: 'internal', page: 24, icon: '🔒' }
          ]
        },
        candidate: {
          response: `We offer a comprehensive benefits package designed around work-life balance and career growth:

**Time Off:**
- 25 days annual leave + public holidays (33 days total per year)
- Flexible working arrangements
- Remote-first culture

**Health & Wellness:**
- Private health insurance (medical, dental, vision)
- £100 monthly wellness stipend for gym, therapy, etc.
- Pension matching up to 5%

**Career Development:**
- £1,500 annual learning budget for courses, conferences, or certifications
- Quarterly career development reviews
- Mentorship program

**Family Support:**
- 6 months fully paid primary parental leave
- 2 months fully paid secondary parental leave
- Home office setup allowance

We're proud of how comprehensive our package is - these benefits reflect our commitment to supporting your whole life, not just your work.`,
          documentsUsed: [
            { name: 'Benefits Overview for Candidates.pdf', visibility: 'candidate', page: 1, icon: '👥' }
          ]
        }
      };
    }

    if (lowerQuery.includes('culture') || lowerQuery.includes('value')) {
      return {
        internal: {
          response: `From **Employee Handbook v3.2** (page 4):

**Our Four Core Values:**

**Customer Obsession** - Start with the customer and work backwards
- Practical application: Before building features, we interview 10+ customers
- Performance review weight: 25%

**Ownership** - Act like owners, think long-term, never say "that's not my job"
- We use this to evaluate promotion readiness
- Red flag if someone consistently deflects to other teams

**Bias for Action** - Speed matters, make decisions quickly and iterate
- Average decision cycle: 48 hours for reversible decisions
- We track "analysis paralysis" incidents in retros

**Learn and Be Curious** - Never done learning, always seek to improve
- Evidenced by L&D budget utilization
- Required for senior+ promotions

**Culture Metrics:**
- eNPS: +52 (excellent)
- Glassdoor: 4.6/5
- Retention: 92% at 1 year
- % who'd recommend to friend: 89%`,
          documentsUsed: [
            { name: 'Employee Handbook v3.2.pdf', visibility: 'internal', page: 4, icon: '🔒' },
            { name: 'Culture Metrics Dashboard.pdf', visibility: 'internal', page: 1, icon: '🔒' }
          ]
        },
        candidate: {
          response: `Our culture is built on four core values that guide how we work:

**Customer Obsession** - We start with the customer and work backwards. Before building anything, we talk to customers to understand their real needs.

**Ownership** - We act like owners of the business, thinking long-term and taking initiative beyond our job descriptions.

**Bias for Action** - Speed matters in business. We make decisions quickly, ship fast, and iterate based on feedback.

**Learn and Be Curious** - We're never done learning. Everyone gets a £1,500 annual budget for courses, conferences, or books.

**What This Means Day-to-Day:**
- Remote-first, outcome-focused work culture
- We ship in 2-week sprints and move fast
- Average tenure is 2.5 years (people stay because they grow)
- 50%+ underrepresented groups in leadership

You'll see these values come through in our interview process - we're looking for people who naturally align with how we operate.`,
          documentsUsed: [
            { name: 'Company Culture & Values.pdf', visibility: 'public', page: 1, icon: '🌐' }
          ]
        }
      };
    }

    return null;
  };

  const handleAsk = () => {
    if (!query.trim()) return;
    const result = generateResponses(query);
    setResponses(result);
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
    const result = generateResponses(exampleQuery);
    setResponses(result);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f9fafb', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Document Visibility in Action
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            See how the same question gets different answers based on document access
          </p>
        </div>

        {/* Info Banner */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px 20px', 
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px'
        }}>
          <Shield size={24} style={{ color: '#667eea', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              How Document Visibility Works
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
              Internal copilot (left) has access to <strong>all documents</strong> including salary bands and interview guides. 
              Candidate portal copilot (right) only sees <strong>candidate-safe documents</strong> - giving helpful answers without exposing sensitive data.
            </div>
          </div>
        </div>

        {/* Query Input */}
        <div style={{ 
          marginBottom: '24px', 
          background: 'white', 
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            Ask a Question
          </label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="e.g., What's the salary range for this role?"
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
              onClick={handleAsk}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MessageSquare size={18} />
              Ask Both Copilots
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Try these examples:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {exampleQueries.map(example => (
              <button
                key={example.query}
                onClick={() => handleExampleClick(example.query)}
                style={{
                  padding: '8px 12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseOut={e => e.currentTarget.style.background = '#f9fafb'}
              >
                {example.query}
              </button>
            ))}
          </div>
        </div>

        {/* Responses */}
        {responses && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Internal Copilot */}
            <div style={{ 
              background: 'white', 
              borderRadius: '12px',
              border: '2px solid #667eea',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Lock size={20} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Internal Copilot</div>
                  <div style={{ fontSize: '12px', opacity: 0.9' }}>Full access to all documents</div>
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#374151', 
                  lineHeight: '1.7',
                  whiteSpace: 'pre-line',
                  marginBottom: '20px'
                }}>
                  {responses.internal.response}
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Documents Used
                  </div>
                  {responses.internal.documentsUsed.map((doc, idx) => (
                    <div key={idx} style={{ 
                      marginBottom: '8px',
                      padding: '10px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>{doc.icon}</span>
                      <FileText size={14} style={{ color: '#667eea' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{doc.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          Page {doc.page} • {doc.visibility} access
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Portal Copilot */}
            <div style={{ 
              background: 'white', 
              borderRadius: '12px',
              border: '2px solid #3b82f6',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Users size={20} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Candidate Portal Copilot</div>
                  <div style={{ fontSize: '12px', opacity: 0.9' }}>Candidate-safe documents only</div>
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#374151', 
                  lineHeight: '1.7',
                  whiteSpace: 'pre-line',
                  marginBottom: '20px'
                }}>
                  {responses.candidate.response}
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Documents Used
                  </div>
                  {responses.candidate.documentsUsed.map((doc, idx) => (
                    <div key={idx} style={{ 
                      marginBottom: '8px',
                      padding: '10px',
                      background: '#f0f9ff',
                      borderRadius: '6px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>{doc.icon}</span>
                      <FileText size={14} style={{ color: '#3b82f6' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{doc.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          Page {doc.page} • {doc.visibility} access
                        </div>
                      </div>
                    </div>
                  ))}

                  {responses.candidate.blockedDocuments && responses.candidate.blockedDocuments.length > 0 && (
                    <>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: '#6b7280', 
                        marginTop: '16px',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} style={{ color: '#ef4444' }} />
                        Restricted Documents (Not Accessible)
                      </div>
                      {responses.candidate.blockedDocuments.map((doc, idx) => (
                        <div key={idx} style={{ 
                          marginBottom: '8px',
                          padding: '10px',
                          background: '#fef2f2',
                          borderRadius: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'start',
                          gap: '8px',
                          border: '1px solid #fee2e2'
                        }}>
                          <Lock size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: '#991b1b' }}>{doc.name}</div>
                            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                              {doc.reason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!responses && (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px',
            border: '2px dashed #d1d5db',
            padding: '48px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <div style={{ fontSize: '16px', fontWeight: 500 }}>
              Ask a question to see how both copilots respond
            </div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              Try the example questions above to see document visibility in action
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CopilotVisibilityDemo;
