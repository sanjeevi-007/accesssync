import React from 'react';
import { Clock } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  phase: string;
  description: string;
}

const StaffPlaceholder: React.FC<PlaceholderProps> = ({ title, phase, description }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-300 p-8 text-center max-w-xl mx-auto my-12">
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)] mx-auto mb-4">
        <Clock className="w-6 h-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
      <div className="mt-6 inline-block px-3 py-1 bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold text-xs rounded">
        {phase}
      </div>
    </div>
  );
};

export const DashboardPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Staff Dashboard"
    phase="Coming in Phase 5"
    description="Overview of accessibility cards, active readers, and library guidance activity."
  />
);

export const CardsPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="RFID Cards Management"
    phase="Coming in Phase 5"
    description="Register, configure accessibility modes, capture UIDs, and deactivate visitor cards."
  />
);

export const LibraryPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Library & Floor Layout"
    phase="Coming in Phase 5"
    description="Manage library premises, floor zones, areas, and navigation landmarks."
  />
);

export const InstructionsPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Guidance Instructions"
    phase="Coming in Phase 5"
    description="Configure area-specific guidance for Blind, Hearing, and Low-Vision modes."
  />
);

export const AssessmentsPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Accessibility Assessments"
    phase="Coming in Phase 6"
    description="Evaluate accessibility criteria across library areas and view internal indicators."
  />
);

export const ScansPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Live RFID Scans & Events"
    phase="Coming in Phase 8"
    description="Real-time scan event monitor and historical scan log."
  />
);

export const ReportsPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="Accessibility Reports"
    phase="Coming in Phase 8"
    description="Generate printable accessibility reports, summaries, and CSV exports."
  />
);

export const SettingsPlaceholder: React.FC = () => (
  <StaffPlaceholder
    title="System Settings"
    phase="Coming in Phase 5"
    description="Configure system parameters, heartbeat timeouts, and organization defaults."
  />
);
