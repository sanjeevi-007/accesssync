import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block ${sizeClasses} animate-spin rounded-full border-solid border-[var(--color-primary)] border-r-transparent align-[-0.125em] ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
