import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImageViewer({ src, alt, onClose, footer = null }) {
  const close = useRef(null);
  const dialog = useRef(null);
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

  return createPortal(<div ref={dialog} className={`image-viewer ${footer ? 'has-footer' : ''}`} role="dialog" aria-modal="true" aria-label="写真を拡大表示"
    onClick={(event) => {
      event.stopPropagation();
      if (event.target === event.currentTarget) onClose();
    }}
    onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [close.current, ...dialog.current.querySelectorAll('.image-viewer-footer a')].filter(Boolean);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <button ref={close} type="button" className="image-viewer-close" aria-label="写真を閉じる" onClick={onClose}><X size={24} /></button>
    <img src={src} alt={alt} decoding="async" draggable="false" />
    {footer && <div className="image-viewer-footer">{footer}</div>}
  </div>, document.body);
}
