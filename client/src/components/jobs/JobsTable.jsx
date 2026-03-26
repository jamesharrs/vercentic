import React, { useState, useRef, useEffect } from 'react';

const ColumnFilter = ({ column, values, activeFilters, onFilterChange, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const uniqueValues = [...new Set(values)].filter(Boolean).sort();
  const filteredValues = uniqueValues.filter(val => 
    val.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeColumnFilter = activeFilters[column] || [];
  const hasActiveFilter = activeColumnFilter.length > 0 && activeColumnFilter.length < uniqueValues.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleValue = (value) => {
    const current = activeColumnFilter.length > 0 ? activeColumnFilter : uniqueValues;
    const newFilter = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];

    onFilterChange({
      ...activeFilters,
      [column]: newFilter.length === uniqueValues.length ? [] : newFilter
    });
  };

  const selectAll = () => {
    onFilterChange({
      ...activeFilters,
      [column]: []
    });
  };

  const clearAll = () => {
    onFilterChange({
      ...activeFilters,
      [column]: []
    });
    setIsOpen(false);
  };

  return (
    <div className="column-filter" ref={dropdownRef}>
      <button 
        className={`filter-header ${hasActiveFilter ? 'filtered' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="column-name">{column}</span>
        <svg 
          className={`filter-icon ${isOpen ? 'open' : ''}`} 
          width="12" 
          height="12" 
          viewBox="0 0 12 12"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>

      {isOpen && (
        <div className={`filter-dropdown ${align}`}>
          <div className="filter-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="filter-actions">
            <button onClick={selectAll} className="action-btn">
              Select All
            </button>
            <button onClick={clearAll} className="action-btn">
              Clear
            </button>
          </div>

          <div className="filter-options">
            {filteredValues.map(value => {
              const isChecked = activeColumnFilter.length === 0 || activeColumnFilter.includes(value);
              return (
                <label key={value} className="filter-option">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(value)}
                  />
                  <span className="option-label">{value}</span>
                </label>
              );
            })}
            {filteredValues.length === 0 && (
              <div className="no-results">No matches found</div>
            )}
          </div>

          {hasActiveFilter && (
            <div className="filter-footer">
              {activeColumnFilter.length} of {uniqueValues.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function JobsTable() {
  const [jobs] = useState([
    { jobTitle: 'Senior Engineer', department: 'Engineering', location: 'Dubai', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'Sales Manager', department: 'Sales', location: 'London', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'Marketing Lead', department: 'Marketing', location: 'Dubai', workType: 'Contract', employmentType: 'Temporary' },
    { jobTitle: 'Product Designer', department: 'Design', location: 'New York', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'Data Analyst', department: 'Engineering', location: 'Singapore', workType: 'Part-time', employmentType: 'Contract' },
    { jobTitle: 'Account Executive', department: 'Sales', location: 'Dubai', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'HR Coordinator', department: 'HR', location: 'London', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'Senior Developer', department: 'Engineering', location: 'Dubai', workType: 'Full-time', employmentType: 'Permanent' },
    { jobTitle: 'Content Writer', department: 'Marketing', location: 'Remote', workType: 'Contract', employmentType: 'Freelance' },
    { jobTitle: 'Finance Manager', department: 'Finance', location: 'New York', workType: 'Full-time', employmentType: 'Permanent' },
  ]);

  const [filters, setFilters] = useState({});

  const columns = [
    { key: 'jobTitle', label: 'JOB TITLE' },
    { key: 'department', label: 'DEPARTMENT' },
    { key: 'location', label: 'LOCATION' },
    { key: 'workType', label: 'WORK TYPE' },
    { key: 'employmentType', label: 'EMPLOYMENT TYPE' },
  ];

  const filteredJobs = jobs.filter(job => {
    return Object.entries(filters).every(([column, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      return selectedValues.includes(job[column]);
    });
  });

  const getColumnValues = (columnKey) => {
    return jobs.map(job => job[columnKey]);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#111827' }}>Jobs</h1>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>{filteredJobs.length} of {jobs.length} records</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              {columns.map((col, index) => (
                <th key={col.key} style={{ textAlign: 'left', padding: 0, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                  <ColumnFilter
                    column={col.label}
                    values={getColumnValues(col.key)}
                    activeFilters={filters}
                    onFilterChange={setFilters}
                    align={index > columns.length - 3 ? 'right' : 'left'}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job, idx) => (
              <tr key={idx} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>{job.jobTitle}</td>
                <td style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>{job.department}</td>
                <td style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>{job.location}</td>
                <td style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>{job.workType}</td>
                <td style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>{job.employmentType}</td>
              </tr>
            ))}
            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af', fontStyle: 'italic' }}>
                  No jobs match the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .column-filter {
          position: relative;
          display: inline-block;
        }

        .filter-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .filter-header:hover {
          color: #111827;
          background: #f9fafb;
        }

        .filter-header.filtered {
          color: #2563eb;
        }

        .filter-header.filtered .filter-icon {
          color: #2563eb;
        }

        .column-name {
          white-space: nowrap;
        }

        .filter-icon {
          transition: transform 0.2s;
          color: #9ca3af;
        }

        .filter-icon.open {
          transform: rotate(180deg);
        }

        .filter-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          min-width: 220px;
          max-width: 320px;
          z-index: 1000;
        }

        .filter-dropdown.left {
          left: 0;
        }

        .filter-dropdown.right {
          right: 0;
        }

        .filter-search {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .filter-search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
        }

        .filter-search input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .action-btn {
          flex: 1;
          padding: 6px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .filter-options {
          max-height: 280px;
          overflow-y: auto;
          padding: 4px;
        }

        .filter-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.15s;
        }

        .filter-option:hover {
          background: #f9fafb;
        }

        .filter-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .option-label {
          font-size: 14px;
          color: #374151;
          user-select: none;
        }

        .no-results {
          padding: 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        .filter-footer {
          padding: 10px 12px;
          border-top: 1px solid #f3f4f6;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
