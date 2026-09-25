import React, { useEffect, useState } from 'react';
import { ATTACHMENT_URL_TTL_SECONDS, attachmentUrl } from './travelDocuments';
import { offlineAttachmentBlob } from './offlineTrip';
import ImageViewer from './ImageViewer';

export default function PlanImage({ image, className = '', eager = false, expandable = false }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const path = typeof image === 'string' ? image : image?.path;
  const alt = typeof image === 'string' ? '予定の写真' : image?.alt || '予定の写真';

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    setExpanded(false);
    if (!path) return undefined;
    let active = true;
    let refreshing = false;
    let refreshPending = false;
    let localUrl = null;
    let timer;
    const replaceLocalUrl = (next = null) => {
      if (localUrl) URL.revokeObjectURL(localUrl);
      localUrl = next;
    };
    const refresh = async () => {
      // Safari can fire focus, online and visibilitychange together on resume.
      // Keep one request per image and never let an old path replace a new blob URL.
      if (!active) return;
      if (refreshing) {
        refreshPending = true;
        return;
      }
      refreshing = true;
      clearTimeout(timer);
      let delay = 60000;
      try {
        let signedUrl = navigator.onLine ? await attachmentUrl(path) : null;
        if (!active) return;
        if (!signedUrl) {
          const blob = await offlineAttachmentBlob(path);
          if (blob) {
            if (!active) return;
            signedUrl = URL.createObjectURL(blob);
            replaceLocalUrl(signedUrl);
          }
        } else replaceLocalUrl();
        if (!active) return;
        setUrl(signedUrl);
        setFailed(!signedUrl);
        if (signedUrl && !localUrl) delay = (ATTACHMENT_URL_TTL_SECONDS - 300) * 1000;
      } catch {
        if (!active) return;
        const blob = await offlineAttachmentBlob(path).catch(() => null);
        if (!active) return;
        if (blob) {
          const local = URL.createObjectURL(blob);
          replaceLocalUrl(local);
          setUrl(local);
          setFailed(false);
        } else setFailed(true);
      } finally {
        refreshing = false;
        if (active && refreshPending) {
          refreshPending = false;
          void refresh();
        } else if (active) timer = setTimeout(refresh, delay);
      }
    };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      clearTimeout(timer);
      replaceLocalUrl();
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [path]);

  if (!url) return <span className={`plan-image-placeholder ${className}`} aria-label={failed ? '写真を読み込めません' : '写真を読み込み中'} />;
  const photo = <img className={expandable ? '' : className} src={url} alt={alt}
    loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" />;
  if (!expandable) return photo;
  return <>
    <button type="button" className={`plan-image-button ${className}`} aria-label={`${alt}を拡大`}
      onClick={(event) => { event.stopPropagation(); setExpanded(true); }}>{photo}</button>
    {expanded && <ImageViewer src={url} alt={alt} onClose={() => setExpanded(false)} />}
  </>;
}
