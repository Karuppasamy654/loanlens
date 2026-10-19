import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Shield, Clock, Database, LogOut, Info } from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

export const Settings = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--primary-900)', marginBottom: '0.25rem' }}>
            Account & System Settings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Profile details, document retention policies, and responsible AI disclosures
          </p>

          {/* User Profile Card */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--primary-800)' }} />
              User Profile
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name:</span>
              <span style={{ fontWeight: 600 }}>{user?.name || 'N/A'}</span>

              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <span style={{ fontWeight: 600 }}>{user?.email || 'N/A'}</span>

              <span style={{ color: 'var(--text-muted)' }}>Role:</span>
              <span style={{ textTransform: 'capitalize' }}>{user?.role || 'Borrower (Standard)'}</span>
            </div>
          </div>

          {/* Document Retention & Privacy Policy */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--primary-800)' }} />
              Document Retention & Privacy Policy
            </h3>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>
                <strong>Local Storage Isolation:</strong> Uploaded agreement documents are stored securely on your server instance with SHA-256 integrity verification. Documents are accessible strictly by their authenticated owner.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>No Third-Party Transmission:</strong> Loan agreement text is processed solely by the internal FastAPI machine learning service. Your contracts are never sent to external commercial LLM APIs, cloud prediction endpoints, or unverified intermediaries.
              </p>
            </div>
          </div>

          {/* Machine Learning Constraints Disclosure */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} style={{ color: 'var(--primary-800)' }} />
              ML Processing & Scope Disclosures
            </h3>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>
                • <strong>Algorithm Scope:</strong> Primary risk screening is performed by classical syllabus algorithms (Logistic Regression, Linear Support Vector Machine, CART Decision Tree, Naive Bayes) with TF-IDF n-gram vectorization.
              </p>
              <p style={{ marginTop: '0.35rem' }}>
                • <strong>Regulatory Grounding:</strong> Warnings cite verified Reserve Bank of India (RBI) notifications and Supreme Court rulings. Flags are informational screening indicators, not legal determinations.
              </p>
            </div>
          </div>

          {/* Session Logout Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={logout} className="btn btn-secondary">
              <LogOut size={16} /> Sign Out of Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
