import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, FileSearch, CheckCircle2, AlertTriangle, 
  ArrowRight, BookOpen, Lock, Sparkles, Scale 
} from 'lucide-react';
import { RiskBadge } from '../components/RiskBadge.jsx';

export const LandingPage = () => {
  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section style={{
        paddingTop: '4.5rem',
        paddingBottom: '4.5rem',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="max-w-7xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                border: '1px solid var(--primary-100)'
              }}>
                <Scale size={14} />
                <span>Borrower Awareness & Risk Screening AI</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)',
                lineHeight: 1.15,
                marginBottom: '1.25rem',
                color: 'var(--primary-900)'
              }}>
                Understand every clause before you sign.
              </h1>

              <p style={{
                fontSize: '1.125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '2rem',
                maxWidth: '540px'
              }}>
                LoanLens extracts and analyzes loan agreement contracts. It flags potentially restrictive clauses, explains complex legal jargon in plain English, and maps provisions to official Reserve Bank of India (RBI) guidelines.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <Link to="/analyze" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
                  Analyze an Agreement <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                  Explore How It Works
                </a>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Educational screening aid. Strictly syllabus-approved ML algorithms. No hidden LLM dependencies.
              </p>
            </div>

            {/* Product Preview Card */}
            <div>
              <div className="card" style={{ padding: '1.75rem', border: '1px solid #E2E8F0', position: 'relative' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Home_Loan_Agreement.pdf • Clause 3
                    </span>
                  </div>
                  <RiskBadge label="Risky" size="sm" />
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  marginBottom: '1rem',
                  borderLeft: '3px solid #EF4444'
                }}>
                  "The Borrower shall pay a prepayment penalty and foreclosure fee of <strong>3.5%</strong> on early closure or refinancing of this <strong>floating rate</strong> housing loan."
                </div>

                <div style={{
                  backgroundColor: 'var(--risk-high-bg)',
                  border: '1px solid var(--risk-high-border)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--risk-high-text)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <ShieldCheck size={16} />
                    <span>RBI Regulatory Conflict Detected</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#7F1D1D', lineHeight: 1.5 }}>
                    <strong>RBI Circular RBI/2014-15/60:</strong> Banks and NBFCs are strictly prohibited from levying foreclosure charges or prepayment penalties on floating rate term loans to individual borrowers.
                  </p>
                </div>

                <div style={{
                  backgroundColor: 'var(--primary-50)',
                  border: '1px solid var(--primary-100)',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Plain-English Summary
                  </span>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--primary-900)', marginTop: '0.25rem' }}>
                    Prepaying or closing this loan early requires paying a foreclosure fee of 3.5%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <div className="max-w-7xl">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--primary-900)' }}>
              Engineered for Borrower Transparency
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              Traditional loan agreements are intentionally lengthy and filled with opaque legal provisions. LoanLens provides automated, explainable screening.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.75rem'
          }}>
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <FileSearch size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Clause-by-Clause Classification</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Segments your agreement into individual legal covenants and classifies them into Normal, Needs Review, and Risky using university syllabus algorithms.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--risk-review-bg)',
                color: 'var(--risk-review-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Scale size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Regulatory Rule Engine</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Cross-references provisions against official RBI publications on prepayment penalties, penal interest capitalization, and fair lending practices.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--risk-normal-bg)',
                color: 'var(--risk-normal-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <BookOpen size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Deterministic Summaries</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Extractive and template-based summaries preserve exact numbers, fees, and obligations without hallucinating facts or legal interpretations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section id="how-it-works" style={{
        paddingTop: '5rem',
        paddingBottom: '5rem',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="max-w-7xl">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--primary-900)' }}>
              Four-Step Analysis Workflow
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Transparent document processing from upload to plain-English report.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { step: '01', title: 'Upload Agreement', desc: 'Securely upload your digital PDF agreement. File validation ensures integrity.' },
              { step: '02', title: 'Segmentation', desc: 'Document is parsed page-by-page and segmented into distinct legal clauses.' },
              { step: '03', title: 'AI & Rule Evaluation', desc: 'Syllabus models and versioned RBI rulebook evaluate each covenant.' },
              { step: '04', title: 'Interactive Review', desc: 'Inspect findings, plain-English summaries, questions for lenders, and export.' }
            ].map((s, idx) => (
              <div key={idx} style={{ padding: '1.5rem', borderLeft: '2px solid var(--primary-600)' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--primary-600)',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  STEP {s.step}
                </span>
                <h4 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{s.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Syllabus ML Transparency Banner */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="max-w-7xl">
          <div className="card" style={{
            padding: '2.5rem',
            backgroundColor: 'var(--primary-900)',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-100)' }}>
              <Scale size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Academic & Syllabus Integrity
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', color: '#FFFFFF' }}>
              Standard Machine Learning Without Black-Box LLMs
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#D1D5DB', lineHeight: 1.6, maxWidth: '780px' }}>
              LoanLens adheres strictly to classical university curriculum algorithms: Logistic Regression, Linear Support Vector Machine, CART Decision Trees, and Multinomial Naive Bayes trained on genuine human-annotated datasets (CLAUDETTE, CUAD, and a curated Loan Domain Benchmark).
            </p>
            <div>
              <Link to="/research" className="btn" style={{
                backgroundColor: '#FFFFFF',
                color: 'var(--primary-900)',
                fontWeight: 600
              }}>
                View Genuine Model Comparison & Benchmarks <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
