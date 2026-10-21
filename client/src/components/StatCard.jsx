import React from 'react';

/**
 * Enterprise StatCard Component (Restrained metrics)
 */
export default function StatCard({ label, value, subtext, icon, trend, 'data-testid': testId }) {
  return (
    <div className="stat-card" data-testid={testId}>
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
