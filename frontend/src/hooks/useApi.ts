import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface UseApiOptions {
  autoFetch?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export function useApi<T>(endpoint: string, options: UseApiOptions = {}) {
  const { autoFetch = true, params } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const serializedParams = JSON.stringify(params);

  const fetchData = useCallback(
    async (overrideParams?: Record<string, string | number | boolean | undefined | null>) => {
      setLoading(true);
      setError(null);
      try {
        const mergedParams = { ...params, ...overrideParams };
        const queryParts: string[] = [];
        Object.entries(mergedParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
          }
        });
        const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
        const url = `${endpoint}${queryString}`;
        const result = await apiClient<T>(url);
        setData(result);
        return result;
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'An error occurred while fetching data.';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, serializedParams]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchData().catch(() => {});
    }
  }, [fetchData, autoFetch]);

  return {
    data,
    setData,
    loading,
    error,
    refetch: fetchData,
  };
}
