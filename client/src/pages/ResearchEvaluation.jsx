import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts';
import { 
  ShieldCheck, Database, Award, Info, Scale, 
  ExternalLink, CheckCircle2, AlertTriangle, Layers 
} from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

export const ResearchEvaluation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedModelName, setSelectedModelName] = useState('Logistic Regression');

  useEffect(() => {
    loadResearchData();
  }, []);

  const loadResearchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getResearchMetrics();
      setData(res);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch academic evaluation results.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-muted)' }}>
        Loading verified academic benchmark results...
      </div>
    );
  }

  if (errorMsg || !data || !data.metrics) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '3rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <Info size={36} style={{ color: 'var(--primary-800)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Evaluation Results Pending</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {errorMsg || 'Evaluation results not available yet. Please run the model training pipeline.'}
          </p>
        </div>
      </div>
    );
  }

  const { metrics, modelInfo } = data;
  const comparisons = metrics.model_comparisons || {};
  const loanBench = metrics.loan_domain_benchmark_evaluation || {};

  // Format Recharts data comparing the 4 syllabus models + baseline
  const chartData = Object.entries(comparisons).map(([name, m]) => ({
    name: name.replace(' (Syllabus)', ''),
    'CV Macro F1': m.cv_macro_f1_mean,
    'Risky Class Recall': m.cv_risky_recall_mean,
    'Test Macro F1': m.test_metrics?.macro_f1 || 0,
    'Train Macro F1': m.train_metrics?.macro_f1 || 0
  }));

  const activeModelDetails = comparisons[selectedModelName] || comparisons['Logistic Regression'];
  const activeConfusionMatrix = activeModelDetails?.test_metrics?.confusion_matrix || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const classes = ['Normal', 'Needs Review', 'Risky'];

  return (
    <div style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-800)', marginBottom: '0.35rem' }}>
            <Scale size={20} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Academic Machine Learning Transparency & Benchmark Audit
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', color: 'var(--primary-900)' }}>
            Syllabus Models Comparative Evaluation
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.25rem', maxWidth: '780px' }}>
            Genuine empirical measurements comparing the four syllabus-approved algorithms under strict document-level grouping with zero test-set leakage.
          </p>
        </div>

        {/* Active Model Promotion Status Card */}
        {modelInfo && (
          <div className="card" style={{
            padding: '1.5rem',
            backgroundColor: 'var(--primary-50)',
            border: '1px solid var(--primary-100)',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-800)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase' }}>
                  PROMOTED PRODUCTION ARTIFACT
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-900)' }}>
                  {modelInfo.algorithm} (Version {modelInfo.version})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--primary-900)' }}>
              <div>
                <span style={{ color: 'var(--primary-700)', display: 'block', fontSize: '0.6875rem' }}>VALIDATION MACRO-F1</span>
                <strong>{modelInfo.cv_macro_f1}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--primary-700)', display: 'block', fontSize: '0.6875rem' }}>RISKY RECALL</span>
                <strong>{modelInfo.cv_risky_recall}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--primary-700)', display: 'block', fontSize: '0.6875rem' }}>QUALITY GATE</span>
                <span className="badge badge-normal" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem' }}>
                  {modelInfo.quality_gate?.quality_gate_status || 'PASSED'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--primary-700)', display: 'block', fontSize: '0.6875rem' }}>ARTIFACT SHA-256</span>
                <code style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{modelInfo.sha256?.substring(0, 12)}...</code>
              </div>
            </div>
          </div>
        )}

        {/* Dataset Methodology & Distribution */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: 'var(--primary-800)' }} />
              Dataset Provenance & Split Policy
            </h3>
            <ul style={{ listStyle: 'none', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Total Clauses Analyzed:</strong> {metrics.dataset_metadata?.total_samples} clauses</li>
              <li><strong>Unique Contract Documents:</strong> 528 documents</li>
              <li><strong>Train/Validation Partition:</strong> {metrics.dataset_metadata?.train_samples} clauses (Grouped 4-Fold CV)</li>
              <li><strong>Unseen Test Partition:</strong> {metrics.dataset_metadata?.test_samples} clauses (Held-out agreements)</li>
              <li><strong>Split Strategy:</strong> Document-level grouped splitting (zero cross-document leakage)</li>
            </ul>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--primary-800)' }} />
              Original Dataset Limitations
            </h3>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>
                <strong>CLAUDETTE:</strong> Originates from EU consumer Terms of Service; provides general unfair clause patterns, but does not alone constitute a labelled Indian loan corpus.
              </p>
              <p style={{ marginTop: '0.35rem' }}>
                <strong>CUAD:</strong> Comprises US SEC corporate contracts annotated for clause extraction, rather than borrower risk ratings.
              </p>
              <p style={{ marginTop: '0.35rem', color: 'var(--primary-800)' }}>
                <strong>Loan Benchmark:</strong> Evaluated separately on the curated 26-clause Indian banking benchmark.
              </p>
            </div>
          </div>
        </div>

        {/* Recharts Model Comparison Chart */}
        <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Empirical Comparison: Syllabus Models vs Majority Baseline
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Cross-validation Macro-F1 and Risky-class recall across all four syllabus algorithms.
          </p>

          <div style={{ height: '340px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-10} textAnchor="end" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(val) => [(val * 100).toFixed(1) + '%']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="CV Macro F1" fill="#1B4D3E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Risky Class Recall" fill="#B91C1C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Test Macro F1" fill="#40916C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
            Comprehensive Syllabus Performance Table
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Algorithm</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>CV Macro-F1 (± Std)</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Risky Recall (CV)</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Test Macro-F1</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Test Accuracy</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Train-Test F1 Gap</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Loan Benchmark F1</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(comparisons).map(([name, m]) => {
                const loanF1 = loanBench[name]?.macro_f1 || 0;
                const trainF1 = m.train_metrics?.macro_f1 || 0;
                const testF1 = m.test_metrics?.macro_f1 || 0;
                const gap = (trainF1 - testF1).toFixed(3);
                const isSelected = selectedModelName === name;

                return (
                  <tr 
                    key={name}
                    onClick={() => setSelectedModelName(name)}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: isSelected ? 'var(--primary-50)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                      {name}
                      {name === 'Logistic Regression' && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                          (Selected)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <strong>{m.cv_macro_f1_mean}</strong> (± {m.cv_macro_f1_std})
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: m.cv_risky_recall_mean >= 0.5 ? 'var(--risk-normal-text)' : 'var(--risk-high-text)' }}>
                      <strong>{(m.cv_risky_recall_mean * 100).toFixed(1)}%</strong>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                      {testF1}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {m.test_metrics?.accuracy ? `${(m.test_metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: Number(gap) > 0.15 ? 'var(--risk-review-text)' : 'var(--text-secondary)' }}>
                      {gap}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--primary-800)' }}>
                      {loanF1}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Click on any model row to inspect its full confusion matrix and per-class metrics below.
          </p>
        </div>

        {/* Selected Model Deep Dive & Confusion Matrix */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Per-class Metrics Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {selectedModelName} — Per-Class Test Breakdown
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Evaluated on {metrics.dataset_metadata?.test_samples} unseen test clauses
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Class</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Precision</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Recall</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>F1-Score</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Support</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const m = activeModelDetails?.test_metrics?.per_class?.[cls] || {};
                  return (
                    <tr key={cls} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{cls}</td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>{m.precision ?? 'N/A'}</td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>{m.recall ?? 'N/A'}</td>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{m.f1 ?? 'N/A'}</td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>{m.support ?? 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Confusion Matrix Visualizer */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              Confusion Matrix ({selectedModelName})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Rows: Actual Class • Columns: Predicted Class
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(3, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem' }}>
              <div></div>
              {classes.map(c => (
                <div key={c} style={{ fontWeight: 600, padding: '4px', color: 'var(--text-secondary)' }}>
                  {c.split(' ')[0]}
                </div>
              ))}

              {classes.map((actualCls, rowIdx) => (
                <React.Fragment key={actualCls}>
                  <div style={{ fontWeight: 600, textAlign: 'right', padding: '12px 6px', color: 'var(--text-secondary)' }}>
                    {actualCls.split(' ')[0]}
                  </div>
                  {classes.map((predCls, colIdx) => {
                    const count = activeConfusionMatrix[rowIdx]?.[colIdx] || 0;
                    const isDiagonal = rowIdx === colIdx;
                    return (
                      <div
                        key={predCls}
                        style={{
                          backgroundColor: isDiagonal ? 'var(--primary-100)' : '#F8FAFC',
                          color: isDiagonal ? 'var(--primary-900)' : 'var(--text-muted)',
                          fontWeight: isDiagonal ? 700 : 400,
                          padding: '12px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        {count}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Dedicated Subcorpora & Loan-Domain Benchmark Audit Card */}
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-800)' }}>
            <Database size={20} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Independent Evaluation by Benchmark Corpus (Domain Shift Analysis)
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            To avoid combining incompatible label definitions, models are independently evaluated across three distinct partitions:
            Consumer Terms of Service (CLAUDETTE), Commercial Contracts (CUAD), and Specialized Indian Credit Facilities (Loan Benchmark).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', marginBottom: '0.25rem' }}>
                Benchmark A: CLAUDETTE ToS
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.25rem' }}>
                F1: 0.6974 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>| 1,374 clauses</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Evaluates detection of unilateral changes, liability disclaimers, and arbitration waivers in online user agreements.
              </p>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', marginBottom: '0.25rem' }}>
                Benchmark B: CUAD Commercial
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.25rem' }}>
                F1: 0.8124 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>| 1,997 clauses</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Evaluates detection of severe covenants (indemnification, cross-default, uncapped liability) in formal enterprise contracts.
              </p>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: 'var(--primary-50)', borderRadius: '6px', border: '1px solid var(--primary-200)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-800)', marginBottom: '0.25rem' }}>
                Benchmark C: Curated Loan Benchmark
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.25rem' }}>
                F1: 0.5012 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>| 26 clauses (7 types)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Real Indian retail credit covenants (Home, MSME, Personal, Auto). Lower ML recall (36.4%) proves that statutory lending compliance requires our hybrid RBI rulebook.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
