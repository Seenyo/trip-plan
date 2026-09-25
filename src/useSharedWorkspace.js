import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, loadSharedWorkspace, saveSharedWorkspace } from './supabase';
import { migrateTripsForCurrentApp } from './tripMigrations';
import { offlineTripSnapshots } from './offlineTrip';

const TRIPS_KEY = 'roam.trips.v3';
const HISTORY_LIMIT = 40;

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function useSharedWorkspace(initialTrips) {
  const [trips, setTripsState] = useState(() => {
    const localTrips = migrateTripsForCurrentApp(readJson(TRIPS_KEY, initialTrips));
    if (navigator.onLine) return localTrips;
    const existing = new Set(localTrips.map((trip) => trip.id));
    return [...localTrips, ...offlineTripSnapshots().filter((trip) => !existing.has(trip.id))];
  });
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'loading' : 'local');
  const [history, setHistory] = useState({ past: [], future: [] });
  const tripsRef = useRef(trips);
  const historyRef = useRef(history);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const revisionRef = useRef(0);
  const mountedRef = useRef(true);
  const savedSnapshotRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingWritesRef = useRef(0);

  const publishHistory = useCallback((next) => {
    historyRef.current = next;
    setHistory(next);
  }, []);
  const setTrips = useCallback((updater) => {
    const previous = tripsRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (next === previous) return;
    publishHistory({
      past: [...historyRef.current.past, previous].slice(-HISTORY_LIMIT),
      future: [],
    });
    tripsRef.current = next;
    setTripsState(next);
  }, [publishHistory]);
  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    publishHistory({
      past: historyRef.current.past.slice(0, -1),
      future: [...historyRef.current.future, tripsRef.current].slice(-HISTORY_LIMIT),
    });
    tripsRef.current = previous;
    setTripsState(previous);
  }, [publishHistory]);
  const redo = useCallback(() => {
    const next = historyRef.current.future.at(-1);
    if (!next) return;
    publishHistory({
      past: [...historyRef.current.past, tripsRef.current].slice(-HISTORY_LIMIT),
      future: historyRef.current.future.slice(0, -1),
    });
    tripsRef.current = next;
    setTripsState(next);
  }, [publishHistory]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const load = async () => {
      try {
        const remote = await loadSharedWorkspace();
        if (cancelled) return;
        if (!remote) throw new Error('共有ワークスペースが見つかりません。');
        revisionRef.current = remote.revision || 0;
        const remoteTrips = migrateTripsForCurrentApp(Array.isArray(remote.trips) && remote.trips.length ? remote.trips : trips);
        // Only the remote payload is saved; local fallback seeds still need a write.
        savedSnapshotRef.current = JSON.stringify(remote.trips);
        tripsRef.current = remoteTrips;
        setTripsState(remoteTrips);
        publishHistory({ past: [], future: [] });
        setReady(true);
        setSyncStatus('saved');
      } catch (error) {
        console.warn('Supabase workspace could not be loaded. Using this browser instead.', error);
        if (!cancelled) {
          // Never write the local fallback over a workspace we could not read.
          setReady(false);
          setSyncStatus('error');
        }
      }
    };
    load();
    return () => { cancelled = true; };
    // The first local snapshot is intentionally used only as a seed when the cloud is empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return undefined;
    const snapshot = JSON.stringify(trips);
    if (snapshot === savedSnapshotRef.current && pendingWritesRef.current === 0) {
      setSyncStatus('saved');
      return undefined;
    }
    let cancelled = false;
    setSyncStatus('saving');
    const timer = window.setTimeout(() => {
      // Serialize writes so an older request cannot finish after a newer edit.
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (cancelled) return;
        pendingWritesRef.current += 1;
        try {
          const saved = await saveSharedWorkspace({
            trips,
            revision: revisionRef.current,
          });
          revisionRef.current = saved?.revision || revisionRef.current + 1;
          savedSnapshotRef.current = snapshot;
          if (mountedRef.current && !cancelled) setSyncStatus('saved');
        } catch (error) {
          console.warn('Supabase workspace could not be saved.', error);
          if (mountedRef.current && !cancelled) setSyncStatus('error');
        } finally {
          pendingWritesRef.current -= 1;
        }
      });
    }, 700);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ready, trips]);

  return { trips, setTrips, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0, syncStatus };
}
