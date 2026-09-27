import React, { useEffect, useRef, useState } from 'react';
import { loadPlacePhotos } from './placePhotos';
import { PhotoCredit } from './GooglePlacePhotos';
import ImageViewer from './ImageViewer';

// Request a fresh Place Photo only as its stop approaches the visible part of the sheet.
// Google photo URLs are short lived and must never be saved with the itinerary.
export default function StopGooglePhoto({ item, photoQuery }) {
  const node = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(Boolean(window.google?.maps));
  const [photo, setPhoto] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const target = node.current;
    if (!target) return undefined;
    if (!window.IntersectionObserver) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '180px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [item.id]);

  useEffect(() => {
    const update = () => setReady(Boolean(navigator.onLine && window.google?.maps));
    update();
    window.addEventListener('roam-maps-ready', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('roam-maps-ready', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!visible || !ready) return undefined;
    let active = true;
    loadPlacePhotos(window.google.maps, { ...item, title: photoQuery }, 1)
      .then(([first]) => { if (active) setPhoto(first || null); })
      .catch(() => { if (active) setPhoto(null); });
    return () => { active = false; };
  }, [item.id, item.placeId, item.coords?.lat, item.coords?.lng, photoQuery, visible, ready]);

  return <div ref={node} className="stop-google-photo-anchor">
    {photo && <div className="stop-google-photo">
      <button type="button" className="stop-google-photo-image" onClick={(event) => { event.stopPropagation(); setExpanded(true); }}
        aria-label={`${item.title}のGoogle マップの写真を拡大`}>
        <img src={photo.url} alt={`${item.title}の写真`} loading="lazy" decoding="async" />
      </button>
      <PhotoCredit photo={photo} />
    </div>}
    {expanded && photo && <ImageViewer src={photo.fullUrl || photo.url} alt={`${item.title}の写真`}
      onClose={() => setExpanded(false)} footer={<PhotoCredit photo={photo} />} />}
  </div>;
}
