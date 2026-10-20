import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';

export const VisitorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-between p-6">
      <div className="flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Home
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--color-surface)] text-[var(--color-primary)] rounded">
          Visitor Screen
        </span>
      </div>

      <main className="text-center max-w-xl mx-auto my-auto">
        <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] flex items-center justify-center mx-auto mb-6 text-[var(--color-primary)]">
          <Radio className="w-10 h-10 animate-pulse" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
          Tap your accessibility card on the reader.
        </h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Full guidance experience for Blind, Hearing, and Low-Vision modes will activate upon physical RFID tap (Phase 7).
        </p>
      </main>

      <footer className="text-center text-xs text-[var(--color-muted)]">
        City Central Library &bull; RFID Reader Ready
      </footer>
    </div>
  );
};
