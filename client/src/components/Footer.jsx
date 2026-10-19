import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info, ExternalLink } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: '2.5rem',
      paddingBottom: '2.5rem',
      marginTop: 'auto'
    }}>
      <div className="max-w-7xl">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h4 style={{ fontSize: '1.125rem', color: 'var(--primary-800)', marginBottom: '0.75rem' }}>
              LoanLens
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '320px' }}>
              Understand every clause before you sign. Transparent borrower awareness, screening aids, and explainable risk analysis.
            </p>
          </div>

          <div>
            <h5 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dataset Provenance
            </h5>
            <ul style={{ listStyle: 'none', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <a href="http://claudette.eui.eu/" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  CLAUDETTE ToS Corpus (EUI) <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a href="https://github.com/The-Atticus-Project/cuad" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  CUAD v1 Dataset (Atticus Project) <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <span>Curated Public Loan Domain Benchmark Set</span>
              </li>
            </ul>
          </div>

          <div>
            <h5 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Academic & Syllabus
            </h5>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Models restricted to approved syllabus algorithms: Logistic Regression, Linear SVM, CART Decision Tree, and Multinomial Naive Bayes with TF-IDF representation.
            </p>
          </div>
        </div>

        {/* Regulatory & Educational Disclaimer */}
        <div style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <p>
            <strong>LEGAL DISCLAIMER:</strong> LoanLens is an educational awareness and screening aid designed to assist borrowers in identifying contractual provisions worthy of professional legal consultation. It does NOT constitute legal advice or formal statutory compliance verification.
          </p>
          <p>
            &copy; {new Date().getFullYear()} LoanLens Project. All datasets utilized under respective Creative Commons licenses.
          </p>
        </div>
      </div>
    </footer>
  );
};
