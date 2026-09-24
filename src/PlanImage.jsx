import React, { useEffect, useRef, useState } from 'react';
import { ATTACHMENT_URL_TTL_SECONDS, attachmentUrl } from './travelDocuments';
import { offlineAttachmentBlob } from './offlineTrip';

export default function PlanImage({ image, className = '', eager = false }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const localUrl = useRef(null);
  const path = typeof image === 'string' ? image : image?.path;
  const alt = typeof image === 'string' ? '予定の写真' : image?.alt || '予定の写真';

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!path) return undefined;
    let active = true;
    let timer;
    const replaceLocalUrl = (next = null) => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = next;
    };
    const refresh = async () => {
      clearTimeout(timer);
      let delay = 60000;
      try {
        let signedUrl = navigator.onLine ? await attachmentUrl(path) : null;
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
        if (signedUrl && !localUrl.current) delay = (ATTACHMENT_URL_TTL_SECONDS - 300) * 1000;
      } catch {
        const blob = await offlineAttachmentBlob(path).catch(() => null);
        if (!active) return;
        if (blob) {
          const local = URL.createObjectURL(blob);
          replaceLocalUrl(local);
          setUrl(local);
          setFailed(false);
        } else setFailed(true);
      }
      if (active) timer = setTimeout(refresh, delay);
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
  return <img className={className} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} />;
}
