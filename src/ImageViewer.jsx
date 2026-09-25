import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImageViewer({ src, alt, onClose }) {
  const close = useRef(null);
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

  return createPortal(<div className="image-viewer" role="dialog" aria-modal="true" aria-label="写真を拡大表示"
    onClick={(event) => {
      event.stopPropagation();
      if (event.target === event.currentTarget) onClose();
    }}
    onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') { event.preventDefault(); close.current?.focus({ preventScroll: true }); }
    }}>
    <button ref={close} type="button" className="image-viewer-close" aria-label="写真を閉じる" onClick={onClose}><X size={24} /></button>
    <img src={src} alt={alt} decoding="async" draggable="false" />
  </div>, document.body);
}
