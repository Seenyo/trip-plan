import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';

export default function PlaceSearch({ value, onChange, onSelect, apiKey, onRequestKey, variant = 'field' }) {
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('idle');
  const [mapsReady, setMapsReady] = useState(() => Boolean(window.google?.maps));

  useEffect(() => {
    const ready = () => setMapsReady(true);
    const failed = () => { setMapsReady(false); setStatus('error'); };
    window.addEventListener('roam-maps-ready', ready);
    window.addEventListener('roam-maps-error', failed);
    setMapsReady(Boolean(window.google?.maps));
    return () => {
      window.removeEventListener('roam-maps-ready', ready);
      window.removeEventListener('roam-maps-error', failed);
    };
  }, [apiKey]);
  const request = useRef(0);
  const debounce = useRef(null);
  const selectedValue = useRef(value);
  const listId = useId();

  const search = async () => {
    clearTimeout(debounce.current);
    const id = ++request.current;
    if (!value.trim()) { setCandidates([]); setStatus('idle'); return; }
    if (!apiKey) { setStatus('error'); onRequestKey?.(); return; }
    if (!window.google?.maps) { selectedValue.current = null; setStatus('waiting'); return; }
    setCandidates([]);
    setStatus('loading');
    try {
      const response = await new window.google.maps.Geocoder().geocode({ address: value });
      if (request.current !== id) return;
      const results = response.results || [];
      setCandidates(results);
      setStatus(results.length ? 'results' : 'empty');
    } catch (error) {
      if (request.current !== id) return;
      setStatus(error.code === 'ZERO_RESULTS' ? 'empty' : 'error');
    }
  };

  useEffect(() => {
    if (!apiKey || value === selectedValue.current || value.trim().length < 2) return;
    if (!mapsReady) return;
    debounce.current = setTimeout(search, 400);
    return () => { clearTimeout(debounce.current); request.current += 1; };
  }, [value, apiKey, mapsReady]);
  useEffect(() => () => { request.current += 1; }, []);

  const change = (next) => {
    request.current += 1;
    selectedValue.current = null;
    setCandidates([]);
    setStatus('idle');
    onChange(next);
  };
  const choose = (place) => {
    request.current += 1;
    selectedValue.current = place.formatted_address;
    setCandidates([]);
    setStatus('idle');
    onSelect({ location: place.formatted_address, coords: {
      lat: place.geometry.location.lat(), lng: place.geometry.location.lng(),
    } });
  };

  return <div className={variant === 'map' ? 'map-search place-search' : 'place-search'}>
    {variant === 'map' && <MapPin size={18} aria-hidden="true" />}
    <div className={variant === 'field' ? 'field-with-button' : 'place-search-input'}>
      <input aria-label="場所を検索" aria-controls={listId} autoComplete="off"
        value={value} placeholder="場所を検索、または住所を貼り付け"
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); search(); }
          if (event.key === 'Escape') { clearTimeout(debounce.current); event.preventDefault(); event.stopPropagation(); request.current += 1; setCandidates([]); setStatus('idle'); }
        }} />
      <button type="button" className={variant === 'map' ? 'search-submit' : ''}
        onClick={search} disabled={status === 'loading' || !value.trim()}
        aria-label="場所を検索" title="場所を検索">
        {status === 'loading' ? <LoaderCircle className="search-spinner" size={18} /> : <Search size={18} />}
      </button>
    </div>
    {status !== 'idle' && <div className="place-candidates" id={listId}>
      {status === 'results' ? <>
        <p className="place-candidates-heading">候補から場所を選択</p>
        <ul aria-label="場所の候補">{candidates.map((place, index) => <li key={place.place_id || index}>
          <button type="button" onClick={() => choose(place)}><MapPin size={17} aria-hidden="true" /><span>{place.formatted_address}</span></button>
        </li>)}</ul>
      </> : <p role={status === 'error' ? 'alert' : 'status'}>{status === 'waiting' ? '地図の読み込みを待っています…' : status === 'loading' ? '検索中…' : status === 'empty' ? '場所が見つかりません。検索語を変えてください。' : '検索できませんでした。接続を確認して再試行してください。'}</p>}
    </div>}
  </div>;
}
