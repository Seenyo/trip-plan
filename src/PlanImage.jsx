import React, { useEffect, useRef, useState } from 'react';
import { useAttachmentMedia } from './useAttachmentMedia';
import ImageViewer from './ImageViewer';

export default function PlanImage({ image, className = '', eager = false, expandable = false }) {
  const node = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [expanded, setExpanded] = useState(false);
  const path = typeof image === 'string' ? image : image?.path;
  const thumbnailPath = image?.thumbnailPath || path;
  const alt = typeof image === 'string' ? '予定の写真' : image?.alt || '予定の写真';
  const preview = useAttachmentMedia(visible ? thumbnailPath : null, { fallbackPath: thumbnailPath !== path ? path : null });
  const full = useAttachmentMedia(expanded ? path : null);

  useEffect(() => {
    setExpanded(false);
  }, [path]);
  useEffect(() => {
    if (eager || !window.IntersectionObserver) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '120px' });
    if (node.current) observer.observe(node.current);
    return () => observer.disconnect();
  }, [eager]);

  const placeholder = <span ref={expandable ? undefined : node} className={`plan-image-placeholder ${expandable ? '' : className}`} aria-label={preview.failed ? '写真を読み込めません' : '写真を読み込み中'} />;
  const photo = preview.url ? <img ref={expandable ? undefined : node} className={expandable ? '' : className} src={preview.url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" /> : placeholder;
  if (!expandable) return photo;
  return <>
    <button ref={node} type="button" className={`plan-image-button ${className}`} aria-label={`${alt}を拡大`} disabled={!preview.url}
      onClick={(event) => { event.stopPropagation(); setExpanded(true); }}>{photo}</button>
    {expanded && <ImageViewer src={full.url || preview.url} alt={alt} onClose={() => setExpanded(false)} />}
  </>;
}
