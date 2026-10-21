import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, User, Info } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-between p-6 sm:p-12">
      <header className="max-w-5xl mx-auto w-full flex justify-between items-center py-4 border-b border-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="font-bold text-xl text-[var(--color-text)]">ACCESS-EASE</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            to="/accessibility"
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            Accessibility
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            Staff Login
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto w-full my-auto py-12 text-center outline-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-primary)] mb-6">
          <Shield className="w-4 h-4" aria-hidden="true" />
          Public Library Accessibility Guidance Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-text)] tracking-tight">
          Accessible Navigation Made Seamless
        </h1>
        <p className="mt-4 text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
          Tap your RFID accessibility card to receive real-time, personalized guidance for Blind, Hearing, or Low-Vision modes at City Central Library.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
          <Link
            to="/visitor"
            className="flex flex-col items-center p-6 bg-[var(--color-surface)] rounded-xl border border-gray-300 hover:border-[var(--color-primary)] text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center mb-4">
              <User className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
              Visitor Screen &rarr;
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)] text-center">
              Active guidance display triggered by physical RFID reader taps.
            </p>
          </Link>

          <Link
            to="/login"
            className="flex flex-col items-center p-6 bg-[var(--color-surface)] rounded-xl border border-gray-300 hover:border-[var(--color-primary)] text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-gray-700 text-white flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
              Staff Portal &rarr;
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)] text-center">
              Manage libraries, areas, RFID cards, instructions, and accessibility indicators.
            </p>
          </Link>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full pt-6 border-t border-gray-300 text-center text-xs text-[var(--color-muted)] flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>&copy; {new Date().getFullYear()} ACCESS-EASE. Sample demonstration platform.</p>
        <Link to="/accessibility" className="hover:underline flex items-center gap-1">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          Accessibility Commitment
        </Link>
      </footer>
    </div>
  );
};
