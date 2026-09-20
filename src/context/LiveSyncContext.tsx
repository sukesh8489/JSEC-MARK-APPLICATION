import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LiveConnectionStatus,
  LiveBackendEvent,
  subscribeToLiveBackendEvents,
  testFirestoreConnection,
  subscribeToLiveMarksheets,
  subscribeToLiveBatches,
} from '../services/firestoreService';
import firebaseConfig from '../../firebase-applet-config.json';

export interface LiveSyncState {
  firestoreStatus: LiveConnectionStatus;
  backendStatus: 'online' | 'connecting' | 'offline';
  databaseId: string;
  projectId: string;
  recentEvents: LiveBackendEvent[];
  lastSyncTime: string;
  activeClientCount: number;
  latestEvent: LiveBackendEvent | null;
  refreshConnections: () => Promise<void>;
}

const LiveSyncContext = createContext<LiveSyncState | undefined>(undefined);

export const LiveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firestoreStatus, setFirestoreStatus] = useState<LiveConnectionStatus>('connecting');
  const [backendStatus, setBackendStatus] = useState<'online' | 'connecting' | 'offline'>('connecting');
  const [recentEvents, setRecentEvents] = useState<LiveBackendEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<LiveBackendEvent | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [activeClientCount, setActiveClientCount] = useState<number>(1);

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const projectId = firebaseConfig.projectId || 'sacred-feat-t9v0l';

  // Check Backend health
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        if (data.connectedClients) {
          setActiveClientCount(data.connectedClients);
        }
        setLastSyncTime(new Date().toLocaleTimeString());
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  // Check Firestore connection
  const checkFirestore = useCallback(async () => {
    setFirestoreStatus('connecting');
    const isOk = await testFirestoreConnection();
    setFirestoreStatus(isOk ? 'connected' : 'offline');
    setLastSyncTime(new Date().toLocaleTimeString());
  }, []);

  const refreshConnections = useCallback(async () => {
    await Promise.all([checkBackendHealth(), checkFirestore()]);
  }, [checkBackendHealth, checkFirestore]);

  // Initial boot validation & periodic health ping
  useEffect(() => {
    refreshConnections();

    const interval = setInterval(() => {
      checkBackendHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshConnections, checkBackendHealth]);

  // Subscribe to live Server-Sent Events (SSE) from the Node/Express backend
  useEffect(() => {
    const unsubSSE = subscribeToLiveBackendEvents((event) => {
      setLatestEvent(event);
      setLastSyncTime(new Date().toLocaleTimeString());
      setRecentEvents((prev) => {
        // Prevent duplicate IDs
        if (prev.some((e) => e.id === event.id)) return prev;
        return [event, ...prev.slice(0, 49)];
      });
    });

    // Also fetch initial list of recent events from backend
    fetch('/api/updates/recent')
      .then((r) => r.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) {
          setRecentEvents(data.events);
          if (data.events.length > 0) {
            setLatestEvent(data.events[0]);
          }
        }
      })
      .catch(() => {});

    return () => {
      unsubSSE();
    };
  }, []);

  // Listen to Firestore marksheets live status
  useEffect(() => {
    const unsubSheets = subscribeToLiveMarksheets(
      () => {
        setFirestoreStatus('connected');
        setLastSyncTime(new Date().toLocaleTimeString());
      },
      (status) => {
        setFirestoreStatus(status);
      }
    );

    return () => {
      unsubSheets();
    };
  }, []);

  return (
    <LiveSyncContext.Provider
      value={{
        firestoreStatus,
        backendStatus,
        databaseId,
        projectId,
        recentEvents,
        lastSyncTime,
        activeClientCount,
        latestEvent,
        refreshConnections,
      }}
    >
      {children}
    </LiveSyncContext.Provider>
  );
};

export function useLiveSync() {
  const context = useContext(LiveSyncContext);
  if (!context) {
    throw new Error('useLiveSync must be used within a LiveSyncProvider');
  }
  return context;
}
