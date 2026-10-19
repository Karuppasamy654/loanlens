import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { 
  FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Download, ArrowLeft, Search, Filter, Check, 
  ShieldCheck, HelpCircle, ExternalLink, RefreshCw 
} from 'lucide-react';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

export const AnalysisReport = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Interaction states
  const [selectedClauseIndex, setSelectedClauseIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, Normal, Needs Review, Risky, RULE_MATCHED
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient.getReport(id);
      setReport(data.report);
      setDocument(data.document);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load analysis report.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReviewed = async (clause) => {
    if (!report) return;
    setIsUpdatingReview(true);
    const newStatus = !clause.userReviewed;

    try {
      await apiClient.updateClauseReview(report._id || report.id, clause.clause_id, {
        userReviewed: newStatus
      });

      // Update local state smoothly
      setReport(prev => {
        const updatedClauses = prev.clauses.map(c => 
          c.clause_id === clause.clause_id ? { ...c, userReviewed: newStatus } : c
        );
        return { ...prev, clauses: updatedClauses };
      });
    } catch (err) {
      alert(`Failed to update review status: ${err.message}`);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const token = apiClient.getToken();
      const res = await fetch(`/api/reports/${id}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document?.filename || 'agreement'}_analysis.${format === 'markdown' ? 'md' : 'json'}`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-muted)' }}>
        Loading agreement analysis report...
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '3rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#EF4444', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Report Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{errorMsg}</p>
          <Link to="/dashboard" className="btn btn-primary">
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Filter clauses
  const clauses = report.clauses || [];
  const filteredClauses = clauses.filter(c => {
    const matchesSearch = c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (riskFilter === 'ALL') return true;
    if (riskFilter === 'RULE_MATCHED') return c.rule_match_type === 'Exact rule match' || c.rule_match_type === 'Possible rule match';
    return c.predicted_label === riskFilter;
  });

  const selectedClause = filteredClauses[selectedClauseIndex] || filteredClauses[0] || clauses[0];

  return (
    <div style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        {/* Report Workspace Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Link to="/history" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={16} />
              </Link>
              <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-900)' }}>
                {document?.filename || 'Loan Agreement'}
              </h1>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Analyzed on {new Date(report.createdAt).toLocaleDateString()} • Model: <strong>{report.modelAlgorithm}</strong> ({report.modelVersion})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => handleExport('markdown')} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.85rem' }}
            >
              <Download size={14} /> Export Markdown
            </button>
            <button 
              onClick={() => handleExport('json')} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.85rem' }}
            >
              <Download size={14} /> Export JSON
            </button>
          </div>
        </div>

        {/* Screening Summary Banner */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                SCREENING RISK INDEX
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-900)' }}>
                  {report.overview.screening_risk_index}%
                </span>
                <RiskBadge label={report.overview.risk_level} size="sm" />
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Screening index = (Risky×3 + Review×1)/(Total×3). Not probability.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Clauses</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{report.overview.total_clauses}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--risk-high-text)' }}>Risky Clauses</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--risk-high-text)' }}>
                  {report.overview.risky_count}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--risk-review-text)' }}>Needs Review</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--risk-review-text)' }}>
                  {report.overview.needs_review_count}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--risk-normal-text)' }}>Normal</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--risk-normal-text)' }}>
                  {report.overview.normal_count}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-PANE WORKSPACE */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1.2fr 1.1fr',
          gap: '1.25rem',
          minHeight: '620px'
        }}>
          {/* LEFT PANE: Clause Navigation & Filters */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '700px', overflow: 'hidden' }}>
            {/* Filter and Search header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search clauses..."
                  className="form-input"
                  style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['ALL', 'Risky', 'Needs Review', 'Normal', 'RULE_MATCHED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setRiskFilter(f); setSelectedClauseIndex(0); }}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid',
                      backgroundColor: riskFilter === f ? 'var(--primary-800)' : 'var(--bg-subtle)',
                      color: riskFilter === f ? '#FFFFFF' : 'var(--text-secondary)',
                      borderColor: riskFilter === f ? 'var(--primary-800)' : 'var(--border-light)'
                    }}
                  >
                    {f === 'RULE_MATCHED' ? 'Rule Matched' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Clause Item List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {filteredClauses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No clauses matching filter criteria.
                </div>
              ) : (
                filteredClauses.map((c, idx) => {
                  const isSelected = selectedClause?.clause_id === c.clause_id;
                  return (
                    <div
                      key={c.clause_id}
                      onClick={() => setSelectedClauseIndex(idx)}
                      style={{
                        padding: '0.75rem 0.875rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        marginBottom: '0.35rem',
                        backgroundColor: isSelected ? 'var(--primary-50)' : 'transparent',
                        border: isSelected ? '1px solid var(--primary-100)' : '1px solid transparent',
                        transition: 'background-color 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Clause {c.clause_number || idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {c.userReviewed && (
                            <span title="Reviewed by borrower" style={{ color: 'var(--risk-normal-text)' }}>
                              <Check size={12} />
                            </span>
                          )}
                          <RiskBadge label={c.predicted_label} size="sm" />
                        </div>
                      </div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4
                      }}>
                        {c.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTRE PANE: Original Clause Text & Highlight */}
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '700px', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ORIGINAL CONTRACT CLAUSE TEXT
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Clause ID: {selectedClause?.clause_id}
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>
                {selectedClause?.title || `Section ${selectedClause?.clause_number}`}
              </h3>
            </div>

            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-subtle)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9375rem',
              lineHeight: 1.8,
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              whiteSpace: 'pre-wrap'
            }}>
              {selectedClause?.text}
            </div>

            {selectedClause?.extracted_entities && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Detected Tokens:</strong>{' '}
                {selectedClause.extracted_entities.amounts?.join(', ') || 'No monetary figures'} •{' '}
                {selectedClause.extracted_entities.percentages?.join(', ') || 'No percentages'} •{' '}
                {selectedClause.extracted_entities.periods?.join(', ') || 'No tenors'}
              </div>
            )}
          </div>

          {/* RIGHT PANE: Plain-English Summary & Regulatory Evidence */}
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '700px', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ANALYSIS & BORROWER GUIDANCE
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <RiskBadge label={selectedClause?.predicted_label} size="lg" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Model Confidence: <strong>{(selectedClause?.confidence * 100).toFixed(1)}%</strong>
                </span>
              </div>
            </div>

            {/* Plain-English Summary Box */}
            <div style={{
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-100)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Plain-English Summary
              </span>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary-900)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                {selectedClause?.summary}
              </p>
              <div style={{ fontSize: '0.6875rem', color: 'var(--primary-700)', marginTop: '0.5rem', opacity: 0.8 }}>
                Generated deterministically via: {selectedClause?.summary_method}
              </div>
            </div>

            {/* Regulatory Evidence Card */}
            {selectedClause?.matched_rule ? (
              <div style={{
                backgroundColor: selectedClause.matched_rule.severity === 'Risky' ? 'var(--risk-high-bg)' : 'var(--risk-review-bg)',
                border: `1px solid ${selectedClause.matched_rule.severity === 'Risky' ? 'var(--risk-high-border)' : 'var(--risk-review-border)'}`,
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={18} style={{ color: selectedClause.matched_rule.severity === 'Risky' ? 'var(--risk-high-text)' : 'var(--risk-review-text)' }} />
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: selectedClause.matched_rule.severity === 'Risky' ? 'var(--risk-high-text)' : 'var(--risk-review-text)'
                  }}>
                    {selectedClause.matched_rule.rule_name}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <p><strong>Regulatory Source:</strong> {selectedClause.matched_rule.source_document}</p>
                  <p style={{ marginTop: '0.25rem' }}><strong>Effective Date:</strong> {selectedClause.matched_rule.effective_date}</p>
                  <p style={{ marginTop: '0.5rem' }}><strong>Severity Rationale:</strong> {selectedClause.matched_rule.severity_rationale}</p>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                    <strong>Suggested Question for Lender:</strong> <em>"{selectedClause.matched_rule.suggested_borrower_question}"</em>
                  </p>
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
                border: '1px solid var(--border-light)'
              }}>
                <strong>Rulebook Finding:</strong> No specific statutory breach flagged for this standard term.
              </div>
            )}

            {/* Mark as Reviewed Action */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Borrower Review Status:
                </span>
                <button
                  onClick={() => handleToggleReviewed(selectedClause)}
                  disabled={isUpdatingReview}
                  className={`btn ${selectedClause?.userReviewed ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                >
                  <Check size={14} />
                  <span>{selectedClause?.userReviewed ? 'Marked as Reviewed' : 'Mark as Reviewed'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
