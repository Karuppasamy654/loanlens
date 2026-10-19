import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export const RiskBadge = ({ label, size = 'sm' }) => {
  const norm = (label || '').toLowerCase();

  if (norm.includes('risky') || norm.includes('high')) {
    return (
      <span className="badge badge-risky">
        <AlertCircle size={size === 'lg' ? 14 : 12} />
        <span>Risky</span>
      </span>
    );
  }

  if (norm.includes('review') || norm.includes('attention') || norm.includes('moderate')) {
    return (
      <span className="badge badge-review">
        <AlertTriangle size={size === 'lg' ? 14 : 12} />
        <span>Needs Review</span>
      </span>
    );
  }

  if (norm.includes('normal') || norm.includes('low') || norm.includes('fair')) {
    return (
      <span className="badge badge-normal">
        <CheckCircle2 size={size === 'lg' ? 14 : 12} />
        <span>Normal</span>
      </span>
    );
  }

  return (
    <span className="badge" style={{ backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}>
      <HelpCircle size={size === 'lg' ? 14 : 12} />
      <span>{label || 'Unclassified'}</span>
    </span>
  );
};
