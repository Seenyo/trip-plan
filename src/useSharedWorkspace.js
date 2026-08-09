import { useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, loadSharedWorkspace, saveSharedWorkspace } from './supabase';

const TRIPS_KEY = 'roam.trips.v3';
const PLAN_KEY = 'roam.plan.v1';

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function useSharedWorkspace(initialTrips) {
  const [trips, setTrips] = useState(() => readJson(TRIPS_KEY, initialTrips));
  const [planDocument, setPlanDocument] = useState(() => readJson(PLAN_KEY, []));
  const [planMarkdown, setPlanMarkdown] = useState('');
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'loading' : 'local');
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const revisionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const load = async () => {
      try {
        const remote = await loadSharedWorkspace();
        if (cancelled || !remote) return;
        revisionRef.current = remote.revision || 0;
        const remoteTrips = Array.isArray(remote.trips) && remote.trips.length ? remote.trips : trips;
        const remotePlan = Array.isArray(remote.plan_document) ? remote.plan_document : planDocument;
        setTrips(remoteTrips);
        setPlanDocument(remotePlan);
        setPlanMarkdown(remote.plan_markdown || '');
        setReady(true);
        setSyncStatus('saved');
      } catch (error) {
        console.warn('Supabase workspace could not be loaded. Using this browser instead.', error);
        if (!cancelled) {
          setReady(true);
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
    localStorage.setItem(PLAN_KEY, JSON.stringify(planDocument));
  }, [planDocument]);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return undefined;
    setSyncStatus('saving');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await saveSharedWorkspace({
          trips,
          planDocument,
          planMarkdown,
          revision: revisionRef.current,
        });
        revisionRef.current = saved?.revision || revisionRef.current + 1;
        if (mountedRef.current) setSyncStatus('saved');
      } catch (error) {
        console.warn('Supabase workspace could not be saved.', error);
        if (mountedRef.current) setSyncStatus('error');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [ready, trips, planDocument, planMarkdown]);

  const updatePlan = (document, markdown = '') => {
    setPlanDocument(document);
    setPlanMarkdown(markdown);
  };

  return { trips, setTrips, planDocument, updatePlan, syncStatus };
}
