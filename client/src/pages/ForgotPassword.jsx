import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Info, ArrowLeft } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-800)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            marginBottom: '1rem'
          }}>
            <FileText size={20} />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-900)' }}>Reset Password</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Recover access to your LoanLens account
          </p>
        </div>

        {submitted ? (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            color: '#1E40AF',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Info size={18} />
              <span>SMTP Service Notification</span>
            </div>
            <p>
              In this development environment, external SMTP email delivery is intentionally unconfigured to prevent unverified outgoing transmissions.
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
              To access your test account, please register a new local session or sign in using your existing password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Registered Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
            >
              Request Password Reset
            </button>
          </form>
        )}

        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
          borderTop: '1px solid var(--border-light)',
          paddingTop: '1.25rem'
        }}>
          <Link to="/login" style={{
            color: 'var(--primary-800)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
