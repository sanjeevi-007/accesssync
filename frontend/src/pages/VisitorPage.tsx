import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveScans } from '../hooks/useLiveScans';
import type { LiveScanEvent, ScanInstruction } from '../hooks/useLiveScans';
import { BlindView } from '../modes/BlindView';
import { HearingView } from '../modes/HearingView';
import { LowVisionView } from '../modes/LowVisionView';
import { Radio, AlertCircle } from 'lucide-react';

export const VisitorPage: React.FC = () => {
  const { latestScan } = useLiveScans();

  // Active view state
  const [activeScan, setActiveScan] = useState<LiveScanEvent | null>(null);
  const [isRejected, setIsRejected] = useState<boolean>(false);

  // Inactivity / Reset timer ref
  const timerRef = useRef<number | null>(null);

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Return to idle state helper
  const resetToIdle = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveScan(null);
    setIsRejected(false);
  }, []);

  // React to new live scan events
  useEffect(() => {
    if (!latestScan) return;

    // Clear any previous countdown
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (latestScan.result === 'accepted') {
      setIsRejected(false);
      setActiveScan(latestScan);

      // Start 60-second inactivity timer for accepted scan
      timerRef.current = window.setTimeout(() => {
        resetToIdle();
      }, 60000);
    } else {
      // Rejected scan
      setActiveScan(null);
      setIsRejected(true);

      // Start 10-second timer to return to idle
      timerRef.current = window.setTimeout(() => {
        resetToIdle();
      }, 10000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [latestScan, resetToIdle]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // 1. REJECTED STATE: Neutral message, no private data, 10s auto-reset
  if (isRejected) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-between p-6 sm:p-12">
        <header className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            ACCESS-EASE &bull; City Central Library
          </span>
        </header>

        <main className="text-center max-w-xl mx-auto my-auto space-y-6">
          <div
            role="alert"
            aria-live="assertive"
            className="p-8 rounded-xl bg-white border-3 border-amber-500 shadow-md space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" aria-hidden="true" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              Card not recognized.
            </h1>

            <p className="text-lg text-[var(--color-muted)] leading-relaxed">
              Card not recognized. Please try again or ask staff for help.
            </p>

            <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              Screen will reset automatically in a few seconds...
            </p>
          </div>
        </main>

        <footer className="text-center text-xs text-[var(--color-muted)]">
          Reception staff are available at the main entrance desk to assist you.
        </footer>
      </div>
    );
  }

  // 2. ACCEPTED SCAN STATE: Route to the matching mode view
  if (activeScan && activeScan.result === 'accepted') {
    const mode = activeScan.mode?.toLowerCase();
    const instructions: ScanInstruction[] = activeScan.instructions || [];

    if (mode === 'blind') {
      return (
        <BlindView
          instructions={instructions}
          onResetToIdle={resetToIdle}
        />
      );
    }

    if (mode === 'hearing') {
      return (
        <HearingView
          instructions={instructions}
          onResetToIdle={resetToIdle}
        />
      );
    }

    if (mode === 'low_vision') {
      return (
        <LowVisionView
          instructions={instructions}
          onResetToIdle={resetToIdle}
        />
      );
    }

    // Fallback if mode is unrecognized
    return (
      <LowVisionView
        instructions={instructions}
        onResetToIdle={resetToIdle}
      />
    );
  }

  // 3. IDLE STATE (Default): Full-screen centered display
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-between p-6 sm:p-12 select-none">
      <header className="text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          ACCESS-EASE &bull; City Central Library
        </span>
      </header>

      <main className="text-center max-w-xl mx-auto my-auto space-y-6">
        {/* Subtle pulsing icon (no pulse if prefers-reduced-motion) */}
        <div
          className="w-24 h-24 rounded-full bg-white border-4 border-[var(--color-primary)] flex items-center justify-center mx-auto shadow-md"
          role="presentation"
        >
          <Radio
            className={`w-12 h-12 text-[var(--color-primary)] ${
              prefersReducedMotion ? '' : 'animate-pulse'
            }`}
            aria-hidden="true"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight leading-snug">
          Tap your accessibility card on the reader.
        </h1>

        <p className="text-base sm:text-lg text-[var(--color-muted)] max-w-md mx-auto">
          Hold your card near the reader to activate personalized wayfinding in your accessibility mode.
        </p>
      </main>

      <footer className="text-center text-xs text-[var(--color-muted)] space-y-1">
        <p>City Central Library Accessibility Guidance Terminal &bull; Active &amp; Ready</p>
        <p>Supports Blind, Hearing, and Low-Vision accessibility guidance.</p>
      </footer>
    </div>
  );
};
