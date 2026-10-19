import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerBanner = () => {
  return (
    <div className="notice-banner" style={{ marginBottom: '1.25rem' }}>
      <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#B45309' }} />
      <div>
        <p style={{ fontWeight: 600, marginBottom: '2px' }}>
          Educational & Screening Aid Disclaimer
        </p>
        <p style={{ fontSize: '0.75rem', lineHeight: 1.5, opacity: 0.9 }}>
          LoanLens uses machine learning and regulatory rule matching to flag clauses that warrant scrutiny. Output does not constitute formal legal counsel. Always consult a qualified legal professional before signing credit contracts.
        </p>
      </div>
    </div>
  );
};
