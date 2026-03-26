import React, { useState } from 'react';
import { Upload, FileText, X, Search, CheckCircle, AlertCircle } from 'lucide-react';

// Document types that copilot can reference
const DOCUMENT_CATEGORIES = {
  BRAND: 'Brand & Messaging',
  HANDBOOK: 'Employee Handbook',
  POLICIES: 'Policies & Procedures',
  PRODUCT: 'Product Information',
  SALES: 'Sales Materials',
  TRAINING: 'Training & Onboarding',
  OTHER: 'Other'
};

const CompanyDocumentManager = ({ companyId }) => {
  const [documents, setDocuments] = useState([
    {
      id: 'doc_1',
      name: 'Talentos Brand Guidelines 2024.pdf',
      category: 'BRAND',
      uploadedAt: '2024-03-15',
      size: '2.4 MB',
      status: 'indexed',
      pageCount: 24,
      chunks: 48, // Number of semantic chunks extracted
      lastAccessed: '2024-03-26'
    },
    {
      id: 'doc_2',
      name: 'Employee Handbook v3.2.pdf',
      category: 'HANDBOOK',
      uploadedAt: '2024-02-10',
      size: '1.8 MB',
      status: 'indexed',
      pageCount: 56,
      chunks: 112,
      lastAccessed: '2024-03-25'
    },
    {
      id: 'doc_3',
      name: 'Engineering Interview Guide.pdf',
      category: 'TRAINING',
      uploadedAt: '2024-03-01',
      size: '890 KB',
      status: 'indexed',
      pageCount: 12,
      chunks: 24,
      lastAccessed: '2024-03-26'
    },
    {
      id: 'doc_4',
      name: 'Product Feature Sheet.pdf',
      category: 'PRODUCT',
      uploadedAt: '2024-03-20',
      size: '1.2 MB',
      status: 'processing',
      pageCount: null,
      chunks: null,
      lastAccessed: null
    }
  ]);

  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploading(true);

    // Simulate upload and indexing
    setTimeout(() => {
      const newDocs = files.map((file, idx) => ({
        id: `doc_${Date.now()}_${idx}`,
        name: file.name,
        category: 'OTHER',
        uploadedAt: new Date().toISOString().split('T')[0],
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: 'processing',
        pageCount: null,
        chunks: null,
        lastAccessed: null
      }));

      setDocuments(prev => [...newDocs, ...prev]);
      setUploading(false);

      // Simulate indexing completion
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          newDocs.find(nd => nd.id === doc.id) && doc.status === 'processing'
            ? { ...doc, status: 'indexed', pageCount: Math.floor(Math.random() * 50) + 5, chunks: Math.floor(Math.random() * 100) + 10 }
            : doc
        ));
      }, 3000);
    }, 500);
  };

  const deleteDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const filteredDocs = selectedCategory === 'ALL' 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  const stats = {
    total: documents.length,
    indexed: documents.filter(d => d.status === 'indexed').length,
    totalChunks: documents.reduce((sum, d) => sum + (d.chunks || 0), 0),
    totalPages: documents.reduce((sum, d) => sum + (d.pageCount || 0), 0)
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Company Documents
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Upload company documents that Copilot can reference when helping with jobs and candidates
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Documents</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Indexed & Ready</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#10b981' }}>{stats.indexed}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Pages</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{stats.totalPages}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Searchable Chunks</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{stats.totalChunks}</div>
          </div>
        </div>

        {/* Upload Area */}
        <div style={{ 
          background: 'white', 
          border: '2px dashed #d1d5db', 
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <Upload size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Upload Company Documents
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
            PDF, DOCX, or TXT files • Max 50MB per file
          </p>
          <label style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>
            {uploading ? 'Uploading...' : 'Choose Files'}
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          
          <div style={{ marginTop: '16px', padding: '12px', background: '#eff6ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
            <strong>How it works:</strong> Documents are automatically indexed and made searchable. Copilot will reference relevant sections when answering questions about your company, culture, benefits, and processes.
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '8px 16px',
              background: selectedCategory === 'ALL' ? '#667eea' : 'white',
              color: selectedCategory === 'ALL' ? 'white' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            All Documents
          </button>
          {Object.entries(DOCUMENT_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === key ? '#667eea' : 'white',
                color: selectedCategory === key ? 'white' : '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Documents List */}
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
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Details
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Last Used
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText size={20} style={{ color: '#667eea' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {doc.size} • Uploaded {doc.uploadedAt}
                        </div>
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
                      {DOCUMENT_CATEGORIES[doc.category]}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {doc.status === 'indexed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                        <CheckCircle size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Indexed</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                        <AlertCircle size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Processing...</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                    {doc.pageCount ? (
                      <>
                        {doc.pageCount} pages • {doc.chunks} chunks
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                    {doc.lastAccessed || '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      style={{
                        padding: '6px',
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                      title="Delete document"
                    >
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDocs.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
              No documents in this category
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#fef3c7', 
          border: '1px solid #fde68a',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          <strong>💡 How Copilot uses these documents:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>When writing job descriptions, it references brand guidelines for tone and messaging</li>
            <li>When answering candidate questions, it pulls from employee handbook for accurate benefits info</li>
            <li>When preparing interviews, it uses your interview guides for company-specific frameworks</li>
            <li>All responses cite which document and page the information came from</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanyDocumentManager;
