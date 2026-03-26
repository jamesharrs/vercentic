import React, { useState } from 'react';
import { Building, FileText, Upload, Save, Check, AlertCircle, Zap } from 'lucide-react';

const CompanySettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  
  const [profile, setProfile] = useState({
    name: 'Talentos',
    industry: 'Technology Recruitment',
    headquarters: 'London, UK',
    tagline: 'Connecting exceptional talent with ambitious companies',
    voiceTone: 'Professional yet approachable, data-driven but human-centric',
    evpHeadline: 'Build your career where impact meets innovation',
    evpPillars: [
      { title: 'Career Growth', description: 'Clear progression paths with quarterly reviews and mentorship' },
      { title: 'Work-Life Balance', description: 'Flexible working, unlimited PTO, and remote-first culture' },
      { title: 'Competitive Compensation', description: 'Market-leading salaries, equity, and performance bonuses' },
      { title: 'Innovative Culture', description: 'Work with cutting-edge tech and solve meaningful problems' }
    ],
    coreBenefits: [
      'Competitive salary based on experience',
      'Equity/stock options',
      'Private health insurance (medical, dental, vision)',
      'Pension/401k matching up to 5%',
      '25 days annual leave + public holidays',
      'Flexible/remote working'
    ],
    coreValues: [
      { name: 'Customer Obsession', description: 'We start with the customer and work backwards' },
      { name: 'Ownership', description: 'We act like owners, thinking long-term' },
      { name: 'Bias for Action', description: 'Speed matters in business' },
      { name: 'Learn and Be Curious', description: 'We\'re never done learning' }
    ],
    workingStyle: 'Remote-first, async communication, outcome-focused',
    interviewTimeline: '2-3 weeks from application to offer',
    teamSize: 45
  });

  const [documents] = useState([
    { id: 1, name: 'Brand Guidelines 2024.pdf', category: 'Brand', status: 'indexed', chunks: 48, lastUsed: '2 hours ago' },
    { id: 2, name: 'Employee Handbook v3.2.pdf', category: 'Handbook', status: 'indexed', chunks: 112, lastUsed: '1 day ago' },
    { id: 3, name: 'Engineering Interview Guide.pdf', category: 'Training', status: 'indexed', chunks: 24, lastUsed: '3 hours ago' }
  ]);

  const saveProfile = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const updateField = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayItem = (field, index, key, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => 
        i === index ? { ...item, [key]: value } : item
      )
    }));
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Building size={24} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#111827' }}>
                  Company Settings
                </h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Configure your company profile and knowledge base for Copilot
                </p>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '10px 20px',
                background: saveStatus === 'saved' ? '#10b981' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {saveStatus === 'saving' ? (
                <>Saving...</>
              ) : saveStatus === 'saved' ? (
                <><Check size={18} /> Saved</>
              ) : (
                <><Save size={18} /> Save Changes</>
              )}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderBottom: '2px solid #f3f4f6' }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'profile' ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === 'profile' ? '#667eea' : '#6b7280',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'documents' ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === 'documents' ? '#667eea' : '#6b7280',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FileText size={16} />
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('copilot')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'copilot' ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === 'copilot' ? '#667eea' : '#6b7280',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Zap size={16} />
              Copilot Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            
            {/* Basic Info */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Basic Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Company Name
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Industry
                  </label>
                  <input
                    value={profile.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Company Tagline
                  </label>
                  <input
                    value={profile.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>

            {/* Brand Voice */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Brand Voice & Tone
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6b7280' }}>
                How Copilot should write job descriptions and candidate communications
              </p>
              <textarea
                value={profile.voiceTone}
                onChange={(e) => updateField('voiceTone', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
              />
            </div>

            {/* EVP */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Employee Value Proposition (EVP)
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6b7280' }}>
                Your core employer brand message
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  EVP Headline
                </label>
                <input
                  value={profile.evpHeadline}
                  onChange={(e) => updateField('evpHeadline', e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                EVP Pillars
              </label>
              {profile.evpPillars.map((pillar, idx) => (
                <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                  <input
                    value={pillar.title}
                    onChange={(e) => updateArrayItem('evpPillars', idx, 'title', e.target.value)}
                    placeholder="Pillar title"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}
                  />
                  <textarea
                    value={pillar.description}
                    onChange={(e) => updateArrayItem('evpPillars', idx, 'description', e.target.value)}
                    placeholder="Description"
                    rows={2}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
            </div>

            {/* Core Values */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Core Values
              </h2>
              {profile.coreValues.map((value, idx) => (
                <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                  <input
                    value={value.name}
                    onChange={(e) => updateArrayItem('coreValues', idx, 'name', e.target.value)}
                    placeholder="Value name"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}
                  />
                  <input
                    value={value.description}
                    onChange={(e) => updateArrayItem('coreValues', idx, 'description', e.target.value)}
                    placeholder="Description"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '32px', border: '2px dashed #d1d5db', textAlign: 'center', marginBottom: '24px' }}>
              <Upload size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
                Upload Company Documents
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                PDFs, DOCX, or TXT • Max 50MB per file
              </p>
              <button style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Choose Files
              </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Document
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Category
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Chunks
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Last Used
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={18} style={{ color: '#667eea' }} />
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                        {doc.category}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                          <Check size={16} />
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Indexed</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                        {doc.chunks}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                        {doc.lastUsed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Copilot Settings Tab */}
        {activeTab === 'copilot' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '24px', padding: '16px', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <AlertCircle size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    How Copilot Uses Your Company Data
                  </div>
                  <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
                    Copilot combines your structured company profile (brand voice, EVP, values, benefits) with content from uploaded documents to provide accurate, on-brand responses. All information is kept within your company context and never shared across clients.
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Active Data Sources
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Company Profile
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Brand voice, EVP, values, benefits, interview process
                  </div>
                </div>
                <div style={{ padding: '4px 12px', background: '#10b981', color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: 600' }}>
                  Active
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Uploaded Documents
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {documents.length} documents • {documents.reduce((sum, d) => sum + d.chunks, 0)} searchable chunks
                  </div>
                </div>
                <div style={{ padding: '4px 12px', background: '#10b981', color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: 600' }}>
                  Active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;
