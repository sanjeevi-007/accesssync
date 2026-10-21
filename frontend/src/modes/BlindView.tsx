import React, { useEffect, useMemo } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import type { ScanInstruction } from '../hooks/useLiveScans';
import { Volume2, Pause, Square, AlertTriangle, ArrowLeft } from 'lucide-react';

interface BlindViewProps {
  instructions: ScanInstruction[];
  areaName?: string;
  onResetToIdle?: () => void;
}

export const BlindView: React.FC<BlindViewProps> = ({
  instructions,
  areaName,
  onResetToIdle,
}) => {
  const { speak, pause, stop, isSpeaking, isPaused, isSupported } = useSpeech();

  // Resolve area name from instructions title or default
  const resolvedAreaName = useMemo(() => {
    if (areaName && areaName.trim()) return areaName;
    if (instructions.length > 0 && instructions[0].title) {
      const parts = instructions[0].title.split(' - ');
      return parts[0].trim();
    }
    return 'Main Entrance (City Central Library)';
  }, [areaName, instructions]);

  // Detect obstacle warnings
  const obstacleInstructions = useMemo(() => {
    const keywords = ['obstacle', 'step', 'stairs', 'caution', 'warning', 'careful', 'barrier', 'faded', 'curb'];
    return instructions.filter((inst) =>
      keywords.some((kw) => inst.content.toLowerCase().includes(kw) || inst.title.toLowerCase().includes(kw))
    );
  }, [instructions]);

  // Full transcript for Read Aloud
  const fullSpeechText = useMemo(() => {
    const header = `Guidance for ${resolvedAreaName}. Mode: Blind accessibility navigation.`;
    const steps = instructions
      .map((inst, idx) => `Step ${idx + 1}: ${inst.title}. ${inst.content}`)
      .join(' ');
    const footer = 'End of guidance. For personal assistance, staff are available at the reception desk.';
    return `${header} ${steps} ${footer}`;
  }, [resolvedAreaName, instructions]);

  // Read Aloud handler
  const handleReadAloud = () => {
    speak(fullSpeechText);
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-between p-6 sm:p-10 font-sans">
      {/* Skip Link for Screen Readers */}
      <a
        href="#instructions-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg font-bold"
      >
        Skip to instructions
      </a>

      {/* Semantic Landmark: HEADER */}
      <header className="border-b-2 border-gray-400 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted)]">
              ACCESS-EASE &bull; Public Library Accessibility
            </span>
            {/* Exactly one H1 with the area name */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] mt-1 tracking-tight">
              {resolvedAreaName}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="px-3.5 py-1.5 rounded-md font-bold text-sm bg-teal-100 text-[var(--color-mode-blind)] border-2 border-teal-600"
              role="status"
            >
              Mode: Blind
            </span>
            {onResetToIdle && (
              <button
                type="button"
                onClick={onResetToIdle}
                className="inline-flex items-center gap-1.5 text-base font-semibold px-4 py-2 border-2 border-gray-400 rounded hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]"
                aria-label="Return to card tap idle screen"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                <span>Tap New Card</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Semantic Landmark: NAV (Speech & Control Tools) */}
      <nav
        aria-label="Audio guidance controls"
        className="bg-white border-2 border-gray-400 rounded-lg p-5 mb-8 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-[var(--color-mode-blind)]" aria-hidden="true" />
            <span className="text-lg font-bold text-[var(--color-text)]">
              Voice Navigation Controls:
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReadAloud}
              disabled={!isSupported}
              className="min-h-[52px] px-6 py-3 bg-[var(--color-mode-blind)] text-white text-lg font-bold rounded hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-teal-300 disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
              aria-label="Read all navigation instructions aloud"
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" />
              <span>{isSpeaking && !isPaused ? 'Replay Guidance' : 'Read Aloud'}</span>
            </button>

            <button
              type="button"
              onClick={pause}
              disabled={!isSpeaking || isPaused}
              className="min-h-[52px] px-5 py-3 border-2 border-gray-500 bg-white text-lg font-bold text-[var(--color-text)] rounded hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-40 inline-flex items-center gap-2"
              aria-label="Pause audio guidance"
            >
              <Pause className="w-5 h-5" aria-hidden="true" />
              <span>Pause</span>
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={!isSpeaking}
              className="min-h-[52px] px-5 py-3 border-2 border-gray-500 bg-white text-lg font-bold text-[var(--color-text)] rounded hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-40 inline-flex items-center gap-2"
              aria-label="Stop audio guidance"
            >
              <Square className="w-5 h-5" aria-hidden="true" />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Live speech feedback banner */}
        {isSpeaking && (
          <div
            className="mt-3 text-sm font-semibold text-teal-900 bg-teal-50 px-3 py-1.5 rounded border border-teal-300 inline-block"
            aria-live="polite"
          >
            {isPaused ? 'Audio paused.' : 'Reading guidance aloud...'}
          </div>
        )}
      </nav>

      {/* Semantic Landmark: MAIN */}
      <main id="instructions-main" className="flex-1 space-y-8 max-w-4xl">
        {/* aria-live="assertive" region announces new guidance immediately */}
        <div aria-live="assertive" aria-atomic="true" className="sr-only">
          {`Guidance activated for ${resolvedAreaName}. ${instructions.length} steps available. Press Read Aloud or use screen reader navigation.`}
        </div>

        {/* Obstacle warnings with role="alert" */}
        {obstacleInstructions.length > 0 && (
          <section aria-labelledby="obstacle-alert-heading">
            <div
              role="alert"
              className="p-5 rounded-lg border-3 border-red-600 bg-red-50 text-red-950 flex items-start gap-4 shadow-xs"
            >
              <AlertTriangle className="w-8 h-8 text-[var(--color-danger)] shrink-0 mt-1" aria-hidden="true" />
              <div className="space-y-1">
                <h2 id="obstacle-alert-heading" className="text-xl font-extrabold text-[var(--color-danger)]">
                  Obstacle &amp; Physical Safety Notice
                </h2>
                {obstacleInstructions.map((obs) => (
                  <p key={`obs-${obs.id}`} className="text-lg font-medium text-red-900">
                    {obs.content}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Instructions ordered list */}
        <section aria-labelledby="steps-heading" className="space-y-6">
          <h2 id="steps-heading" className="text-2xl font-bold text-[var(--color-text)] border-b border-gray-300 pb-2">
            Step-by-Step Wayfinding Guidance ({instructions.length} {instructions.length === 1 ? 'Step' : 'Steps'})
          </h2>

          {instructions.length === 0 ? (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 text-xl">
              <p>No specific instructions recorded for this location. Reception desk is straight ahead for assistance.</p>
            </div>
          ) : (
            <ol className="space-y-6 list-none p-0 m-0">
              {instructions.map((inst, index) => (
                <li
                  key={inst.id}
                  className="bg-white border-2 border-gray-400 rounded-lg p-6 shadow-xs focus-within:ring-4 focus-within:ring-[var(--color-primary)] transition-none"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="w-10 h-10 rounded-full bg-[var(--color-mode-blind)] text-white font-extrabold text-xl flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-xl font-bold text-[var(--color-text)]">
                        {inst.title}
                      </h3>
                      <p className="text-xl text-[var(--color-text)] leading-relaxed font-normal">
                        {inst.content}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      {/* Semantic Landmark: FOOTER */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-400 text-sm font-medium text-[var(--color-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p>City Central Library &bull; ACCESS-EASE Accessibility Terminal</p>
        <p>For assistance, speak to library staff or press desk bell at reception.</p>
      </footer>
    </div>
  );
};
