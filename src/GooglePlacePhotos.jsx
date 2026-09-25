import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadPlacePhotos } from './placePhotos';

export default function PlacePhotos({ item }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    let active = true;
    setPhotos([]);
    if (!navigator.onLine || !window.google?.maps || (!item?.placeId && !item?.coords)) return undefined;
    loadPlacePhotos(window.google.maps, item).then((result) => {
      if (active) setPhotos(result);
    }).catch(() => {});
    return () => { active = false; };
  }, [item?.id, item?.placeId, item?.title, item?.coords?.lat, item?.coords?.lng]);

  if (!photos.length) return null;
  return <div className="map-place-photos" aria-label={`${item.title}のGoogle マップの写真`}>
    {photos.map((photo) => <div className="map-place-photo" key={photo.googleMapsURI}>
      <a className="map-place-photo-image" href={photo.googleMapsURI} target="_blank" rel="noopener noreferrer" aria-label={`${item.title}の写真をGoogle マップで開く`}>
        <img src={photo.url} alt={`${item.title}のGoogle マップの写真`} loading="lazy" decoding="async" />
      </a>
      <div className="map-place-photo-credit">
        {photo.authors.map((author, index) => author.uri
          ? <a key={`${author.uri}-${index}`} href={author.uri} target="_blank" rel="noopener noreferrer">{author.photoURI && <img src={author.photoURI} alt="" loading="lazy" />}<span>{author.name || '撮影者'}</span></a>
          : author.name && <span key={`${author.name}-${index}`}>{author.name}</span>)}
        <a href={photo.googleMapsURI} target="_blank" rel="noopener noreferrer">Google マップ <ExternalLink size={11} /></a>
      </div>
    </div>)}
  </div>;
}
