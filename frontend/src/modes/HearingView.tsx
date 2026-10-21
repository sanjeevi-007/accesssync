import React, { useMemo } from 'react';
import type { ScanInstruction } from '../hooks/useLiveScans';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  DoorOpen,
  MapPin,
  ShieldAlert,
  Layers,
  Info,
} from 'lucide-react';

interface HearingViewProps {
  instructions: ScanInstruction[];
  areaName?: string;
  onResetToIdle?: () => void;
}

export const HearingView: React.FC<HearingViewProps> = ({
  instructions,
  areaName,
  onResetToIdle,
}) => {
  // Resolve area name
  const resolvedAreaName = useMemo(() => {
    if (areaName && areaName.trim()) return areaName;
    if (instructions.length > 0 && instructions[0].title) {
      const parts = instructions[0].title.split(' - ');
      return parts[0].trim();
    }
    return 'Main Entrance (City Central Library)';
  }, [areaName, instructions]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-between p-6 sm:p-10 font-sans">
      {/* Semantic Landmark: HEADER */}
      <header className="border-b-2 border-gray-300 pb-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              ACCESS-EASE &bull; Public Library Visual Guidance
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] mt-1 tracking-tight">
              {resolvedAreaName}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="px-3.5 py-1.5 rounded-md font-bold text-sm bg-amber-100 text-[var(--color-mode-hearing)] border-2 border-amber-500"
              role="status"
            >
              Mode: Hearing (Deaf / Hard of Hearing)
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

      {/* Semantic Landmark: MAIN */}
      <main className="flex-1 space-y-8 max-w-5xl">
        {/* VISUAL ALERT BANNER AT TOP FOR EMERGENCY / OBSTACLE INFO */}
        <section aria-label="Visual safety alert">
          <div
            role="region"
            className="p-5 rounded-lg border-2 border-[var(--color-danger)] bg-red-50 text-red-950 shadow-xs space-y-2"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-7 h-7 text-[var(--color-danger)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-xl font-bold text-[var(--color-danger)]">
                  Visual Safety Notice: Emergency Evacuation &amp; Safety Path
                </p>
                <p className="text-base text-red-900 font-medium">
                  Emergency Exit is clearly marked with overhead green illuminated signs. Follow green floor guidance strips to the Front Lawn Assembly Point.
                </p>
                {/* Critical honest note: NEVER claim physical flashing lights exist */}
                <p className="text-xs font-semibold text-red-800 bg-red-100/70 p-2 rounded border border-red-200 mt-2">
                  Notice: Physical flashing lights require additional hardware installation. All real-time safety alerts are presented visually on this terminal display.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INSTRUCTIONS: LARGE TEXT CARDS */}
        <section aria-labelledby="instructions-heading" className="space-y-4">
          <h2 id="instructions-heading" className="text-2xl font-bold text-[var(--color-text)]">
            Visual Location Guidance ({instructions.length} {instructions.length === 1 ? 'Notice' : 'Notices'})
          </h2>

          {instructions.length === 0 ? (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 text-lg">
              <p>Welcome to City Central Library. Written inquiry pads and physical maps are available at the Reception Desk ahead.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {instructions.map((inst, index) => (
                <div
                  key={inst.id}
                  className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                        Guide Step {index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        <FileText className="w-3 h-3" aria-hidden="true" />
                        <span>Visual</span>
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text)]">
                      {inst.title}
                    </h3>
                    <p className="text-lg text-[var(--color-text)] leading-relaxed">
                      {inst.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LIFT & MAINTENANCE PANELS WITH CLEAR VISUAL INDICATORS */}
        <section aria-labelledby="facility-panels-heading" className="space-y-4">
          <h2 id="facility-panels-heading" className="text-xl font-bold text-[var(--color-text)]">
            Facility Status &amp; Accessibility Amenities
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Lift Panel */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-base">
                <Layers className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>Elevator L1 Status</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-[var(--color-success)] border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Operational</span>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Digital display inside elevator indicates floor number and travel direction clearly without auditory cues.
              </p>
            </div>

            {/* Restroom Panel */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-base">
                <DoorOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>Accessible Restroom</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-[var(--color-success)] border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Available</span>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Located on the Ground Floor corridor (15m from entrance) with external visual occupied indicator.
              </p>
            </div>

            {/* Reception Desk Assistance */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-base">
                <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>Reception Desk</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-[var(--color-primary)] border border-blue-300">
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Staffed</span>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Staff have written inquiry notepads, visual floor maps, and directory cards ready at the front counter.
              </p>
            </div>
          </div>
        </section>

        {/* NUMBERED EMERGENCY STEPS WITH LARGE ICONS */}
        <section aria-labelledby="emergency-steps-heading" className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[var(--color-danger)]" aria-hidden="true" />
            <h2 id="emergency-steps-heading" className="text-xl font-bold text-[var(--color-text)]">
              Visual Emergency Evacuation Protocol
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="border border-gray-300 rounded p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[var(--color-danger)] font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-base text-[var(--color-text)] flex items-center gap-1.5">
                  <DoorOpen className="w-4 h-4 text-gray-700" aria-hidden="true" />
                  <span>Locate Exits</span>
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Look for green illuminated signs marking Exit E2 (Ground) or Exit E3 (First Floor).
                </p>
              </div>
            </div>

            <div className="border border-gray-300 rounded p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[var(--color-danger)] font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-base text-[var(--color-text)] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-gray-700" aria-hidden="true" />
                  <span>Use Stairwells</span>
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Do NOT use the elevator. Use Stairs S1 for level exit to the outside.
                </p>
              </div>
            </div>

            <div className="border border-gray-300 rounded p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[var(--color-danger)] font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-base text-[var(--color-text)] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-700" aria-hidden="true" />
                  <span>Assembly Point</span>
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Gather at the Front Lawn (marked with outdoor green assembly flags).
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Landmark: FOOTER */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-300 text-sm font-medium text-[var(--color-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p>City Central Library &bull; Visual Guidance Terminal</p>
        <p>All instructions conveyed visually. Inquire at reception for individual assistance.</p>
      </footer>
    </div>
  );
};
