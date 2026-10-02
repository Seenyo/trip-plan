import { useEffect, useState } from 'react';
import { attachmentBlob, cachedAttachmentBlob } from './attachmentMedia';
import { attachmentUrl, attachmentUrlExpiresAt } from './travelDocuments';

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
    let timer;
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
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);
          url = objectUrl;
        } else if (!download && navigator.onLine) {
          url = await attachmentUrl(path);
          expiresAt = attachmentUrlExpiresAt(path);
        }
        if (!active) return;
        loaded = Boolean(url);
        setResult({ path, url: url || null, failed: !url });
        if (loaded && expiresAt) timer = setTimeout(load, Math.max(0, expiresAt - Date.now()));
      } catch {
        if (active) setResult({ path, url: null, failed: true });
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
      active = false; clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.removeEventListener('online', load);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [path, download, fallbackPath]);
  return result.path === path ? result : { url: null, failed: false };
}
