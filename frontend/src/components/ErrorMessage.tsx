import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message?: string | null;
  code?: string | null;
  className?: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  code,
  className = '',
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 rounded bg-red-50 border border-[var(--color-danger)] text-[var(--color-danger)] flex items-start gap-3 ${className}`}
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm font-medium">
        {code && <span className="font-bold mr-1.5">[{code}]</span>}
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold underline hover:opacity-80"
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};
