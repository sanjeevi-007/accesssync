import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Ear,
  Glasses,
  Keyboard,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export const AccessibilityInfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation back */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded px-1 py-0.5"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="border-b border-gray-300 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface)] text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Conformance Statement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
            ACCESS-EASE Accessibility Conformance
          </h1>
          <p className="mt-2 text-base text-[var(--color-muted)] leading-relaxed">
            Accessibility guidance platform for public libraries. Target standard:{' '}
            <strong className="text-[var(--color-text)] font-semibold">
              Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
            </strong>
            .
          </p>
        </header>

        {/* Main Content */}
        <main id="main-content" tabIndex={-1} className="space-y-8 outline-none">
          {/* Executive Summary */}
          <section
            aria-labelledby="section-summary"
            className="p-6 bg-white rounded-lg border border-gray-300 shadow-none space-y-3"
          >
            <h2 id="section-summary" className="text-xl font-bold text-[var(--color-text)]">
              Commitment to Accessibility
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              ACCESS-EASE (AccessSync) is designed from the foundation up to provide barrier-free,
              dignified wayfinding and operational management for all visitors and staff members at
              City Central Library. We continuously evaluate our design tokens, component markup,
              keyboard navigation paths, and screen reader interactions against the World Wide Web
              Consortium (W3C) WCAG 2.1 Level AA requirements.
            </p>
          </section>

          {/* Core Technical Measures */}
          <section aria-labelledby="section-measures" className="space-y-4">
            <h2 id="section-measures" className="text-xl font-bold text-[var(--color-text)]">
              Core Accessibility Features Implemented
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature 1: Semantic Landmarks & ARIA */}
              <div className="p-5 bg-white rounded-lg border border-gray-300 space-y-2">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" aria-hidden="true" />
                  <span>Semantic HTML5 &amp; ARIA</span>
                </h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Every view utilizes standard HTML5 landmark regions (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded">header</code>, <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">nav</code>, <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">main</code>, <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">footer</code>, <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">aside</code>). Tables include proper <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">scope=&quot;col&quot;</code> headers, custom dialogs implement <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">role=&quot;dialog&quot;</code> and <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">aria-modal=&quot;true&quot;</code> with focus trapping, and dynamic event updates use polite live regions.
                </p>
              </div>

              {/* Feature 2: High Contrast & Tokens */}
              <div className="p-5 bg-white rounded-lg border border-gray-300 space-y-2">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" aria-hidden="true" />
                  <span>Color Contrast &amp; Palette</span>
                </h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Design tokens strictly enforce contrast ratios exceeding 4.5:1 for standard body text and 3:1 for large graphical elements. Color is never used as the sole conveyor of information; every operational state, indicator, and alert includes unambiguous icon and textual pairings.
                </p>
              </div>

              {/* Feature 3: Keyboard Navigation & Focus */}
              <div className="p-5 bg-white rounded-lg border border-gray-300 space-y-2">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                  <span>Keyboard Navigation</span>
                </h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  All interactive controls are accessible via keyboard with a minimum 2px visible focus ring (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded">:focus-visible</code> in primary blue #1F4E79). A skip-to-content link is present on every page as the first tab stop. Modals and dropdowns dismiss cleanly via the <kbd className="font-mono bg-gray-100 border px-1 rounded">Escape</kbd> key and restore previous focus.
                </p>
              </div>

              {/* Feature 4: Motion & Audio Preferences */}
              <div className="p-5 bg-white rounded-lg border border-gray-300 space-y-2">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" aria-hidden="true" />
                  <span>Reduced Motion &amp; No Autoplay</span>
                </h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  The application respects the <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">prefers-reduced-motion</code> system setting by eliminating auto-scroll animations and pulses. Audio cues and speech synthesis never autoplay without user initiation, and explicit Pause/Stop controls are provided.
                </p>
              </div>
            </div>
          </section>

          {/* Visitor Mode Guidance Frameworks */}
          <section aria-labelledby="section-modes" className="space-y-4">
            <h2 id="section-modes" className="text-xl font-bold text-[var(--color-text)]">
              Accessibility Modes for Library Visitors
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-[var(--color-surface)] rounded-lg border border-gray-300 space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-mode-blind)] font-bold text-sm">
                  <Eye className="w-5 h-5" aria-hidden="true" />
                  <span>Blind Mode</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Single H1 header, landmark skip links, sequential numbered steps, obstacle callouts marked with <code className="font-mono bg-white px-1 py-0.5 rounded">role=&quot;alert&quot;</code>, and full Web Speech API text-to-speech integration.
                </p>
              </div>

              <div className="p-5 bg-[var(--color-surface)] rounded-lg border border-gray-300 space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-mode-hearing)] font-bold text-sm">
                  <Ear className="w-5 h-5" aria-hidden="true" />
                  <span>Hearing Mode</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  High-visibility visual alert banners, clear facility and elevator status panels, numbered emergency paths, and prominent directional text cards without reliance on auditory announcements.
                </p>
              </div>

              <div className="p-5 bg-[var(--color-surface)] rounded-lg border border-gray-300 space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-mode-lowvision)] font-bold text-sm">
                  <Glasses className="w-5 h-5" aria-hidden="true" />
                  <span>Low-Vision Mode</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Base typography starting at 24px with user-switchable zoom up to 200%, high-contrast themes (White on Black, Yellow on Black), large 56px touch targets, and high-visibility obstruction borders.
                </p>
              </div>
            </div>
          </section>

          {/* Honest Known Limitations */}
          <section
            aria-labelledby="section-limitations"
            className="p-6 bg-amber-50 rounded-lg border border-amber-300 space-y-3 text-amber-950"
          >
            <h2 id="section-limitations" className="text-lg font-bold flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" aria-hidden="true" />
              <span>Known Limitations &amp; Roadmap</span>
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed">
              We believe in honest, transparent reporting of accessibility capabilities. The following aspects are subject to active ongoing development:
            </p>
            <ul className="text-xs text-amber-900 list-disc list-inside space-y-1.5 pt-1">
              <li>
                <strong>Physical Hardware Testing:</strong> Real-time screen reader integration testing with the physical ESP32 and RC522 RFID reader hardware is pending Phase 11 end-to-end deployment.
              </li>
              <li>
                <strong>On-Site Physical Environment:</strong> Tactile ground indicators, tactile maps, physical signage contrast, and architectural lighting (300+ lux) require manual evaluation by a trained accessibility assessor at City Central Library.
              </li>
              <li>
                <strong>Assessment Score Indicator:</strong> The accessibility score displayed across reports and dashboards is an <em>internal assessment indicator</em>, not a certified rating from an external standards body or ISO auditor.
              </li>
              <li>
                <strong>Browser Speech Synthesis:</strong> Voice quality, pitch, and accent options depend on the visitor&apos;s local operating system and browser synthesis engine.
              </li>
            </ul>
          </section>

          {/* Feedback & Contact */}
          <section
            aria-labelledby="section-feedback"
            className="p-6 bg-white rounded-lg border border-gray-300 space-y-3"
          >
            <h2 id="section-feedback" className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
              <span>Feedback &amp; Reporting Accessibility Barriers</span>
            </h2>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              If you experience any accessibility barriers while using ACCESS-EASE or have suggestions for improving our wayfinding guidance, please contact City Central Library accessibility staff at the main reception desk or submit an internal ticket through the Staff Portal.
            </p>
            <p className="text-xs text-[var(--color-muted)] pt-2 border-t border-gray-200">
              Conformance statement published: <span className="font-semibold text-[var(--color-text)]">October 2026</span> &bull; Evaluated using <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">@axe-core/react</code> automated audits and manual keyboard navigation reviews.
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-300 text-center text-xs text-[var(--color-muted)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ACCESS-EASE &bull; City Central Library Accessibility Guidance Platform</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:underline text-[var(--color-primary)]">
              Staff Login
            </Link>
            <Link to="/visitor" className="hover:underline text-[var(--color-primary)]">
              Visitor Screen
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
