import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { SampleBadge } from '../components/SampleBadge';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCcw,
  FileText,
  Layers,
  Award,
  Check,
  Building2,
  Info,
} from 'lucide-react';

interface Area {
  id: number;
  library_id: number;
  name: string;
  area_type: string;
  floor: number;
  description: string | null;
  is_sample: boolean;
}

interface Criterion {
  id: number;
  name: string;
  description: string | null;
  area_type: string | null;
  is_sample: boolean;
}

interface Assessment {
  id: number;
  library_id: number;
  area_id: number;
  criterion_id: number;
  status: 'pass' | 'needs_improvement' | 'fail' | 'not_assessed';
  notes: string | null;
  assessed_by: number | null;
  is_sample: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ScoreResponse {
  library_id: number;
  score: number | null;
  label: string;
  total_assessed: number;
  breakdown: {
    pass: number;
    needs_improvement: number;
    fail: number;
    not_assessed: number;
  };
}

export const AssessmentsPage: React.FC = () => {
  const libraryId = 1; // City Central Library demo library

  // Primary state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Filter state
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit Assessment Modal state
  const [selectedCell, setSelectedCell] = useState<{
    area: Area;
    criterion: Criterion;
    assessment?: Assessment;
  } | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('not_assessed');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Clear toast after 4s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Fetch Score
  const fetchScore = useCallback(async () => {
    try {
      const score = await apiClient<ScoreResponse>(`/api/assessments/score?library_id=${libraryId}`);
      setScoreData(score);
    } catch {
      // Non-fatal, score can be null if no assessments
      setScoreData(null);
    }
  }, [libraryId]);

  // Fetch Assessments
  const fetchAssessments = useCallback(async () => {
    const res = await apiClient<{ items: Assessment[] }>(`/api/assessments?library_id=${libraryId}&limit=100`);
    setAssessments(res.items || []);
  }, [libraryId]);

  // Initial full page load
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [areasRes, criteriaRes, assessmentsRes, scoreRes] = await Promise.all([
        apiClient<{ items: Area[] }>(`/api/areas?library_id=${libraryId}&limit=100`),
        apiClient<{ items: Criterion[] }>('/api/criteria?limit=100'),
        apiClient<{ items: Assessment[] }>(`/api/assessments?library_id=${libraryId}&limit=100`),
        apiClient<ScoreResponse>(`/api/assessments/score?library_id=${libraryId}`).catch(() => null),
      ]);

      setAreas(areasRes.items || []);
      setCriteria(criteriaRes.items || []);
      setAssessments(assessmentsRes.items || []);
      setScoreData(scoreRes);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr?.error?.message || 'Failed to load assessment data. Please check network connection.');
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Fast lookup map for assessments by `${area_id}-${criterion_id}`
  const assessmentsMap = useMemo(() => {
    const map: Record<string, Assessment> = {};
    for (const a of assessments) {
      map[`${a.area_id}-${a.criterion_id}`] = a;
    }
    return map;
  }, [assessments]);

  // Floor display name helper
  const getFloorName = (floorNum: number): string => {
    if (floorNum === 0) return 'Ground Floor';
    if (floorNum === 1) return 'First Floor';
    if (floorNum === 2) return 'Second Floor';
    return `Floor ${floorNum}`;
  };

  // Distinct floor numbers present in areas
  const distinctFloors = useMemo(() => {
    const floorSet = new Set<number>();
    areas.forEach((a) => floorSet.add(a.floor));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [areas]);

  // Filtered areas based on floor and status filters
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      // 1. Floor Filter
      if (floorFilter !== 'all' && area.floor.toString() !== floorFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        // Area must have at least one criterion with this status
        const hasMatchingStatus = criteria.some((crit) => {
          const ass = assessmentsMap[`${area.id}-${crit.id}`];
          const status = ass?.status || 'not_assessed';
          return status === statusFilter;
        });
        if (!hasMatchingStatus) {
          return false;
        }
      }

      return true;
    });
  }, [areas, criteria, assessmentsMap, floorFilter, statusFilter]);

  // Group filtered areas by floor
  const groupedAreasByFloor = useMemo(() => {
    const groups: { floor: number; floorName: string; areas: Area[] }[] = [];
    const map = new Map<number, Area[]>();

    filteredAreas.forEach((area) => {
      if (!map.has(area.floor)) {
        map.set(area.floor, []);
      }
      map.get(area.floor)!.push(area);
    });

    const sortedFloors = Array.from(map.keys()).sort((a, b) => a - b);
    for (const fl of sortedFloors) {
      groups.push({
        floor: fl,
        floorName: getFloorName(fl),
        areas: map.get(fl)!,
      });
    }

    return groups;
  }, [filteredAreas]);

  // Cell Click handler to open modal
  const handleCellClick = (area: Area, criterion: Criterion) => {
    const ass = assessmentsMap[`${area.id}-${criterion.id}`];
    setSelectedCell({ area, criterion, assessment: ass });
    setModalStatus(ass?.status || 'not_assessed');
    setModalNotes(ass?.notes || '');
    setSaveError(null);
  };

  // Save assessment handler
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (selectedCell.assessment) {
        // Update existing assessment
        await apiClient<Assessment>(`/api/assessments/${selectedCell.assessment.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: modalStatus,
            notes: modalNotes.trim() || null,
          }),
        });
      } else {
        // Create new assessment
        await apiClient<Assessment>('/api/assessments', {
          method: 'POST',
          body: JSON.stringify({
            library_id: libraryId,
            area_id: selectedCell.area.id,
            criterion_id: selectedCell.criterion.id,
            status: modalStatus,
            notes: modalNotes.trim() || null,
          }),
        });
      }

      setSuccessToast(
        `Updated: ${selectedCell.area.name} — ${selectedCell.criterion.name}`
      );
      setSelectedCell(null);

      // Refetch assessments & recalculate score
      await Promise.all([fetchAssessments(), fetchScore()]);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setSaveError(apiErr?.error?.message || 'Failed to save assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Circular Score Progress computation
  const score = scoreData?.score ?? null;
  const size = 136;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = score !== null && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  const strokeDashoffset = score !== null ? circumference - (circumference * validScore) / 100 : circumference;

  let strokeColor = '#9CA3AF'; // neutral
  let scoreBadgeClass = 'bg-gray-100 text-[var(--color-neutral)] border-gray-300';
  let scoreBadgeText = 'No assessments yet';
  let ScoreBadgeIcon = HelpCircle;

  if (score !== null) {
    if (score >= 75) {
      strokeColor = '#15803D'; // var(--color-success)
      scoreBadgeClass = 'bg-emerald-50 text-[var(--color-success)] border-emerald-200';
      scoreBadgeText = 'Good Compliance (≥ 75%)';
      ScoreBadgeIcon = CheckCircle2;
    } else if (score >= 50) {
      strokeColor = '#B45309'; // var(--color-warning)
      scoreBadgeClass = 'bg-amber-50 text-[var(--color-warning)] border-amber-200';
      scoreBadgeText = 'Moderate Compliance (50–74%)';
      ScoreBadgeIcon = AlertTriangle;
    } else {
      strokeColor = '#B91C1C'; // var(--color-danger)
      scoreBadgeClass = 'bg-red-50 text-[var(--color-danger)] border-red-200';
      scoreBadgeText = 'Low Compliance (< 50%)';
      ScoreBadgeIcon = XCircle;
    }
  }

  // Format status label for screen readers
  const formatStatusForAria = (st: string) => {
    switch (st) {
      case 'pass':
        return 'Pass';
      case 'needs_improvement':
        return 'Needs Improvement';
      case 'fail':
        return 'Fail';
      case 'not_assessed':
      default:
        return 'Not Assessed';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
              <Award className="w-7 h-7 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <span>Accessibility Assessments</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Evaluate and monitor physical accessibility criteria across City Central Library areas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[var(--color-surface)] text-[var(--color-primary)] border border-gray-300">
              City Central Library (CCL)
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[var(--color-success)] shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Loading / Error State */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-300 p-12 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-[var(--color-muted)]">
            Loading accessibility assessments and criteria grid...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-300 p-8 space-y-4">
          <ErrorMessage message={error} />
          <button
            type="button"
            onClick={loadAllData}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* TOP SECTION: SCORE INDICATOR CARD                        */}
          {/* ======================================================== */}
          <div className="bg-white rounded-lg border border-gray-300 shadow-xs overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                {/* Left: Circular Progress Indicator & Score */}
                <div className="flex flex-col items-center text-center sm:min-w-[220px]">
                  <div
                    className="flex flex-col items-center justify-center"
                    role="img"
                    aria-label={
                      score !== null
                        ? `Accessibility score: ${score} percent`
                        : 'Accessibility score: No assessments yet'
                    }
                  >
                    <div className="relative flex items-center justify-center">
                      <svg
                        width={size}
                        height={size}
                        className="transform -rotate-90"
                        aria-hidden="true"
                      >
                        {/* Track circle */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke="#E5E7EB"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                        />
                        {/* Progress circle */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          style={{
                            transition: 'stroke-dashoffset 0.5s ease-in-out',
                          }}
                        />
                      </svg>

                      {/* Center Score Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        {score !== null ? (
                          <>
                            <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                              {score}%
                            </span>
                            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                              Indicator
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-bold text-[var(--color-muted)] px-2">
                              No data
                            </span>
                            <span className="text-[10px] text-gray-500">Pending</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Always pair color with text label + icon */}
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${scoreBadgeClass}`}
                    >
                      <ScoreBadgeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{scoreBadgeText}</span>
                    </div>
                  </div>

                  {/* CRITICAL: Mandatory exact disclaimer */}
                  <p className="mt-3 text-xs text-[var(--color-muted)] max-w-xs text-center font-normal">
                    Internal assessment indicator, not a certified accessibility rating.
                  </p>
                </div>

                {/* Right: Breakdown Grid */}
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
                      Assessment Breakdown
                    </h2>
                    <span className="text-xs text-[var(--color-muted)]">
                      Total Evaluated:{' '}
                      <strong className="text-[var(--color-text)] font-semibold">
                        {scoreData?.total_assessed ?? 0}
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Pass Breakdown */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" aria-hidden="true" />
                          <span>Pass</span>
                        </span>
                        <span className="text-xl font-extrabold text-emerald-950">
                          {scoreData?.breakdown.pass ?? 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 mt-1">Meets criteria</p>
                    </div>

                    {/* Needs Improvement Breakdown */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" aria-hidden="true" />
                          <span>Needs Imp.</span>
                        </span>
                        <span className="text-xl font-extrabold text-amber-950">
                          {scoreData?.breakdown.needs_improvement ?? 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 mt-1">Minor issues</p>
                    </div>

                    {/* Fail Breakdown */}
                    <div className="bg-red-50/60 border border-red-200 rounded-md p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0" aria-hidden="true" />
                          <span>Fail</span>
                        </span>
                        <span className="text-xl font-extrabold text-red-950">
                          {scoreData?.breakdown.fail ?? 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-red-800/80 mt-1">Non-compliant</p>
                    </div>

                    {/* Not Assessed Breakdown */}
                    <div className="bg-gray-100/70 border border-gray-300 rounded-md p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-[var(--color-neutral)] shrink-0" aria-hidden="true" />
                          <span>Not Assessed</span>
                        </span>
                        <span className="text-xl font-extrabold text-gray-900">
                          {scoreData?.breakdown.not_assessed ?? 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">Review pending</p>
                    </div>
                  </div>

                  {/* Context Note */}
                  <div className="mt-4 p-3 bg-[var(--color-surface)] rounded text-xs text-[var(--color-muted)] flex items-start gap-2">
                    <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      The accessibility indicator formula computes:{' '}
                      <code className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-300">
                        Pass / (Pass + Needs Improvement + Fail) × 100
                      </code>
                      . Items marked &ldquo;Not Assessed&rdquo; are omitted from the active denominator until audited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM SECTION: CRITERIA STATUS GRID                      */}
          {/* ======================================================== */}
          <div className="bg-white rounded-lg border border-gray-300 shadow-xs overflow-hidden">
            {/* Header and Filter Controls */}
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-[var(--color-surface)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                    <span>Area Evaluation Matrix</span>
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Click any cell to update criteria evaluations or review notes. Keyboard users can Tab through cells and press Enter.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Floor Filter */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="floor-filter"
                      className="text-xs font-semibold text-[var(--color-text)] whitespace-nowrap"
                    >
                      Floor:
                    </label>
                    <select
                      id="floor-filter"
                      value={floorFilter}
                      onChange={(e) => setFloorFilter(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="all">All Floors</option>
                      {distinctFloors.map((fl) => (
                        <option key={fl} value={fl.toString()}>
                          {getFloorName(fl)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="status-filter"
                      className="text-xs font-semibold text-[var(--color-text)] whitespace-nowrap"
                    >
                      Status:
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pass">Pass</option>
                      <option value="needs_improvement">Needs Improvement</option>
                      <option value="fail">Fail</option>
                      <option value="not_assessed">Not Assessed</option>
                    </select>
                  </div>

                  {/* Reset Filters button */}
                  {(floorFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setFloorFilter('all');
                        setStatusFilter('all');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:text-blue-900 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      aria-label="Reset all filters"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Empty States Check */}
            {criteria.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-base font-semibold text-[var(--color-text)]">
                  No assessment criteria defined. Add criteria to begin assessing.
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Once criteria exist, the evaluation matrix will populate automatically.
                </p>
              </div>
            ) : areas.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-base font-semibold text-[var(--color-text)]">
                  No areas found for this library.
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Define library zones in the Library &amp; Areas page before conducting assessments.
                </p>
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-base font-semibold text-[var(--color-text)]">
                  No areas match the selected filters.
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  Try adjusting the floor or status filter options above.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFloorFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Accessible HTML Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th
                        scope="col"
                        className="py-3 px-4 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider w-[240px] sticky left-0 bg-gray-50 z-10 border-r border-gray-300"
                      >
                        Area / Location
                      </th>
                      {criteria.map((crit) => (
                        <th
                          key={crit.id}
                          scope="col"
                          className="py-3 px-4 text-xs font-bold text-[var(--color-text)] tracking-wider border-r border-gray-300 last:border-r-0 min-w-[170px]"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-[var(--color-text)]">
                              {crit.name}
                            </span>
                            {crit.description && (
                              <span
                                className="text-[11px] font-normal text-[var(--color-muted)] line-clamp-2"
                                title={crit.description}
                              >
                                {crit.description}
                              </span>
                            )}
                            {crit.area_type && (
                              <span className="inline-block mt-1 self-start text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 capitalize">
                                {crit.area_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {groupedAreasByFloor.map((group) => (
                      <React.Fragment key={`group-${group.floor}`}>
                        {/* Floor Section Header Row */}
                        <tr className="bg-[var(--color-surface)] border-y border-gray-300">
                          <th
                            colSpan={criteria.length + 1}
                            scope="colgroup"
                            className="py-2 px-4 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                              <span>
                                {group.floorName} ({group.areas.length}{' '}
                                {group.areas.length === 1 ? 'area' : 'areas'})
                              </span>
                            </div>
                          </th>
                        </tr>

                        {/* Area Rows */}
                        {group.areas.map((area) => (
                          <tr
                            key={area.id}
                            className="border-b border-gray-200 hover:bg-gray-50/70 transition-none"
                          >
                            {/* Area Name (Row Header) */}
                            <th
                              scope="row"
                              className="py-3 px-4 text-left font-normal text-[var(--color-text)] align-top bg-white sticky left-0 z-1 border-r border-gray-200"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-[var(--color-text)]">
                                  {area.name}
                                </span>
                                {area.is_sample && <SampleBadge />}
                              </div>
                              <div className="text-xs text-[var(--color-muted)] capitalize mt-0.5">
                                {area.area_type.replace('_', ' ')}
                              </div>
                              {area.description && (
                                <div
                                  className="text-xs text-gray-500 mt-1 line-clamp-1"
                                  title={area.description}
                                >
                                  {area.description}
                                </div>
                              )}
                            </th>

                            {/* Status Cells */}
                            {criteria.map((crit) => {
                              const ass = assessmentsMap[`${area.id}-${crit.id}`];
                              const cellStatus = ass?.status || 'not_assessed';
                              const isSample = ass?.is_sample || false;
                              const ariaLabel = `${area.name}, ${crit.name}: ${formatStatusForAria(
                                cellStatus
                              )}${isSample ? ' (Sample)' : ''}`;

                              // Highlight cell if filtered by status
                              const isMatchedStatus =
                                statusFilter !== 'all' && cellStatus === statusFilter;

                              return (
                                <td
                                  key={crit.id}
                                  className={`p-2 align-middle text-center border-r border-gray-200 last:border-r-0 ${
                                    isMatchedStatus ? 'bg-amber-50/40' : ''
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleCellClick(area, crit)}
                                    aria-label={ariaLabel}
                                    className="w-full h-full min-h-[64px] p-2 rounded flex flex-col items-center justify-center gap-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-none text-left"
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                      <StatusBadge status={cellStatus} />
                                      {isSample && <SampleBadge />}
                                    </div>

                                    {/* Notes indicator snippet */}
                                    {ass?.notes && (
                                      <div
                                        className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)] max-w-[140px] truncate"
                                        title={ass.notes}
                                      >
                                        <FileText className="w-3 h-3 text-gray-500 shrink-0" aria-hidden="true" />
                                        <span className="truncate">{ass.notes}</span>
                                      </div>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* EDIT / CREATE ASSESSMENT MODAL                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedCell}
        onClose={() => {
          if (!saving) {
            setSelectedCell(null);
            setSaveError(null);
          }
        }}
        title={
          selectedCell
            ? `Evaluate: ${selectedCell.area.name}`
            : 'Evaluate Area Criterion'
        }
        maxWidth="lg"
      >
        {selectedCell && (
          <form onSubmit={handleSaveAssessment} className="space-y-4">
            {/* Context Summary Box */}
            <div className="bg-[var(--color-surface)] border border-gray-300 rounded p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text)]">Location:</span>
                <span className="text-[var(--color-text)]">
                  {selectedCell.area.name} ({getFloorName(selectedCell.area.floor)})
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-[var(--color-text)] whitespace-nowrap">Criterion:</span>
                <div className="text-right">
                  <span className="font-bold text-[var(--color-text)] block">
                    {selectedCell.criterion.name}
                  </span>
                  {selectedCell.criterion.description && (
                    <span className="text-gray-600 block text-[11px] mt-0.5">
                      {selectedCell.criterion.description}
                    </span>
                  )}
                </div>
              </div>
              {selectedCell.assessment?.is_sample && (
                <div className="pt-1 flex items-center gap-2">
                  <SampleBadge />
                  <span className="text-[11px] text-gray-600">
                    Seeded sample evaluation. You can change the status or notes.
                  </span>
                </div>
              )}
            </div>

            {saveError && <ErrorMessage message={saveError} onDismiss={() => setSaveError(null)} />}

            {/* Status Field */}
            <FormField
              label="Evaluation Status"
              name="status"
              type="select"
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value)}
              required
              options={[
                { value: 'pass', label: 'Pass — Meets Accessibility Criterion' },
                { value: 'needs_improvement', label: 'Needs Improvement — Partial or Minor Defect' },
                { value: 'fail', label: 'Fail — Non-Compliant / Physical Barrier' },
                { value: 'not_assessed', label: 'Not Assessed — Evaluation Pending' },
              ]}
              helpText="Select whether this area meets the defined accessibility standard."
            />

            {/* Notes Field */}
            <FormField
              label="Assessment Notes & Observations"
              name="notes"
              type="textarea"
              rows={4}
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              placeholder="e.g., Ramp slope measures 1:12 with continuous bilateral handrails; tactile indicator strip in place."
              helpText="Optional physical measurements, observations, barrier descriptions, or remediation notes."
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-[var(--color-text)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Assessment</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
