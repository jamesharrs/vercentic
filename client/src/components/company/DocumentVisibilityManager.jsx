import React, { useState } from 'react';
import { FileText, Upload, Lock, Globe, Users, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// Document visibility levels
const VISIBILITY_LEVELS = {
  INTERNAL: {
    value: 'internal',
    label: 'Internal Only',
    description: 'Only accessible to employees and internal copilot',
    icon: Lock,
    color: '#ef4444',
    useCases: ['Salary bands', 'Interview scoring guides', 'Internal policies', 'Hiring strategies']
  },
  CANDIDATE: {
    value: 'candidate',
    label: 'Candidate-Safe',
    description: 'Can be shared with candidates via candidate portal copilot',
    icon: Users,
    color: '#3b82f6',
    useCases: ['Benefits overview', 'Public culture docs', 'Job descriptions', 'Interview process overview']
  },
  PUBLIC: {
    value: 'public',
    label: 'Public',
    description: 'Publicly shareable information',
    icon: Globe,
    color: '#10b981',
    useCases: ['Press releases', 'Public brand guidelines', 'Company fact sheets']
  }
};

const DocumentVisibilityManager = () => {
  const [documents, setDocuments] = useState([
    {
      id: 'doc_1',
      name: 'Talentos Brand Guidelines 2024.pdf',
      category: 'Brand',
      visibility: 'candidate',
      uploadedAt: '2024-03-15',
      size: '2.4 MB',
      pageCount: 24,
      chunks: 48,
      lastAccessed: '2024-03-26',
      sensitiveContent: false
    },
    {
      id: 'doc_2',
      name: 'Employee Handbook v3.2.pdf',
      category: 'Handbook',
      visibility: 'internal',
      uploadedAt: '2024-02-10',
      size: '1.8 MB',
      pageCount: 56,
      chunks: 112,
      lastAccessed: '2024-03-25',
      sensitiveContent: true,
      sensitiveReason: 'Contains salary bands and internal policies'
    },
    {
      id: 'doc_3',
      name: 'Engineering Interview Guide.pdf',
      category: 'Training',
      visibility: 'internal',
      uploadedAt: '2024-03-01',
      size: '890 KB',
      pageCount: 12,
      chunks: 24,
      lastAccessed: '2024-03-26',
      sensitiveContent: true,
      sensitiveReason: 'Contains interview scoring criteria'
    },
    {
      id: 'doc_4',
      name: 'Benefits Overview for Candidates.pdf',
      category: 'Handbook',
      visibility: 'candidate',
      uploadedAt: '2024-03-20',
      size: '1.2 MB',
      pageCount: 8,
      chunks: 16,
      lastAccessed: '2024-03-26',
      sensitiveContent: false
    },
    {
      id: 'doc_5',
      name: 'Compensation Philosophy & Bands.xlsx',
      category: 'Policies',
      visibility: 'internal',
      uploadedAt: '2024-01-15',
      size: '450 KB',
      pageCount: 4,
      chunks: 8,
      lastAccessed: '2024-03-20',
      sensitiveContent: true,
      sensitiveReason: 'Contains specific salary ranges'
    },
    {
      id: 'doc_6',
      name: 'Company Culture & Values.pdf',
      category: 'Brand',
      visibility: 'public',
      uploadedAt: '2024-03-10',
      size: '980 KB',
      pageCount: 6,
      chunks: 12,
      lastAccessed: '2024-03-26',
      sensitiveContent: false
    }
  ]);

  const [filterVisibility, setFilterVisibility] = useState('all');
  const [showVisibilityHelper, setShowVisibilityHelper] = useState(true);

  const updateVisibility = (docId, newVisibility) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, visibility: newVisibility } : doc
    ));
  };

  const filteredDocs = filterVisibility === 'all' 
    ? documents 
    : documents.filter(doc => doc.visibility === filterVisibility);

  const stats = {
    total: documents.length,
    internal: documents.filter(d => d.visibility === 'internal').length,
    candidate: documents.filter(d => d.visibility === 'candidate').length,
    public: documents.filter(d => d.visibility === 'public').length
  };

  const VisibilityBadge = ({ level, showIcon = true }) => {
    const config = VISIBILITY_LEVELS[level.toUpperCase()];
    const Icon = config.icon;
    
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: `${config.color}15`,
        color: config.color,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        border: `1px solid ${config.color}30`
      }}>
        {showIcon && <Icon size={14} />}
        {config.label}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Company Documents
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Manage document visibility for internal vs candidate-facing copilot contexts
          </p>
        </div>

        {/* Visibility Guide */}
        {showVisibilityHelper && (
          <div style={{ 
            marginBottom: '24px', 
            background: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Document Visibility Levels
              </h3>
              <button
                onClick={() => setShowVisibilityHelper(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9ca3af', 
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {Object.values(VISIBILITY_LEVELS).map(level => {
                const Icon = level.icon;
                return (
                  <div key={level.value} style={{ 
                    padding: '16px', 
                    background: '#f9fafb', 
                    borderRadius: '8px',
                    border: `2px solid ${level.color}20`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Icon size={18} style={{ color: level.color }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: level.color }}>
                        {level.label}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                      {level.description}
                    </p>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      <strong style={{ color: '#6b7280' }}>Examples:</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                        {level.useCases.slice(0, 2).map((useCase, idx) => (
                          <li key={idx}>{useCase}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#fef3c7', 
              borderRadius: '6px',
              borderLeft: '3px solid #f59e0b',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <strong>💡 How it works:</strong> When candidates use the portal copilot, it only accesses "Candidate-Safe" and "Public" documents. Internal copilot (for your team) has access to all documents.
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Documents</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} style={{ color: VISIBILITY_LEVELS.INTERNAL.color }} />
              Internal Only
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: VISIBILITY_LEVELS.INTERNAL.color }}>{stats.internal}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} style={{ color: VISIBILITY_LEVELS.CANDIDATE.color }} />
              Candidate-Safe
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: VISIBILITY_LEVELS.CANDIDATE.color }}>{stats.candidate}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} style={{ color: VISIBILITY_LEVELS.PUBLIC.color }} />
              Public
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: VISIBILITY_LEVELS.PUBLIC.color }}>{stats.public}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterVisibility('all')}
            style={{
              padding: '8px 16px',
              background: filterVisibility === 'all' ? '#667eea' : 'white',
              color: filterVisibility === 'all' ? 'white' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            All Documents
          </button>
          {Object.values(VISIBILITY_LEVELS).map(level => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => setFilterVisibility(level.value)}
                style={{
                  padding: '8px 16px',
                  background: filterVisibility === level.value ? level.color : 'white',
                  color: filterVisibility === level.value ? 'white' : '#374151',
                  border: `1px solid ${level.color}30`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon size={14} />
                {level.label}
              </button>
            );
          })}
        </div>

        {/* Documents Table */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Document
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Category
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Visibility
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Accessible By
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText size={20} style={{ color: '#667eea', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                          {doc.name}
                        </div>
                        {doc.sensitiveContent && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px'
                          }}>
                            <AlertTriangle size={12} />
                            {doc.sensitiveReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {doc.category}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={doc.visibility}
                      onChange={(e) => updateVisibility(doc.id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        border: `1px solid ${VISIBILITY_LEVELS[doc.visibility.toUpperCase()].color}30`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: VISIBILITY_LEVELS[doc.visibility.toUpperCase()].color,
                        background: `${VISIBILITY_LEVELS[doc.visibility.toUpperCase()].color}10`,
                        cursor: 'pointer'
                      }}
                    >
                      {Object.values(VISIBILITY_LEVELS).map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {doc.visibility === 'internal' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Eye size={14} />
                          Internal Copilot Only
                        </div>
                      )}
                      {doc.visibility === 'candidate' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Eye size={14} />
                            Internal Copilot
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                            <Eye size={14} />
                            Candidate Portal Copilot
                          </div>
                        </div>
                      )}
                      {doc.visibility === 'public' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Eye size={14} />
                            All Copilots
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            + Public Website
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                    {doc.pageCount} pages • {doc.chunks} chunks
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDocs.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
              No documents with this visibility level
            </div>
          )}
        </div>

        {/* Copilot Context Preview */}
        <div style={{ 
          marginTop: '24px', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px'
        }}>
          <div style={{ 
            background: 'white', 
            border: '2px solid #667eea', 
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Lock size={18} style={{ color: '#667eea' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#667eea' }}>
                Internal Copilot Access
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
              Your team's copilot can access all documents when helping with:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#374151', lineHeight: '1.8' }}>
              <li>Writing job descriptions</li>
              <li>Interview preparation & scoring</li>
              <li>Offer letter creation</li>
              <li>Compensation discussions</li>
            </ul>
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              background: '#f3f4f6', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <strong style={{ color: '#374151' }}>Documents:</strong> All {documents.length} documents
            </div>
          </div>

          <div style={{ 
            background: 'white', 
            border: '2px solid #3b82f6', 
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={18} style={{ color: '#3b82f6' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#3b82f6' }}>
                Candidate Portal Copilot Access
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
              Candidates can ask about:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#374151', lineHeight: '1.8' }}>
              <li>Company culture & values</li>
              <li>Benefits overview</li>
              <li>Interview process (high-level)</li>
              <li>Team structure & working style</li>
            </ul>
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              background: '#eff6ff', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1e40af'
            }}>
              <strong>Documents:</strong> Only {stats.candidate + stats.public} candidate-safe/public documents
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVisibilityManager;
