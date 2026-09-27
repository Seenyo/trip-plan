import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadPlacePhotos } from './placePhotos';
import ImageViewer from './ImageViewer';

function PhotoCredit({ photo }) {
  return <div className="map-place-photo-credit">
    <span className="map-place-photo-authors">{photo.authors.map((author, index) => author.uri
      ? <a key={`${author.uri}-${index}`} href={author.uri} target="_blank" rel="noopener noreferrer">{author.photoURI && <img src={author.photoURI} alt="" loading="lazy" />}<span>{author.name || '撮影者'}</span></a>
      : author.name && <span key={`${author.name}-${index}`}>{author.name}</span>)}</span>
    <a className="map-place-photo-source" href={photo.googleMapsURI} target="_blank" rel="noopener noreferrer" aria-label="この写真をGoogle マップで開く">Google マップ <ExternalLink size={11} /></a>
  </div>;
}

export default function PlacePhotos({ item, variant = 'card' }) {
  const [result, setResult] = useState({ key: '', status: 'loading', photos: [] });
  const [retry, setRetry] = useState(0);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const available = Boolean(navigator.onLine && window.google?.maps && (item?.placeId || item?.coords));
  const key = `${item?.id || ''}\u0000${item?.placeId || ''}\u0000${item?.title || ''}\u0000${item?.coords?.lat ?? ''},${item?.coords?.lng ?? ''}`;
  const visibleResult = result.key === key ? result : { status: 'loading', photos: [] };
  useEffect(() => {
    let active = true;
    if (!available) return undefined;
    setResult({ key, status: 'loading', photos: [] });
    loadPlacePhotos(window.google.maps, item).then((photos) => {
      if (active) setResult({ key, status: photos.length ? 'ready' : 'empty', photos });
    }).catch(() => {
      if (active) setResult({ key, status: 'error', photos: [] });
    });
    return () => { active = false; };
  }, [available, key, retry]);

  if (!available) return null;
  return <div className={`map-place-photos ${variant === 'modal' ? 'is-modal' : ''}`} aria-label={`${item.title}のGoogle マップの写真`}>
    <strong className="map-place-photos-heading">Google マップの写真{visibleResult.status === 'ready' ? ` ${visibleResult.photos.length}枚` : ''}</strong>
    {visibleResult.status === 'loading' && <p className="map-place-photos-status" role="status">写真を読み込み中…</p>}
    {visibleResult.status === 'empty' && <p className="map-place-photos-status">この地点の写真は見つかりませんでした。</p>}
    {visibleResult.status === 'error' && <p className="map-place-photos-status">写真を読み込めませんでした。 <button type="button" onClick={() => setRetry((value) => value + 1)}>再試行</button></p>}
    {visibleResult.status === 'ready' && <div className="map-place-photo-list" role="region" aria-label="Google マップの写真一覧" tabIndex={visibleResult.photos.length > 2 ? 0 : undefined}>{visibleResult.photos.map((photo, index) => <div className="map-place-photo" key={photo.googleMapsURI}>
      <button type="button" className="map-place-photo-image" onClick={(event) => { event.stopPropagation(); setExpandedPhoto({ photo, index, key }); }} aria-label={`${item.title}の写真 ${index + 1}を拡大`}>
        <img src={photo.url} alt={`${item.title}の写真 ${index + 1}`} loading="lazy" decoding="async" />
      </button>
      <PhotoCredit photo={photo} />
    </div>)}</div>}
    {expandedPhoto?.key === key && <ImageViewer src={expandedPhoto.photo.fullUrl || expandedPhoto.photo.url} alt={`${item.title}の写真 ${expandedPhoto.index + 1}`}
      onClose={() => setExpandedPhoto(null)} footer={<PhotoCredit photo={expandedPhoto.photo} />} />}
  </div>;
}
