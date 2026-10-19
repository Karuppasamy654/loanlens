import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiClient } from '../api/client.js';
import { 
  FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Upload, ArrowRight, Clock, PlusCircle, ExternalLink 
} from 'lucide-react';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

export const Dashboard = () => {
  const { user, stats, refreshUser } = useAuth();
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await refreshUser();
        const data = await apiClient.listDocuments({ limit: 5 });
        setRecentDocs(data.documents || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        {/* Welcome Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', color: 'var(--primary-900)' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'Borrower'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              Screen your loan agreements and inspect clause risk indicators.
            </p>
          </div>

          <Link to="/analyze" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
            <Upload size={18} />
            <span>Analyze New Agreement</span>
          </Link>
        </div>

        {/* Metrics Grid (All sourced from user's actual database records) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                COMPLETED ANALYSES
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '8px', backgroundColor: 'var(--risk-normal-bg)', color: 'var(--risk-normal-text)' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats?.completedAnalyses ?? 0}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Fully classified documents
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                PENDING REVIEW
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '8px', backgroundColor: 'var(--risk-review-bg)', color: 'var(--risk-review-text)' }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--risk-review-text)' }}>
              {stats?.clausesMarkedForReview ?? 0}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Clauses awaiting borrower verification
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                TOTAL DOCUMENTS
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '8px', backgroundColor: 'var(--primary-50)', color: 'var(--primary-700)' }}>
                <FileText size={16} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-900)' }}>
              {stats?.totalDocuments ?? 0}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Uploaded to account
            </p>
          </div>
        </div>

        {/* Recent Analyses Section */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                Recent Agreement Analyses
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Your analyzed loan agreements and risk screening reports
              </p>
            </div>
            <Link to="/history" style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--primary-800)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              View All History <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading recent documents...
            </div>
          ) : recentDocs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <FileText size={24} />
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No loan agreements uploaded yet</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                Upload your first loan agreement PDF to view clause classification, plain-English summaries, and regulatory findings.
              </p>
              <Link to="/analyze" className="btn btn-primary">
                <Upload size={16} /> Analyze an Agreement
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {recentDocs.map((doc) => (
                <div key={doc._id || doc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-800)'
                    }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()} • {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    {doc.reportOverview ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RiskBadge label={doc.reportOverview.risk_level} size="sm" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {doc.reportOverview.total_clauses} clauses
                        </span>
                      </div>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                        {doc.status}
                      </span>
                    )}

                    {doc.reportId ? (
                      <Link to={`/reports/${doc.reportId}`} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}>
                        Open Report
                      </Link>
                    ) : (
                      <Link to={`/analyze`} className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}>
                        Analyze
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
