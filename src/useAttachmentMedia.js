import { useEffect, useState } from 'react';
import { attachmentBlob, cachedAttachmentBlob } from './attachmentMedia';
import { attachmentUrl, attachmentUrlExpiresAt, attachmentUrlValidUntil } from './travelDocuments';

const RETRY_DELAYS = [2000, 10000, 30000];

export function useAttachmentMedia(path, { download = true, fallbackPath = null } = {}) {
  const [result, setResult] = useState({ path: null, url: null, failed: false });
  useEffect(() => {
    if (!path) {
      setResult({ path: null, url: null, failed: false });
      return undefined;
    }
    let active = true;
    let inFlight = false;
    let retryPending = false;
    let objectUrl = null;
    let expiresAt = 0;
    let validUntil = 0;
    let retries = 0;
    let timer;
    let expiryTimer;
    let loaded = false;
    const load = async () => {
      if (!active || (loaded && (!expiresAt || Date.now() < expiresAt))) return;
      if (inFlight) { retryPending = true; return; }
      inFlight = true;
      clearTimeout(timer);
      try {
        let blob;
        try { blob = download ? await attachmentBlob(path) : await cachedAttachmentBlob(path); }
        catch (error) { if (!fallbackPath) throw error; }
        if (!blob && fallbackPath) blob = await attachmentBlob(fallbackPath);
        if (!active) return;
        let url;
        if (blob) {
          expiresAt = 0;
          validUntil = 0;
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);
          url = objectUrl;
        } else if (!download && navigator.onLine) {
          url = await attachmentUrl(path);
          expiresAt = attachmentUrlExpiresAt(path);
          validUntil = attachmentUrlValidUntil(path);
        }
        if (!active) return;
        if (!url) throw new Error('Attachment unavailable');
        loaded = true;
        retries = 0;
        clearTimeout(expiryTimer);
        setResult({ path, url, failed: false });
        if (validUntil) expiryTimer = setTimeout(() => {
          if (!active) return;
          loaded = false;
          setResult({ path, url: null, failed: true });
        }, Math.max(0, validUntil - Date.now()));
        if (loaded && expiresAt) timer = setTimeout(load, Math.max(0, expiresAt - Date.now()));
      } catch {
        if (!active) return;
        // Renewal begins five minutes before expiry: keep the working PDF link.
        const stillValid = loaded && (objectUrl || Date.now() < validUntil);
        if (!stillValid) {
          loaded = false;
          setResult({ path, url: null, failed: true });
        }
        if (navigator.onLine && retries < RETRY_DELAYS.length) {
          timer = setTimeout(load, RETRY_DELAYS[retries++]);
        }
      } finally {
        inFlight = false;
        if (active && retryPending) { retryPending = false; void load(); }
      }
    };
    const resume = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    window.addEventListener('online', load);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false; clearTimeout(timer); clearTimeout(expiryTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.removeEventListener('online', load);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [path, download, fallbackPath]);
  return result.path === path ? result : { url: null, failed: false };
}
