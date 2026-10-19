import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { 
  FileText, Search, Trash2, ExternalLink, 
  ChevronLeft, ChevronRight, AlertCircle, Upload 
} from 'lucide-react';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

export const History = () => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDocuments(pagination.page, search);
  }, [pagination.page]);

  const loadDocuments = async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const data = await apiClient.listDocuments({ page, limit: 8, search: searchQuery });
      setDocuments(data.documents || []);
      setPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDocuments(1, search);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteDocument(deleteId);
      setDeleteId(null);
      loadDocuments(pagination.page, search);
    } catch (err) {
      alert(`Deletion error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', color: 'var(--primary-900)' }}>
              Analysis History
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              Your past loan agreements and saved screening reports
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by filename..."
                className="form-input"
                style={{ paddingLeft: '2.25rem', width: '260px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>
        </div>

        {/* Documents Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading document history...
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No agreement analyses found</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Upload an agreement to start analyzing clauses.
              </p>
              <Link to="/analyze" className="btn btn-primary">
                <Upload size={16} /> Analyze an Agreement
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filename</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Date</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Clauses</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Risk Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id || doc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} style={{ color: 'var(--primary-800)' }} />
                          <span>{doc.filename}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {doc.reportOverview ? `${doc.reportOverview.total_clauses} clauses` : 'Pending'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {doc.reportOverview ? (
                          <RiskBadge label={doc.reportOverview.risk_level} size="sm" />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.status}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {doc.reportId ? (
                            <Link to={`/reports/${doc.reportId}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                              Open Report
                            </Link>
                          ) : (
                            <Link to="/analyze" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                              Analyze
                            </Link>
                          )}
                          <button
                            onClick={() => setDeleteId(doc._id || doc.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '0.35rem'
                            }}
                            title="Delete document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}>
            <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Delete Document?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this document and its associated analysis report? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  onClick={() => setDeleteId(null)} 
                  disabled={isDeleting}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting}
                  className="btn btn-danger"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
