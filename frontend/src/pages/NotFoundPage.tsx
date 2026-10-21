import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center p-6 text-center outline-none">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] mb-4">
        <HelpCircle className="w-8 h-8" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold text-[var(--color-text)]">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)] max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 rounded text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        Return to Home
      </Link>
    </main>
  );
};
