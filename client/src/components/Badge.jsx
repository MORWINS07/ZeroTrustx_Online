import React from 'react';

/**
 * Enterprise Badge Component
 * @param {'neutral' | 'info' | 'success' | 'warning' | 'danger'} variant
 */
export default function Badge({ children, variant = 'neutral', dot = false, className = '', ...props }) {
  const dotColorClass = {
    neutral: 'status-dot-neutral',
    info: 'status-dot-info',
    success: 'status-dot-success',
    warning: 'status-dot-warning',
    danger: 'status-dot-danger',
  }[variant] || 'status-dot-neutral';

  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {dot && <span className={`status-dot ${dotColorClass}`} />}
      {children}
    </span>
  );
}
