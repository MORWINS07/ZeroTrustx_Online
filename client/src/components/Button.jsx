import React from 'react';

/**
 * Enterprise Button Component (Apple Cupertino Style)
 * @param {'primary' | 'secondary' | 'destructive' | 'ghost'} variant
 * @param {'sm' | 'md' | 'lg'} size
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  className = '',
  'data-testid': testId,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const fullClass = fullWidth ? 'btn-full' : '';

  return (
    <button
      className={`btn btn-${variant} ${sizeClass} ${fullClass} ${className}`}
      disabled={disabled || loading}
      data-testid={testId}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
