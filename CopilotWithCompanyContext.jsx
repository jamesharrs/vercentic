import React, { useState, useEffect } from 'react';

// Mock company profile data
const COMPANY_PROFILES = {
  talentos: {
    name: "Talentos",
    brand: {
      tagline: "Connecting exceptional talent with ambitious companies",
      voiceTone: "Professional yet approachable, data-driven but human-centric"
    },
    evp: {
      headline: "Build your career where impact meets innovation",
      pillars: ["Career Growth", "Work-Life Balance", "Competitive Compensation", "Innovative Culture"]
    },
    benefits: {
      core: [
        "Competitive salary based on experience",
        "Equity/stock options",
        "Private health insurance",
        "25 days annual leave + public holidays"
      ],
      additional: [
        "£1,500 annual L&D budget",
        "£500 home office setup allowance",
        "6 months paid parental leave"
      ]
    },
    culture: {
      values: ["Customer Obsession", "Ownership", "Bias for Action", "Learn and Be Curious"],
      workingStyle: "Remote-first, async communication"
    },
    interviewProcess: {
      timeline: "2-3 weeks from application to offer",
      stages: [
        { name: "Initial Screen", duration: "30 mins" },
        { name: "Hiring Manager Interview", duration: "60 mins" },
        { name: "Technical Assessment", duration: "2-3 hours" },
        { name: "Team Interview", duration: "60 mins" },
        { name: "Final Interview", duration: "45 mins" }
      ]
    }
  },
  bannabas: {
    name: "Bannabas Consulting",
    brand: {
      tagline: "Strategic talent solutions for growing businesses",
      voiceTone: "Executive, consultative, relationship-focused"
    },
    evp: {
      headline: "Partner with leaders who understand your business",
      pillars: ["Strategic Partnership", "Industry Expertise", "White Glove Service", "Long-term Success"]
    },
    benefits: {
      core: [
        "Competitive base + commission structure",
        "Health insurance",
        "20 days annual leave"
      ],
      additional: [
        "Client entertainment budget",
        "Professional development allowance",
        "Quarterly team retreats"
      ]
    },
    culture: {
      values: ["Client First", "Expertise", "Integrity", "Results Driven"],
      workingStyle: "Hybrid - 3 days in office, client-facing culture"
    },
    interviewProcess: {
      timeline: "3-4 weeks including client reference checks",
      stages: [
        { name: "Phone Screen", duration: "20 mins" },
        { name: "In-Person Interview", duration: "90 mins" },
        { name: "Case Study Presentation", duration: "60 mins" },
        { name: "Partner Interview", duration: "45 mins" }
      ]
    }
  }
};

const CopilotWithCompanyContext = () => {
  const [selectedJob, setSelectedJob] = useState({
    title: "Engineering Manager",
    company: "talentos",
    department: "Engineering"
  });
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showContextPanel, setShowContextPanel] = useState(true);
  
  const companyProfile = COMPANY_PROFILES[selectedJob.company];

  useEffect(() => {
    // Initial copilot message with company context
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm here to help with the **${selectedJob.title}** role at **${companyProfile.name}**. I have your company profile loaded and can help with:\n\n- Writing job descriptions in your voice\n- Answering candidate questions about benefits and culture\n- Drafting outreach emails\n- Preparing interview guides\n\nWhat would you like to work on?`
    }]);
  }, [selectedJob]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Simulate copilot response using company context
    setTimeout(() => {
      const response = generateContextAwareResponse(input, companyProfile, selectedJob);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 500);

    setInput('');
  };

  const generateContextAwareResponse = (query, profile, job) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('benefit') || lowerQuery.includes('perk')) {
      return `Based on ${profile.name}'s benefits package:\n\n**Core Benefits:**\n${profile.benefits.core.map(b => `- ${b}`).join('\n')}\n\n**Additional Perks:**\n${profile.benefits.additional.map(b => `- ${b}`).join('\n')}\n\nThe L&D budget and home office setup align well with our "${profile.evp.pillars[0]}" pillar.`;
    }

    if (lowerQuery.includes('interview') || lowerQuery.includes('process') || lowerQuery.includes('timeline')) {
      return `Our standard interview process for ${job.title} takes ${profile.interviewProcess.timeline}:\n\n${profile.interviewProcess.stages.map((s, i) => 
        `**Stage ${i + 1}: ${s.name}** (${s.duration})`
      ).join('\n')}\n\nWe provide detailed feedback at every stage within 48 hours, aligned with our "${profile.culture.values[2]}" value.`;
    }

    if (lowerQuery.includes('culture') || lowerQuery.includes('value') || lowerQuery.includes('working style')) {
      return `${profile.name}'s culture is built on these core values:\n\n${profile.culture.values.map(v => `- **${v}**`).join('\n')}\n\nWe operate with a **${profile.culture.workingStyle}** approach, which means ${
        profile.culture.workingStyle.includes('Remote') 
          ? 'you can work from anywhere with flexible hours'
          : 'we value face-time and collaboration in our offices'
      }.`;
    }

    if (lowerQuery.includes('write') || lowerQuery.includes('draft') || lowerQuery.includes('jd') || lowerQuery.includes('job description')) {
      return `I'll draft a job description for ${job.title} using ${profile.name}'s voice (${profile.brand.voiceTone}):\n\n**${job.title}**\n\n**About Us**\n${profile.brand.tagline}\n\n**The Role**\n[Role overview aligned with ${profile.evp.headline}]\n\n**What You'll Do**\n- [Responsibilities tied to our values: ${profile.culture.values.slice(0, 2).join(', ')}]\n\n**Benefits**\n${profile.benefits.core.slice(0, 3).join(', ')}, and more.\n\n**Our Process**\n${profile.interviewProcess.timeline}\n\nWould you like me to expand any section?`;
    }

    return `I can help with that! As context, I know ${profile.name} operates with a "${profile.brand.voiceTone}" voice and our EVP is "${profile.evp.headline}". How would you like me to incorporate this into my response?`;
  };

  const quickActions = [
    "What benefits can I mention?",
    "Write a job description",
    "What's our interview timeline?",
    "Tell me about our culture"
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8f9fa' }}>
      {/* Company Context Panel */}
      {showContextPanel && (
        <div style={{ 
          width: '320px', 
          background: 'white', 
          borderRight: '1px solid #e5e7eb',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
              Company Context
            </h3>
            <button 
              onClick={() => setShowContextPanel(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              padding: '12px', 
              background: '#f3f4f6', 
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {companyProfile.name}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                "{companyProfile.brand.tagline}"
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Viewing: {selectedJob.title}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
              EVP Pillars
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {companyProfile.evp.pillars.map(pillar => (
                <div key={pillar} style={{ 
                  padding: '6px 10px', 
                  background: '#eff6ff', 
                  color: '#1e40af',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500
                }}>
                  {pillar}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
              Core Values
            </h4>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
              {companyProfile.culture.values.map(v => `• ${v}`).join('\n').split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
              Voice & Tone
            </h4>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
              {companyProfile.brand.voiceTone}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
              Interview Timeline
            </h4>
            <div style={{ fontSize: '13px', color: '#4b5563' }}>
              {companyProfile.interviewProcess.timeline}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {companyProfile.interviewProcess.stages.length} stages
            </div>
          </div>

          <div style={{ 
            padding: '12px', 
            background: '#fef3c7', 
            borderRadius: '6px',
            borderLeft: '3px solid #f59e0b'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
              Context Loaded
            </div>
            <div style={{ fontSize: '11px', color: '#78350f' }}>
              Copilot responses will use this company's voice, benefits, and culture
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {!showContextPanel && (
            <button 
              onClick={() => setShowContextPanel(true)}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Show Context
            </button>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              Vercentic Copilot
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Viewing Job: {selectedJob.title} at {companyProfile.name}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                marginBottom: '16px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{ 
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user' ? '#667eea' : 'white',
                color: msg.role === 'user' ? 'white' : '#374151',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-line',
                lineHeight: '1.6'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
              QUICK ACTIONS
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {quickActions.map(action => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  style={{
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {action}
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
              placeholder={`Ask about ${companyProfile.name}...`}
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
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopilotWithCompanyContext;
