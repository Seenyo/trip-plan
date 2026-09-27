import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ImageViewer({ src, alt, onClose, footer = null, photoIndex = 0, photoCount = 1, onNavigate }) {
  const close = useRef(null);
  const dialog = useRef(null);
  const touchStart = useRef(null);
  const hasGallery = photoCount > 1 && Boolean(onNavigate);
  const navigate = (direction) => {
    if (hasGallery) onNavigate((photoIndex + direction + photoCount) % photoCount);
  };
  useEffect(() => {
    const background = document.getElementById('root');
    const wasInert = background?.inert || false;
    const previousFocus = document.activeElement;
    if (background) background.inert = true;
    close.current?.focus({ preventScroll: true });
    return () => {
      if (background) background.inert = wasInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<div ref={dialog} className={`image-viewer ${footer ? 'has-footer' : ''} ${hasGallery ? 'has-gallery' : ''}`} role="dialog" aria-modal="true" aria-label="写真を拡大表示"
    onClick={(event) => {
      event.stopPropagation();
      if (event.target === event.currentTarget) onClose();
    }}
    onTouchStart={(event) => {
      event.stopPropagation();
      touchStart.current = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }}
    onTouchEnd={(event) => {
      event.stopPropagation();
      const start = touchStart.current;
      touchStart.current = null;
      if (!hasGallery || !start || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        event.preventDefault();
        navigate(dx > 0 ? -1 : 1);
      }
    }}
    onTouchCancel={(event) => { event.stopPropagation(); touchStart.current = null; }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (hasGallery && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        navigate(event.key === 'ArrowLeft' ? -1 : 1);
      }
      if (event.key === 'Tab') {
        const controls = Array.from(dialog.current.querySelectorAll('button:not([disabled]), .image-viewer-footer a'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <button ref={close} type="button" className="image-viewer-close" aria-label="写真を閉じる" onClick={onClose}><X size={24} /></button>
    {hasGallery && <>
      <span className="image-viewer-count" aria-live="polite">{photoIndex + 1} / {photoCount}</span>
      <button type="button" className="image-viewer-arrow is-previous" aria-label="前の写真" onClick={() => navigate(-1)}><ChevronLeft size={26} /></button>
      <button type="button" className="image-viewer-arrow is-next" aria-label="次の写真" onClick={() => navigate(1)}><ChevronRight size={26} /></button>
    </>}
    <img key={src} src={src} alt={alt} decoding="async" draggable="false" />
    {footer && <div className="image-viewer-footer">{footer}</div>}
  </div>, document.body);
}
