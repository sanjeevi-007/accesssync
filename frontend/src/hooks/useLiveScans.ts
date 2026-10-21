import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface ScanInstruction {
  id: number;
  library_id?: number;
  area_id?: number;
  mode: string;
  language: string;
  priority: number;
  title: string;
  content: string;
}

export interface LiveScanEvent {
  event_id: string;
  card_uid?: string;
  result: 'accepted' | 'rejected' | string;
  reason?: string | null;
  mode?: 'blind' | 'hearing' | 'low_vision' | string | null;
  instructions?: ScanInstruction[];
  device_id?: string | number | null;
  created_at?: string;
}

interface UseLiveScansReturn {
  latestScan: LiveScanEvent | null;
  isConnected: boolean;
  isPolling: boolean;
  clearLatestScan: () => void;
}

export const useLiveScans = (): UseLiveScansReturn => {
  const [latestScan, setLatestScan] = useState<LiveScanEvent | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Clear latest scan helper
  const clearLatestScan = useCallback(() => {
    setLatestScan(null);
  }, []);

  // Polling fallback handler
  const pollLatestScan = useCallback(async () => {
    try {
      const res = await apiClient<{ items: any[] }>('/api/rfid/scans?limit=1');
      if (!isMountedRef.current) return;

      if (res && res.items && res.items.length > 0) {
        const item = res.items[0];
        if (item.event_id && item.event_id !== lastEventIdRef.current) {
          lastEventIdRef.current = item.event_id;

          let parsedInstructions: ScanInstruction[] = [];
          if (item.instruction_snapshot) {
            try {
              parsedInstructions =
                typeof item.instruction_snapshot === 'string'
                  ? JSON.parse(item.instruction_snapshot)
                  : item.instruction_snapshot;
            } catch (err) {
              console.error('Failed to parse instruction_snapshot:', err);
            }
          }

          setLatestScan({
            event_id: item.event_id,
            card_uid: item.card_uid,
            result: item.result,
            reason: item.reason,
            mode: item.mode,
            instructions: parsedInstructions,
            device_id: item.device_id,
            created_at: item.created_at,
          });
        }
      }
    } catch {
      // Ignore polling errors (e.g. 401 if unauthenticated on public terminal)
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) return;
    setIsPolling(true);
    // Immediate initial poll
    pollLatestScan();
    // Every 3 seconds
    pollIntervalRef.current = window.setInterval(pollLatestScan, 3000);
  }, [pollLatestScan]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const defaultWs = `${protocol}//${host}:8000/ws/events`;
      const wsUrl = import.meta.env.VITE_WS_URL || defaultWs;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        stopPolling();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'scan' && msg.data) {
            const data = msg.data;
            if (data.event_id && data.event_id !== lastEventIdRef.current) {
              lastEventIdRef.current = data.event_id;
              setLatestScan({
                event_id: data.event_id,
                card_uid: data.card_uid,
                result: data.result || 'accepted',
                reason: data.reason || null,
                mode: data.mode || null,
                instructions: data.instructions || [],
                device_id: data.device_id || null,
                created_at: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          console.debug('Non-JSON WebSocket message received:', err);
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        startPolling();
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        startPolling();

        // Schedule reconnection attempt in 4 seconds
        if (reconnectTimeoutRef.current === null) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 4000);
        }
      };
    } catch {
      setIsConnected(false);
      startPolling();
    }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [connectWebSocket]);

  return {
    latestScan,
    isConnected,
    isPolling,
    clearLatestScan,
  };
};
