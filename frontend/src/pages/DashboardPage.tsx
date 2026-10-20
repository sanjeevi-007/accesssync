import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  Building2,
  MapPin,
  CreditCard,
  ListOrdered,
  Award,
  Radio,
  Clock,
  ArrowRight,
} from 'lucide-react';

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

interface ScanEventItem {
  id: number;
  event_id: string;
  card_uid: string;
  result: string;
  reason: string | null;
  mode: string | null;
  created_at: string | null;
}

export const DashboardPage: React.FC = () => {
  const { overallStatus, deviceStatuses } = useDeviceStatus();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [librariesCount, setLibrariesCount] = useState<number>(0);
  const [areasCount, setAreasCount] = useState<number>(0);
  const [activeCardsCount, setActiveCardsCount] = useState<number>(0);
  const [instructionsCount, setInstructionsCount] = useState<number>(0);
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [recentScans, setRecentScans] = useState<ScanEventItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [libs, areas, cards, insts, score, scans] = await Promise.all([
          apiClient<{ total: number }>('/api/libraries?limit=1'),
          apiClient<{ total: number }>('/api/areas?limit=1'),
          apiClient<{ total: number }>('/api/cards?is_active=true&limit=1'),
          apiClient<{ total: number }>('/api/instructions?limit=1'),
          apiClient<ScoreResponse>('/api/assessments/score?library_id=1').catch(() => null),
          apiClient<{ items: ScanEventItem[] }>('/api/rfid/scans?limit=5').catch(() => ({ items: [] })),
        ]);

        if (isMounted) {
          setLibrariesCount(libs.total);
          setAreasCount(areas.total);
          setActiveCardsCount(cards.total);
          setInstructionsCount(insts.total);
          setScoreData(score);
          setRecentScans(scans.items || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.error?.message || 'Failed to load dashboard metrics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">System Overview</h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          City Central Library accessibility infrastructure and active guidance operations.
        </p>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Accessibility Score Indicator */}
        <div className="bg-white rounded-lg border border-gray-300 p-5 shadow-none sm:col-span-2 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Accessibility Indicator
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[var(--color-primary)]">
                  {loading ? '...' : scoreData?.score !== null && scoreData?.score !== undefined ? `${scoreData.score}%` : 'N/A'}
                </span>
                <span className="text-xs text-[var(--color-muted)]">City Central Library</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            {scoreData && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] mb-2 font-medium">
                <span>Pass: <strong className="text-[var(--color-success)]">{scoreData.breakdown.pass}</strong></span>
                <span>Needs Imp: <strong className="text-[var(--color-warning)]">{scoreData.breakdown.needs_improvement}</strong></span>
                <span>Fail: <strong className="text-[var(--color-danger)]">{scoreData.breakdown.fail}</strong></span>
                <span>Not Assessed: <strong className="text-[var(--color-neutral)]">{scoreData.breakdown.not_assessed}</strong></span>
              </div>
            )}
            <p className="text-xs text-[var(--color-muted)] italic">
              {scoreData?.label || 'Internal assessment indicator, not a certified accessibility rating.'}
            </p>
          </div>
        </div>

        {/* Metric 2: Active RFID Cards */}
        <div className="bg-white rounded-lg border border-gray-300 p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Active RFID Cards
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">
                {loading ? '...' : activeCardsCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 pt-2">
            <Link
              to="/app/cards"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Manage cards <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Device Status */}
        <div className="bg-white rounded-lg border border-gray-300 p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                RFID Reader Device
              </p>
              <div className="mt-3">
                <StatusBadge status={overallStatus} />
              </div>
            </div>
            <div className="w-10 h-10 rounded bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
              <Radio className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 pt-2 text-xs text-[var(--color-muted)]">
            Active readers: {deviceStatuses.filter((d) => d.status === 'online').length} / {deviceStatuses.length || 1}
          </div>
        </div>
      </div>

      {/* Secondary Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-[var(--color-primary)] shrink-0">
            <Building2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)]">Registered Libraries</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{loading ? '...' : librariesCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)]">Configured Areas</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{loading ? '...' : areasCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-teal-50 flex items-center justify-center text-[var(--color-mode-blind)] shrink-0">
            <ListOrdered className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)]">Active Instructions</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{loading ? '...' : instructionsCount}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-none">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="font-bold text-sm text-[var(--color-text)]">Recent RFID Scans</h3>
          </div>
          <Link
            to="/app/scans"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            View all scans &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : recentScans.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-muted)]">
              No recent scans recorded. Tap a physical RFID card on the reader to test.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-[var(--color-muted)]">
                  <th scope="col" className="px-4 py-2.5">Time</th>
                  <th scope="col" className="px-4 py-2.5">Card UID</th>
                  <th scope="col" className="px-4 py-2.5">Mode</th>
                  <th scope="col" className="px-4 py-2.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                      {scan.created_at ? new Date(scan.created_at).toLocaleTimeString() : 'Recent'}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-xs text-[var(--color-text)]">
                      {scan.card_uid}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-[var(--color-text)]">
                      {scan.mode || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={scan.result === 'accepted' ? 'pass' : 'fail'} />
                      {scan.reason && (
                        <span className="ml-2 text-xs text-[var(--color-muted)] font-mono">
                          ({scan.reason})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
