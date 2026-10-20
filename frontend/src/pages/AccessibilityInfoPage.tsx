import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const AccessibilityInfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6 sm:p-12">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">
          Accessibility Commitment
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          ACCESS-EASE is designed to WCAG 2.1 AA standards, ensuring accessible guidance for all visitors.
        </p>

        <div className="mt-8 space-y-6">
          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-gray-300">
            <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--color-mode-blind)]" />
              Blind Mode
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Screen-reader optimized interface with optional Web Speech API text-to-speech synthesized audio cues and tactile step instructions.
            </p>
          </div>

          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-gray-300">
            <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--color-mode-hearing)]" />
              Hearing Mode
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              High-visibility visual notifications, unambiguous directional signage, and visual alert indicators.
            </p>
          </div>

          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-gray-300">
            <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--color-mode-lowvision)]" />
              Low-Vision Mode
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Enlarged typography, high-contrast presets (White on Black, Yellow on Black), and maximum contrast ratios.
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-300">
          <h3 className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
            Core Principles
          </h3>
          <ul className="mt-2 text-xs text-[var(--color-muted)] list-disc list-inside space-y-1">
            <li>Never use color alone to carry meaning.</li>
            <li>Visible outline on interactive elements.</li>
            <li>No autoplaying media or bouncing animations.</li>
            <li>Strict reduced motion respect.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
