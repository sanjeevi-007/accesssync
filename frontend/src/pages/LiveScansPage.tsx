import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useLiveScans } from '../hooks/useLiveScans';
import { StatusBadge } from '../components/StatusBadge';
import { SampleBadge } from '../components/SampleBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { exportToCsv } from '../utils/exportCsv';
import {
  Radio,
  Wifi,
  WifiOff,
  Download,
  Filter,
  Layers,
  Clock,
  RefreshCw,
  Cpu,
} from 'lucide-react';

interface DeviceItem {
  device_id: string;
  status: string;
  last_seen_at: string | null;
}

export interface ScanRecord {
  id?: number;
  event_id: string;
  card_uid: string;
  result: string;
  reason?: string | null;
  mode?: string | null;
  device_id?: string | number | null;
  is_sample?: boolean;
  created_at?: string | null;
}

export const LiveScansPage: React.FC = () => {
  const { latestScan, isConnected } = useLiveScans();

  // Scan state
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Screen-reader live announcement
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Devices list for device filter
  const [devices, setDevices] = useState<DeviceItem[]>([]);

  // Filters
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');

  // DOM ref for auto-scrolling to top
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Motion preference detection
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

  // Format device label helper
  const getDeviceDisplayName = useCallback(
    (devId: string | number | null | undefined): string => {
      if (!devId) return 'reader-01';
      return String(devId);
    },
    []
  );

  // Load devices list
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devList = await apiClient<DeviceItem[]>('/api/devices/status');
        setDevices(devList || []);
      } catch {
        // Fallback default
        setDevices([{ device_id: 'reader-01', status: 'online', last_seen_at: null }]);
      }
    };
    fetchDevices();
  }, []);

  // Fetch initial scans
  const loadInitialScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/rfid/scans?skip=0&limit=20';
      if (filterResult !== 'all') {
        url += `&result=${filterResult}`;
      }

      const res = await apiClient<{ items: ScanRecord[]; total: number }>(url);
      setScans(res.items || []);
      setTotalScans(res.total || 0);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load scan records from server.');
    } finally {
      setLoading(false);
    }
  }, [filterResult]);

  useEffect(() => {
    loadInitialScans();
  }, [loadInitialScans]);

  // Load more older scans (Pagination)
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextSkip = scans.length;
      let url = `/api/rfid/scans?skip=${nextSkip}&limit=20`;
      if (filterResult !== 'all') {
        url += `&result=${filterResult}`;
      }

      const res = await apiClient<{ items: ScanRecord[]; total: number }>(url);
      if (res.items && res.items.length > 0) {
        setScans((prev) => {
          const existingIds = new Set(prev.map((s) => s.event_id));
          const newUnique = res.items.filter((item) => !existingIds.has(item.event_id));
          return [...prev, ...newUnique];
        });
      }
      setTotalScans(res.total || 0);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load more scans.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Fallback Polling every 5s if WebSocket is unavailable
  useEffect(() => {
    if (isConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        let url = '/api/rfid/scans?skip=0&limit=20';
        if (filterResult !== 'all') {
          url += `&result=${filterResult}`;
        }
        const res = await apiClient<{ items: ScanRecord[]; total: number }>(url);
        if (res.items && res.items.length > 0) {
          setScans((prev) => {
            const existingIds = new Set(prev.map((s) => s.event_id));
            const newIncoming = res.items.filter((s) => !existingIds.has(s.event_id));
            if (newIncoming.length > 0) {
              setTotalScans(res.total || prev.length + newIncoming.length);
              return [...newIncoming, ...prev];
            }
            return prev;
          });
        }
      } catch {
        // Polling error ignored
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isConnected, filterResult]);

  // Handle incoming real-time scan from WebSocket
  useEffect(() => {
    if (!latestScan || !latestScan.event_id) return;

    setScans((prev) => {
      const exists = prev.some((s) => s.event_id === latestScan.event_id);
      if (exists) return prev;

      const newRecord: ScanRecord = {
        event_id: latestScan.event_id,
        card_uid: latestScan.card_uid || 'UNKNOWN',
        result: latestScan.result || 'accepted',
        reason: latestScan.reason || null,
        mode: latestScan.mode || null,
        device_id: latestScan.device_id || 'reader-01',
        created_at: latestScan.created_at || new Date().toISOString(),
        is_sample: false,
      };

      // Announce via aria-live
      const modeText = newRecord.mode ? `, Mode: ${newRecord.mode}` : '';
      setLiveAnnouncement(
        `New physical scan received: Card ${newRecord.card_uid}, Result: ${newRecord.result}${modeText}.`
      );

      // Auto-scroll to top when new scan arrives
      if (topAnchorRef.current) {
        topAnchorRef.current.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'nearest',
        });
      }

      setTotalScans((prevTotal) => prevTotal + 1);
      return [newRecord, ...prev];
    });
  }, [latestScan, prefersReducedMotion]);

  // Filter scans by time range & device
  const filteredScans = useMemo(() => {
    const now = Date.now();
    return scans.filter((scan) => {
      // 1. Result filter (already handled if queried from API, but verify for live events)
      if (filterResult !== 'all' && scan.result.toLowerCase() !== filterResult.toLowerCase()) {
        return false;
      }

      // 2. Device filter
      if (filterDevice !== 'all') {
        const scanDev = String(scan.device_id || 'reader-01');
        if (scanDev !== filterDevice) {
          return false;
        }
      }

      // 3. Time range filter
      if (filterTimeRange !== 'all' && scan.created_at) {
        const scanTimestamp = new Date(scan.created_at).getTime();
        const diffMs = now - scanTimestamp;
        if (filterTimeRange === '1h' && diffMs > 60 * 60 * 1000) {
          return false;
        }
        if (filterTimeRange === '24h' && diffMs > 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      return true;
    });
  }, [scans, filterResult, filterDevice, filterTimeRange]);

  // Format date helper
  const formatTimestamp = (isoString?: string | null): string => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      return String(isoString);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Card UID', 'Result', 'Reason', 'Mode', 'Device'];
    const rows = filteredScans.map((scan) => [
      formatTimestamp(scan.created_at),
      scan.card_uid,
      scan.result,
      scan.reason || '',
      scan.mode || '',
      getDeviceDisplayName(scan.device_id),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`scan_history_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Invisible live region for screen-reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Anchor for auto-scroll to top */}
      <div ref={topAnchorRef} />

      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
            <span>Live RFID Scans</span>
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Real-time feed of physical RFID cards tapped at City Central Library readers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection Status Badge */}
          {isConnected ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-[var(--color-success)] border border-emerald-300"
              title="Connected to WebSocket event server"
            >
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <span>WebSocket Live</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-[var(--color-warning)] border border-amber-300"
              title="Polling fallback active every 5s"
            >
              <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Polling Fallback (5s)</span>
            </span>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredScans.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded border border-gray-300 bg-white text-[var(--color-text)] text-xs font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-40"
            aria-label="Export scan history as CSV file"
          >
            <Download className="w-4 h-4 text-[var(--color-muted)]" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Total Scans
            </p>
            <p className="text-2xl font-bold text-[var(--color-text)] mt-1">
              {loading ? '...' : totalScans}
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[var(--color-surface)] text-[var(--color-primary)] flex items-center justify-center">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Feed Displaying
            </p>
            <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">
              {filteredScans.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-blue-50 text-[var(--color-primary)] flex items-center justify-center">
            <Radio className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Feed Order
            </p>
            <p className="text-xs font-medium text-[var(--color-text)] mt-2">
              Reverse chronological (newest first)
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-gray-100 text-gray-700 flex items-center justify-center">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
            <span>Filters:</span>
          </div>

          {/* Result Filter */}
          <div>
            <label htmlFor="filter-result" className="sr-only">
              Filter by Result
            </label>
            <select
              id="filter-result"
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">All Results</option>
              <option value="accepted">Accepted Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label htmlFor="filter-time" className="sr-only">
              Filter by Time Range
            </label>
            <select
              id="filter-time"
              value={filterTimeRange}
              onChange={(e) => setFilterTimeRange(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">All Time</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <label htmlFor="filter-device" className="sr-only">
              Filter by Device
            </label>
            <select
              id="filter-device"
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">All Devices</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  Device: {d.device_id}
                </option>
              ))}
              {!devices.some((d) => d.device_id === 'reader-01') && (
                <option value="reader-01">Device: reader-01</option>
              )}
            </select>
          </div>
        </div>

        {/* Clear Filters / Refresh */}
        <div className="flex items-center gap-2">
          {(filterResult !== 'all' || filterTimeRange !== 'all' || filterDevice !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterResult('all');
                setFilterTimeRange('all');
                setFilterDevice('all');
              }}
              className="text-xs text-[var(--color-primary)] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}

          <button
            type="button"
            onClick={loadInitialScans}
            className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            title="Refresh Scan List"
            aria-label="Refresh Scan List"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scan Feed Table or Empty State */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-none">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium text-[var(--color-muted)]">
              Connecting to live scan feed...
            </p>
          </div>
        ) : filteredScans.length === 0 ? (
          /* CRITICAL MANDATORY EMPTY STATE: EXACT TEXT REQUIRED */
          <div className="p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] border border-gray-300 flex items-center justify-center mx-auto text-[var(--color-primary)]">
              <Radio className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Waiting for a physical RFID scan. No scans have been received yet.
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Tap a physical accessibility card on the connected ESP32 reader to activate guidance and register real-time scan events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] border-b border-gray-300">
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-text)] text-xs">
                    Timestamp
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-text)] text-xs">
                    Card UID
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-text)] text-xs">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-text)] text-xs">
                    Mode
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-text)] text-xs">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScans.map((scan, idx) => {
                  const isAccepted = scan.result.toLowerCase() === 'accepted';
                  const formattedTime = formatTimestamp(scan.created_at);
                  const deviceName = getDeviceDisplayName(scan.device_id);

                  return (
                    <tr
                      key={scan.event_id || `scan-${idx}`}
                      tabIndex={0}
                      className="hover:bg-gray-50 focus:outline-none focus:bg-blue-50 transition-none"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">
                        <span className="font-mono">{formattedTime}</span>
                      </td>

                      {/* Card UID */}
                      <td className="px-4 py-3 font-mono font-bold text-xs text-[var(--color-text)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{scan.card_uid}</span>
                          {scan.is_sample && <SampleBadge />}
                        </div>
                      </td>

                      {/* Result */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={scan.result} />
                          {scan.reason && (
                            <span className="text-xs font-mono text-[var(--color-muted)] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {scan.reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mode (if accepted) */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {isAccepted && scan.mode ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                              scan.mode === 'blind'
                                ? 'bg-teal-50 text-[var(--color-mode-blind)] border border-teal-200'
                                : scan.mode === 'hearing'
                                ? 'bg-amber-50 text-[var(--color-mode-hearing)] border border-amber-200'
                                : 'bg-purple-50 text-[var(--color-mode-lowvision)] border border-purple-200'
                            }`}
                          >
                            {scan.mode.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[var(--color-text)]">
                          <Cpu className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                          <span>{deviceName}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button for Pagination */}
        {filteredScans.length > 0 && scans.length < totalScans && (
          <div className="p-4 border-t border-gray-200 bg-[var(--color-surface)] text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded border border-gray-300 bg-white text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {loadingMore ? 'Loading older scans...' : `Load more scans (${scans.length} of ${totalScans})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
