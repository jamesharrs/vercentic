import React, { useState } from 'react';

const JobFilters = ({ onFilterChange, activeFilters = [] }) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);

  const filterTypes = [
    { id: 'jobTitle', label: 'Job Title', type: 'text', operators: ['contains', 'equals', 'starts with'] },
    { id: 'department', label: 'Department', type: 'select', operators: ['is', 'is not'], options: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'] },
    { id: 'location', label: 'Location', type: 'select', operators: ['is', 'is not'], options: ['Dubai', 'London', 'New York', 'Singapore'] },
    { id: 'status', label: 'Status', type: 'select', operators: ['is', 'is not'], options: ['Open', 'Closed', 'Draft', 'On Hold'] },
  ];

  const addFilter = (filterType) => {
    const newFilter = {
      id: Date.now(),
      type: filterType.id,
      label: filterType.label,
      operator: filterType.operators[0],
      value: '',
      filterConfig: filterType
    };
    setEditingFilter(newFilter);
    setShowFilterMenu(false);
  };

  const saveFilter = () => {
    if (editingFilter && editingFilter.value) {
      const updated = [...activeFilters, editingFilter];
      onFilterChange(updated);
      setEditingFilter(null);
    }
  };

  const updateFilter = (filterId, field, value) => {
    const updated = activeFilters.map(f => 
      f.id === filterId ? { ...f, [field]: value } : f
    );
    onFilterChange(updated);
  };

  const removeFilter = (filterId) => {
    onFilterChange(activeFilters.filter(f => f.id !== filterId));
  };

  const cancelEdit = () => {
    setEditingFilter(null);
  };

  return (
    <div className="filter-container">
      <div className="filter-pills">
        {activeFilters.map(filter => (
          <div key={filter.id} className="filter-pill">
            <span className="filter-text">
              {filter.label} {filter.operator} <strong>{filter.value}</strong>
            </span>
            <button 
              className="filter-remove"
              onClick={() => removeFilter(filter.id)}
              aria-label="Remove filter"
            >
              ×
            </button>
          </div>
        ))}

        {editingFilter && (
          <div className="filter-editor">
            <select 
              value={editingFilter.operator}
              onChange={(e) => setEditingFilter({ ...editingFilter, operator: e.target.value })}
              className="filter-operator"
            >
              {editingFilter.filterConfig.operators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>

            {editingFilter.filterConfig.type === 'text' ? (
              <input
                type="text"
                value={editingFilter.value}
                onChange={(e) => setEditingFilter({ ...editingFilter, value: e.target.value })}
                placeholder="Enter value..."
                className="filter-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFilter();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            ) : (
              <select
                value={editingFilter.value}
                onChange={(e) => setEditingFilter({ ...editingFilter, value: e.target.value })}
                className="filter-select"
                autoFocus
              >
                <option value="">Select...</option>
                {editingFilter.filterConfig.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            <button onClick={saveFilter} className="filter-save" disabled={!editingFilter.value}>
              ✓
            </button>
            <button onClick={cancelEdit} className="filter-cancel">
              ×
            </button>
          </div>
        )}

        <div className="add-filter-wrapper">
          <button 
            className="add-filter-btn"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            + Add filter
          </button>

          {showFilterMenu && (
            <div className="filter-menu">
              {filterTypes.map(type => (
                <button
                  key={type.id}
                  className="filter-menu-item"
                  onClick={() => addFilter(type)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .filter-container {
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          min-height: 32px;
        }

        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #374151;
          max-width: 100%;
        }

        .filter-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filter-text strong {
          color: #111827;
          font-weight: 600;
        }

        .filter-remove {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: all 0.15s;
        }

        .filter-remove:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .filter-editor {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .filter-operator,
        .filter-input,
        .filter-select {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          outline: none;
        }

        .filter-operator {
          min-width: 100px;
        }

        .filter-input,
        .filter-select {
          min-width: 150px;
        }

        .filter-input:focus,
        .filter-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-save,
        .filter-cancel {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .filter-save {
          background: #10b981;
          color: white;
        }

        .filter-save:hover:not(:disabled) {
          background: #059669;
        }

        .filter-save:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .filter-cancel {
          background: #ef4444;
          color: white;
        }

        .filter-cancel:hover {
          background: #dc2626;
        }

        .add-filter-wrapper {
          position: relative;
          display: inline-block;
        }

        .add-filter-btn {
          padding: 6px 12px;
          background: white;
          border: 1px dashed #9ca3af;
          border-radius: 6px;
          color: #6b7280;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .add-filter-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .filter-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 180px;
          z-index: 100;
          overflow: hidden;
        }

        .filter-menu-item {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          text-align: left;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
        }

        .filter-menu-item:hover {
          background: #f3f4f6;
        }

        .filter-menu-item:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }
      `}</style>
    </div>
  );
};

// Example usage component
const JobsList = () => {
  const [filters, setFilters] = useState([]);
  const [jobs, setJobs] = useState([
    { id: 1, title: 'Senior Engineer', department: 'Engineering', location: 'Dubai', status: 'Open' },
    { id: 2, title: 'Sales Manager', department: 'Sales', location: 'London', status: 'Open' },
    { id: 3, title: 'Marketing Lead', department: 'Marketing', location: 'Dubai', status: 'Closed' },
    // ... more jobs
  ]);

  const applyFilters = (jobs, filters) => {
    if (filters.length === 0) return jobs;

    return jobs.filter(job => {
      return filters.every(filter => {
        const fieldValue = job[filter.type]?.toLowerCase() || '';
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case 'contains':
            return fieldValue.includes(filterValue);
          case 'equals':
          case 'is':
            return fieldValue === filterValue;
          case 'starts with':
            return fieldValue.startsWith(filterValue);
          case 'is not':
            return fieldValue !== filterValue;
          default:
            return true;
        }
      });
    });
  };

  const filteredJobs = applyFilters(jobs, filters);

  return (
    <div>
      <div className="header">
        <h1>Jobs</h1>
        <span className="count">{filteredJobs.length} of {jobs.length} records</span>
      </div>

      <JobFilters 
        activeFilters={filters}
        onFilterChange={setFilters}
      />

      <div className="jobs-list">
        {filteredJobs.map(job => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <div className="job-meta">
              <span>{job.department}</span>
              <span>{job.location}</span>
              <span className={`status status-${job.status.toLowerCase()}`}>
                {job.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .header {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .count {
          color: #6b7280;
          font-size: 14px;
        }

        .jobs-list {
          padding: 16px;
        }

        .job-card {
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .job-card h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .job-meta {
          display: flex;
          gap: 12px;
          font-size: 14px;
          color: #6b7280;
        }

        .status {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-open {
          background: #d1fae5;
          color: #065f46;
        }

        .status-closed {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
};

export default JobsList;
