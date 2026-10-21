import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { SampleBadge } from '../components/SampleBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { exportToCsv } from '../utils/exportCsv';
import {
  Printer,
  Download,
  Calendar,
  Activity,
  Award,
  CreditCard,
  Radio,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  RotateCcw,
  BarChart2,
  Layers,
  Cpu,
} from 'lucide-react';

interface ScanEventItem {
  id: number;
  event_id: string;
  card_uid: string;
  result: string;
  reason?: string | null;
  mode?: string | null;
  device_id?: string | number | null;
  created_at: string | null;
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

interface AreaItem {
  id: number;
  name: string;
  area_type: string;
  floor: number;
}

interface CriterionItem {
  id: number;
  name: string;
  description: string | null;
}

interface AssessmentItem {
  id: number;
  library_id: number;
  area_id: number;
  criterion_id: number;
  status: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

interface RfidCardItem {
  id: number;
  uid: string;
  visitor_id: number;
  label: string | null;
  is_active: boolean;
  is_sample: boolean;
  created_at: string | null;
}

interface VisitorItem {
  id: number;
  mode: string;
  language: string;
}

interface DeviceStatusItem {
  device_id: string;
  status: string;
  last_seen_at: string | null;
}

export const ReportsPage: React.FC = () => {
  const libraryId = 1; // City Central Library

  // Loading & error state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data from existing APIs
  const [scans, setScans] = useState<ScanEventItem[]>([]);
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [criteria, setCriteria] = useState<CriterionItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [cards, setCards] = useState<RfidCardItem[]>([]);
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [devices, setDevices] = useState<DeviceStatusItem[]>([]);

  // Section 1: Date Range Filter
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Current print timestamp
  const printDateStr = useMemo(() => {
    return new Date().toLocaleString();
  }, []);

  // Fetch all report data using existing endpoints
  const fetchAllReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        scansRes,
        scoreRes,
        areasRes,
        criteriaRes,
        assessmentsRes,
        cardsRes,
        visitorsRes,
        devicesRes,
      ] = await Promise.all([
        apiClient<{ items: ScanEventItem[]; total: number }>('/api/rfid/scans?limit=100').catch(
          () => ({ items: [], total: 0 })
        ),
        apiClient<ScoreResponse>(`/api/assessments/score?library_id=${libraryId}`).catch(
          () => null
        ),
        apiClient<{ items: AreaItem[] }>(`/api/areas?library_id=${libraryId}&limit=100`).catch(
          () => ({ items: [] })
        ),
        apiClient<{ items: CriterionItem[] }>('/api/criteria?limit=100').catch(() => ({
          items: [],
        })),
        apiClient<{ items: AssessmentItem[] }>(
          `/api/assessments?library_id=${libraryId}&limit=100`
        ).catch(() => ({ items: [] })),
        apiClient<{ items: RfidCardItem[] }>('/api/cards?limit=100').catch(() => ({
          items: [],
        })),
        apiClient<{ items: VisitorItem[] }>('/api/visitors?limit=100').catch(() => ({
          items: [],
        })),
        apiClient<DeviceStatusItem[]>('/api/devices/status').catch(() => []),
      ]);

      setScans(scansRes.items || []);
      setScoreData(scoreRes);
      setAreas(areasRes.items || []);
      setCriteria(criteriaRes.items || []);
      setAssessments(assessmentsRes.items || []);
      setCards(cardsRes.items || []);
      setVisitors(visitorsRes.items || []);
      setDevices(devicesRes || []);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    fetchAllReportData();
  }, [fetchAllReportData]);

  // Handle window print
  const handlePrint = () => {
    window.print();
  };

  // =========================================================================
  // SECTION 1: SCAN ACTIVITY CALCULATIONS
  // =========================================================================
  const scanMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let scansToday = 0;
    let scansThisWeek = 0;
    let scansThisMonth = 0;

    scans.forEach((s) => {
      if (!s.created_at) return;
      const t = new Date(s.created_at).getTime();
      if (t >= startOfToday) scansToday++;
      if (t >= startOfWeek) scansThisWeek++;
      if (t >= startOfMonth) scansThisMonth++;
    });

    // Date range filter
    const startRangeTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endRangeTime = endDate
      ? new Date(`${endDate}T23:59:59.999`).getTime()
      : Number.MAX_SAFE_INTEGER;

    const filteredRangeScans = scans.filter((s) => {
      if (!s.created_at) return true;
      const t = new Date(s.created_at).getTime();
      return t >= startRangeTime && t <= endRangeTime;
    });

    // Result breakdown
    const acceptedCount = filteredRangeScans.filter(
      (s) => s.result?.toLowerCase() === 'accepted'
    ).length;
    const rejectedCount = filteredRangeScans.filter(
      (s) => s.result?.toLowerCase() === 'rejected'
    ).length;

    // Mode breakdown
    const blindCount = filteredRangeScans.filter((s) => s.mode?.toLowerCase() === 'blind').length;
    const hearingCount = filteredRangeScans.filter((s) => s.mode?.toLowerCase() === 'hearing').length;
    const lowVisionCount = filteredRangeScans.filter(
      (s) => s.mode?.toLowerCase() === 'low_vision'
    ).length;

    // Peak hours chart (0 to 23 hours)
    const hourlyCounts = new Array(24).fill(0);
    filteredRangeScans.forEach((s) => {
      if (!s.created_at) return;
      const hour = new Date(s.created_at).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour]++;
      }
    });

    const maxHourlyCount = Math.max(...hourlyCounts, 1);

    return {
      scansToday,
      scansThisWeek,
      scansThisMonth,
      totalInRange: filteredRangeScans.length,
      filteredRangeScans,
      acceptedCount,
      rejectedCount,
      blindCount,
      hearingCount,
      lowVisionCount,
      hourlyCounts,
      maxHourlyCount,
    };
  }, [scans, startDate, endDate]);

  // Export Section 1 CSV
  const handleExportSection1 = () => {
    const headers = ['Metric', 'Count / Value'];
    const rows: (string | number)[][] = [
      ['Total Scans Today', scanMetrics.scansToday],
      ['Total Scans This Week', scanMetrics.scansThisWeek],
      ['Total Scans This Month', scanMetrics.scansThisMonth],
      ['Total in Date Range', scanMetrics.totalInRange],
      ['Date Range Start', startDate || 'All'],
      ['Date Range End', endDate || 'All'],
      ['Accepted Scans', scanMetrics.acceptedCount],
      ['Rejected Scans', scanMetrics.rejectedCount],
      ['Blind Mode Scans', scanMetrics.blindCount],
      ['Hearing Mode Scans', scanMetrics.hearingCount],
      ['Low-Vision Mode Scans', scanMetrics.lowVisionCount],
      ['', ''],
      ['Hour of Day', 'Scan Count'],
      ...scanMetrics.hourlyCounts.map((count, hour) => [
        `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`,
        count,
      ]),
    ];

    exportToCsv(`scan_activity_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // =========================================================================
  // SECTION 2: ACCESSIBILITY ASSESSMENT REPORT CALCULATIONS
  // =========================================================================
  const assessmentDetails = useMemo(() => {
    // Map areas and criteria for lookup
    const areaMap = new Map<number, AreaItem>();
    areas.forEach((a) => areaMap.set(a.id, a));

    const critMap = new Map<number, CriterionItem>();
    criteria.forEach((c) => critMap.set(c.id, c));

    const rows = assessments.map((ass) => {
      const area = areaMap.get(ass.area_id);
      const crit = critMap.get(ass.criterion_id);
      return {
        id: ass.id,
        areaName: area ? area.name : `Area #${ass.area_id}`,
        floor: area ? `Floor ${area.floor}` : '—',
        areaType: area ? area.area_type.replace('_', ' ') : '—',
        criterionName: crit ? crit.name : `Criterion #${ass.criterion_id}`,
        status: ass.status,
        notes: ass.notes || '—',
        updatedAt: ass.updated_at || ass.created_at || null,
      };
    });

    // Score history simulation/grouping
    // Note: Assessments have timestamps; we can compute floor-by-floor breakdown
    const floorScores: { floor: number; score: number | null; total: number; pass: number }[] = [];
    const floorGroups = new Map<number, AssessmentItem[]>();
    assessments.forEach((ass) => {
      const area = areaMap.get(ass.area_id);
      const fl = area ? area.floor : 0;
      if (!floorGroups.has(fl)) floorGroups.set(fl, []);
      floorGroups.get(fl)!.push(ass);
    });

    floorGroups.forEach((items, fl) => {
      const pass = items.filter((i) => i.status === 'pass').length;
      const needs = items.filter((i) => i.status === 'needs_improvement').length;
      const fail = items.filter((i) => i.status === 'fail').length;
      const total = pass + needs + fail;
      const score = total > 0 ? Math.round((pass / total) * 1000) / 10 : null;
      floorScores.push({ floor: fl, score, total, pass });
    });
    floorScores.sort((a, b) => a.floor - b.floor);

    return {
      rows,
      floorScores,
    };
  }, [areas, criteria, assessments]);

  // Export Section 2 CSV
  const handleExportSection2 = () => {
    const headers = ['Area Name', 'Floor', 'Area Type', 'Criterion', 'Status', 'Notes', 'Last Evaluated'];
    const rows = assessmentDetails.rows.map((r) => [
      r.areaName,
      r.floor,
      r.areaType,
      r.criterionName,
      r.status,
      r.notes,
      r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—',
    ]);

    exportToCsv(`accessibility_assessment_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // =========================================================================
  // SECTION 3: CARD USAGE REPORT CALCULATIONS
  // =========================================================================
  const cardMetrics = useMemo(() => {
    const activeCards = cards.filter((c) => c.is_active);
    const inactiveCards = cards.filter((c) => !c.is_active);

    // Count scans per card UID
    const scanCountByUid = new Map<string, { count: number; lastScanned: string | null }>();
    scans.forEach((s) => {
      const existing = scanCountByUid.get(s.card_uid) || { count: 0, lastScanned: null };
      existing.count += 1;
      if (s.created_at) {
        if (!existing.lastScanned || new Date(s.created_at) > new Date(existing.lastScanned)) {
          existing.lastScanned = s.created_at;
        }
      }
      scanCountByUid.set(s.card_uid, existing);
    });

    const visitorMap = new Map<number, VisitorItem>();
    visitors.forEach((v) => visitorMap.set(v.id, v));

    // Map cards with usage statistics
    const cardsWithUsage = cards.map((c) => {
      const stats = scanCountByUid.get(c.uid) || { count: 0, lastScanned: null };
      const visitor = visitorMap.get(c.visitor_id);
      return {
        ...c,
        scanCount: stats.count,
        lastScanned: stats.lastScanned,
        mode: visitor ? visitor.mode : `Visitor #${c.visitor_id}`,
      };
    });

    // Most-used cards (sorted descending)
    const mostUsed = [...cardsWithUsage].sort((a, b) => b.scanCount - a.scanCount);

    // Cards never used (scanCount === 0)
    const neverUsed = cardsWithUsage.filter((c) => c.scanCount === 0);

    return {
      totalCards: cards.length,
      activeCount: activeCards.length,
      inactiveCount: inactiveCards.length,
      mostUsed,
      neverUsed,
    };
  }, [cards, scans, visitors]);

  // Export Section 3 CSV
  const handleExportSection3 = () => {
    const headers = ['Card UID', 'Visitor ID', 'Mode', 'Label', 'Status', 'Total Scans', 'Last Scanned', 'Usage Status'];
    const rows = cardMetrics.mostUsed.map((c) => [
      c.uid,
      c.visitor_id,
      c.mode,
      c.label || '',
      c.is_active ? 'active' : 'inactive',
      c.scanCount,
      c.lastScanned ? new Date(c.lastScanned).toLocaleDateString() : 'Never',
      c.scanCount === 0 ? 'Never Used' : 'Active Use',
    ]);

    exportToCsv(`card_usage_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // =========================================================================
  // SECTION 4: DEVICE STATUS REPORT CALCULATIONS
  // =========================================================================
  const deviceMetrics = useMemo(() => {
    // Count scans per device_id
    const scanCountByDev = new Map<string, number>();
    scans.forEach((s) => {
      const devKey = s.device_id ? String(s.device_id) : 'reader-01';
      scanCountByDev.set(devKey, (scanCountByDev.get(devKey) || 0) + 1);
    });

    const deviceRows = devices.map((d) => {
      const scansHandled =
        scanCountByDev.get(d.device_id) || scanCountByDev.get(d.device_id.replace('reader-', '')) || 0;

      return {
        deviceId: d.device_id,
        status: d.status,
        lastSeenAt: d.last_seen_at,
        scansHandled,
      };
    });

    // If no devices returned, fallback to reader-01
    if (deviceRows.length === 0) {
      deviceRows.push({
        deviceId: 'reader-01',
        status: 'online',
        lastSeenAt: new Date().toISOString(),
        scansHandled: scans.length,
      });
    }

    return deviceRows;
  }, [devices, scans]);

  // Export Section 4 CSV
  const handleExportSection4 = () => {
    const headers = ['Device ID', 'Status', 'Last Heartbeat', 'Total Scans Handled'];
    const rows = deviceMetrics.map((d) => [
      d.deviceId,
      d.status,
      d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Never connected',
      d.scansHandled,
    ]);

    exportToCsv(`device_status_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-10 print-container">
      {/* ========================================================= */}
      {/* PRINT-ONLY HEADER (Hidden on screen, shown in print)     */}
      {/* ========================================================= */}
      <div className="print-header print-only">
        ACCESS-EASE Accessibility Report — City Central Library
      </div>

      {/* Screen Header & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
            <span>Operational &amp; Accessibility Reports</span>
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Summary reports, RFID activity metrics, and compliance evaluations for City Central Library.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-none"
            aria-label="Print this report"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-300 p-12 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-[var(--color-muted)]">
            Compiling accessibility and operational reports...
          </p>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* SECTION 1: SCAN ACTIVITY REPORT                                  */}
          {/* ================================================================= */}
          <section className="report-section print-card bg-white rounded-lg border border-gray-300 p-6 shadow-none space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Section 1 — Scan Activity Report</span>
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Physical RFID taps, frequency trends, and accessibility mode distributions.
                </p>
              </div>

              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={handleExportSection1}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="Export scan activity report as CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Date Range Picker Filter (no-print) */}
            <div className="bg-[var(--color-surface)] p-4 rounded-md border border-gray-300 flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Filter Date Range:</span>
                </span>

                <div className="flex items-center gap-2">
                  <label htmlFor="start-date" className="text-xs font-medium text-[var(--color-muted)]">
                    From:
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="end-date" className="text-xs font-medium text-[var(--color-muted)]">
                    To:
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setStartDate(d.toISOString().slice(0, 10));
                    setEndDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] font-semibold hover:underline"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset Range</span>
                </button>
              )}
            </div>

            {/* Scan Frequency KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded border border-gray-200 bg-gray-50/70">
                <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
                  Today
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-text)] mt-1">
                  {scanMetrics.scansToday}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Scans today</p>
              </div>

              <div className="p-4 rounded border border-gray-200 bg-gray-50/70">
                <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
                  This Week
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-text)] mt-1">
                  {scanMetrics.scansThisWeek}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Past 7 days</p>
              </div>

              <div className="p-4 rounded border border-gray-200 bg-gray-50/70">
                <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
                  This Month
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-text)] mt-1">
                  {scanMetrics.scansThisMonth}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Current month</p>
              </div>

              <div className="p-4 rounded border border-gray-200 bg-blue-50/50">
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                  In Selected Range
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-primary)] mt-1">
                  {scanMetrics.totalInRange}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Matching date filter</p>
              </div>
            </div>

            {/* Breakdowns: Result & Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Result Breakdown */}
              <div className="border border-gray-200 rounded p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] mb-3">
                  Breakdown by Result
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" aria-hidden="true" />
                        Accepted Scans
                      </span>
                      <span className="font-bold">{scanMetrics.acceptedCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-success)] h-2.5 rounded-full"
                        style={{
                          width: `${
                            scanMetrics.totalInRange > 0
                              ? (scanMetrics.acceptedCount / scanMetrics.totalInRange) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-red-800 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" aria-hidden="true" />
                        Rejected Scans (Unknown or Inactive)
                      </span>
                      <span className="font-bold">{scanMetrics.rejectedCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-danger)] h-2.5 rounded-full"
                        style={{
                          width: `${
                            scanMetrics.totalInRange > 0
                              ? (scanMetrics.rejectedCount / scanMetrics.totalInRange) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Breakdown */}
              <div className="border border-gray-200 rounded p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] mb-3">
                  Breakdown by Accessibility Mode
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[var(--color-mode-blind)]">
                        Blind Mode
                      </span>
                      <span className="font-bold">{scanMetrics.blindCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-mode-blind)] h-2.5 rounded-full"
                        style={{
                          width: `${
                            scanMetrics.totalInRange > 0
                              ? (scanMetrics.blindCount / scanMetrics.totalInRange) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[var(--color-mode-hearing)]">
                        Hearing Mode
                      </span>
                      <span className="font-bold">{scanMetrics.hearingCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-mode-hearing)] h-2.5 rounded-full"
                        style={{
                          width: `${
                            scanMetrics.totalInRange > 0
                              ? (scanMetrics.hearingCount / scanMetrics.totalInRange) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[var(--color-mode-lowvision)]">
                        Low-Vision Mode
                      </span>
                      <span className="font-bold">{scanMetrics.lowVisionCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-mode-lowvision)] h-2.5 rounded-full"
                        style={{
                          width: `${
                            scanMetrics.totalInRange > 0
                              ? (scanMetrics.lowVisionCount / scanMetrics.totalInRange) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Peak Hours Chart (Simple CSS Bar Chart, No Library) */}
            <div className="border border-gray-200 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Peak Hours Distribution (24-Hour Activity)</span>
                </h3>
                <span className="text-[11px] text-[var(--color-muted)]">
                  Maximum in hour: {scanMetrics.maxHourlyCount}
                </span>
              </div>

              {/* Visual CSS Bar Chart */}
              <div
                className="h-32 pt-6 flex items-end justify-between gap-1 border-b border-gray-300 pb-1"
                role="img"
                aria-label="Bar chart showing RFID scan counts for each hour from 00:00 to 23:00"
              >
                {scanMetrics.hourlyCounts.map((count, hour) => {
                  const pct = Math.max(
                    count > 0 ? 8 : 0,
                    Math.round((count / scanMetrics.maxHourlyCount) * 100)
                  );
                  return (
                    <div
                      key={`hour-bar-${hour}`}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Bar */}
                      <div
                        className="w-full max-w-[16px] bg-[var(--color-primary)] rounded-t hover:opacity-80 transition-none"
                        style={{ height: `${pct}%` }}
                        title={`${String(hour).padStart(2, '0')}:00 - ${count} scans`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Hour Labels */}
              <div className="flex items-center justify-between text-[9px] text-[var(--color-muted)] font-mono px-0.5">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>23:00</span>
              </div>

              {/* Accessibility Text Alternative Table */}
              <details className="pt-2 text-xs text-[var(--color-muted)]">
                <summary className="cursor-pointer font-semibold hover:text-[var(--color-text)]">
                  View accessible data table for peak hours
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th scope="col" className="px-3 py-1.5 font-bold">Hour Interval</th>
                        <th scope="col" className="px-3 py-1.5 font-bold">Total Scans</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scanMetrics.hourlyCounts.map((count, hour) => (
                        <tr key={`hour-row-${hour}`} className="hover:bg-gray-50">
                          <td className="px-3 py-1 font-mono">
                            {String(hour).padStart(2, '0')}:00 &ndash;{' '}
                            {String(hour).padStart(2, '0')}:59
                          </td>
                          <td className="px-3 py-1 font-semibold">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION 2: ACCESSIBILITY ASSESSMENT REPORT                        */}
          {/* ================================================================= */}
          <section className="report-section print-card bg-white rounded-lg border border-gray-300 p-6 shadow-none space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Section 2 — Accessibility Assessment Report</span>
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Physical criteria compliance audit and score breakdown for City Central Library.
                </p>
              </div>

              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={handleExportSection2}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="Export accessibility assessment report as CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Print text indicator */}
            <div className="print-score-text print-only">
              City Central Library Score:{' '}
              {scoreData?.score !== null && scoreData?.score !== undefined
                ? `${scoreData.score}%`
                : 'Pending'}
              <br />
              <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>
                Internal assessment indicator, not a certified accessibility rating.
              </span>
            </div>

            {/* Screen Score Indicator & Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print-score-circle">
              {/* Score Indicator Box */}
              <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-gray-300 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Current Score
                  </span>
                  <div className="mt-2 text-3xl font-extrabold text-[var(--color-primary)]">
                    {scoreData?.score !== null && scoreData?.score !== undefined
                      ? `${scoreData.score}%`
                      : 'N/A'}
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-text)] mt-1">
                    City Central Library
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-[var(--color-muted)] italic leading-tight">
                  Internal assessment indicator, not a certified accessibility rating.
                </p>
              </div>

              {/* Status Counts */}
              <div className="p-4 rounded border border-emerald-200 bg-emerald-50/60">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" aria-hidden="true" />
                  <span>Pass</span>
                </span>
                <p className="text-2xl font-extrabold text-emerald-950 mt-2">
                  {scoreData?.breakdown.pass ?? 0}
                </p>
                <p className="text-[11px] text-emerald-800/80 mt-1">Criteria compliant</p>
              </div>

              <div className="p-4 rounded border border-amber-200 bg-amber-50/60">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" aria-hidden="true" />
                  <span>Needs Improvement</span>
                </span>
                <p className="text-2xl font-extrabold text-amber-950 mt-2">
                  {scoreData?.breakdown.needs_improvement ?? 0}
                </p>
                <p className="text-[11px] text-amber-800/80 mt-1">Minor attention needed</p>
              </div>

              <div className="p-4 rounded border border-red-200 bg-red-50/60">
                <span className="text-xs font-bold text-red-900 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-[var(--color-danger)]" aria-hidden="true" />
                  <span>Fail / Not Assessed</span>
                </span>
                <p className="text-2xl font-extrabold text-red-950 mt-2">
                  {(scoreData?.breakdown.fail ?? 0) + (scoreData?.breakdown.not_assessed ?? 0)}
                </p>
                <p className="text-[11px] text-red-800/80 mt-1">
                  Fail: {scoreData?.breakdown.fail ?? 0} &bull; Not Assessed:{' '}
                  {scoreData?.breakdown.not_assessed ?? 0}
                </p>
              </div>
            </div>

            {/* Score History / Floor Level Breakdown */}
            {assessmentDetails.floorScores.length > 0 && (
              <div className="border border-gray-200 rounded p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Compliance History by Floor</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th scope="col" className="px-3 py-2 font-bold">Floor Level</th>
                        <th scope="col" className="px-3 py-2 font-bold">Evaluated Criteria</th>
                        <th scope="col" className="px-3 py-2 font-bold">Pass Count</th>
                        <th scope="col" className="px-3 py-2 font-bold">Floor Indicator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {assessmentDetails.floorScores.map((fs) => (
                        <tr key={`fs-${fs.floor}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-semibold">
                            {fs.floor === 0
                              ? 'Ground Floor'
                              : fs.floor === 1
                              ? 'First Floor'
                              : `Floor ${fs.floor}`}
                          </td>
                          <td className="px-3 py-2">{fs.total}</td>
                          <td className="px-3 py-2 text-[var(--color-success)] font-medium">
                            {fs.pass}
                          </td>
                          <td className="px-3 py-2 font-bold">
                            {fs.score !== null ? `${fs.score}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Area and Criterion Detail Matrix Table */}
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-gray-200 font-bold text-xs text-[var(--color-text)] uppercase tracking-wider">
                Area &amp; Criterion Assessment Log ({assessmentDetails.rows.length} Records)
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-300 z-1">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-bold text-[var(--color-text)]">
                        Area
                      </th>
                      <th scope="col" className="px-3 py-2 font-bold text-[var(--color-text)]">
                        Floor
                      </th>
                      <th scope="col" className="px-3 py-2 font-bold text-[var(--color-text)]">
                        Criterion
                      </th>
                      <th scope="col" className="px-3 py-2 font-bold text-[var(--color-text)]">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2 font-bold text-[var(--color-text)]">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assessmentDetails.rows.map((row) => (
                      <tr key={`ass-${row.id}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold text-[var(--color-text)]">
                          {row.areaName}
                        </td>
                        <td className="px-3 py-2 text-[var(--color-muted)]">{row.floor}</td>
                        <td className="px-3 py-2 text-[var(--color-text)]">{row.criterionName}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-2 text-[var(--color-muted)] italic">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION 3: CARD USAGE REPORT                                      */}
          {/* ================================================================= */}
          <section className="report-section print-card bg-white rounded-lg border border-gray-300 p-6 shadow-none space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Section 3 — Card Usage Report</span>
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Visitor accessibility cards, frequency of use, and idle card inventory.
                </p>
              </div>

              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={handleExportSection3}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="Export card usage report as CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Total Cards Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded border border-gray-200 bg-gray-50/70">
                <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
                  Total Registered Cards
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-text)] mt-1">
                  {cardMetrics.totalCards}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Total cards in database</p>
              </div>

              <div className="p-4 rounded border border-emerald-200 bg-emerald-50/50">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Active Cards
                </span>
                <p className="text-2xl font-extrabold text-[var(--color-success)] mt-1">
                  {cardMetrics.activeCount}
                </p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Operational and enabled</p>
              </div>

              <div className="p-4 rounded border border-gray-200 bg-gray-100/60">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Inactive / Deactivated Cards
                </span>
                <p className="text-2xl font-extrabold text-gray-700 mt-1">
                  {cardMetrics.inactiveCount}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Deactivated cards (scans rejected)</p>
              </div>
            </div>

            {/* Most-Used Cards Table */}
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-gray-200 font-bold text-xs text-[var(--color-text)] uppercase tracking-wider">
                Most-Used Cards by Scan Count
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Card UID
                      </th>
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Mode
                      </th>
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Label / Purpose
                      </th>
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Total Scans
                      </th>
                      <th scope="col" className="px-4 py-2 font-bold text-[var(--color-text)]">
                        Last Tapped
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cardMetrics.mostUsed.slice(0, 8).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono font-bold text-[var(--color-text)]">
                          <div className="flex items-center gap-1.5">
                            <span>{c.uid}</span>
                            {c.is_sample && <SampleBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-2 capitalize font-medium">{c.mode.replace('_', ' ')}</td>
                        <td className="px-4 py-2 text-[var(--color-muted)]">{c.label || '—'}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                        </td>
                        <td className="px-4 py-2 font-extrabold text-[var(--color-primary)]">
                          {c.scanCount}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-muted)]">
                          {c.lastScanned ? new Date(c.lastScanned).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Never Used */}
            <div className="border border-gray-200 rounded p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[var(--color-muted)]" aria-hidden="true" />
                <span>Cards Never Used ({cardMetrics.neverUsed.length})</span>
              </h3>
              {cardMetrics.neverUsed.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)] italic">
                  All registered cards have been tapped at least once.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {cardMetrics.neverUsed.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded bg-gray-100 border border-gray-300 font-mono text-xs text-[var(--color-text)]"
                    >
                      {c.uid} {c.label ? `(${c.label})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION 4: DEVICE STATUS REPORT                                   */}
          {/* ================================================================= */}
          <section className="report-section print-card bg-white rounded-lg border border-gray-300 p-6 shadow-none space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Section 4 — Device Status Report</span>
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Reader hardware uptime status, last heartbeat timestamps, and volume per reader.
                </p>
              </div>

              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={handleExportSection4}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="Export device status report as CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Devices Table */}
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th scope="col" className="px-4 py-3 font-bold text-[var(--color-text)]">
                      Device Identifier
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold text-[var(--color-text)]">
                      Hardware Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold text-[var(--color-text)]">
                      Last Heartbeat Time
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold text-[var(--color-text)]">
                      Total Physical Scans
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deviceMetrics.map((d) => (
                    <tr key={d.deviceId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-text)]">
                        <span className="flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                          <span>{d.deviceId}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">
                        {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Never connected'}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--color-primary)]">
                        {d.scansHandled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[var(--color-surface)] rounded text-xs text-[var(--color-muted)] flex items-start gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Device heartbeat status updates automatically every 15 seconds. Readers with no heartbeat for over 45 seconds transition to Offline status.
              </p>
            </div>
          </section>

          {/* ========================================================= */}
          {/* PRINT-ONLY FOOTER (Hidden on screen, shown in print)     */}
          {/* ========================================================= */}
          <div className="print-footer print-only">
            Generated on {printDateStr} — Internal assessment indicator, not a certified accessibility rating.
          </div>
        </>
      )}
    </div>
  );
};
