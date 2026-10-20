import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface DeviceStatus {
  device_id: string;
  status: 'online' | 'offline' | 'never_connected';
  last_seen_at: string | null;
}

export function useDeviceStatus(pollIntervalMs: number = 5000) {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient<DeviceStatus[]>('/api/devices/status');
      setDeviceStatuses(data);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to fetch device status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchStatus, pollIntervalMs]);

  let overallStatus: 'online' | 'offline' | 'never_connected' = 'never_connected';
  if (deviceStatuses.length > 0) {
    if (deviceStatuses.some((d) => d.status === 'online')) {
      overallStatus = 'online';
    } else if (deviceStatuses.some((d) => d.status === 'offline')) {
      overallStatus = 'offline';
    } else {
      overallStatus = 'never_connected';
    }
  }

  return {
    deviceStatuses,
    overallStatus,
    loading,
    error,
    refetch: fetchStatus,
  };
}
