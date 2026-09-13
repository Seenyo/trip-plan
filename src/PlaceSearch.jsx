import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';

const browserLanguage = () => navigator.languages?.[0] || navigator.language || undefined;

export default function PlaceSearch({ value, onChange, onSelect, apiKey, onRequestKey, variant = 'field' }) {
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('idle');
  const [mapsReady, setMapsReady] = useState(() => Boolean(window.google?.maps));
  const request = useRef(0);
  const debounce = useRef(null);
  const sessionToken = useRef(null);
  const selectedValue = useRef(value);
  const listId = useId();

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

  const search = async () => {
    clearTimeout(debounce.current);
    const id = ++request.current;
    if (!value.trim()) { setCandidates([]); setStatus('idle'); return; }
    if (!apiKey) { setStatus('error'); onRequestKey?.(); return; }
    if (!window.google?.maps) { selectedValue.current = null; setStatus('waiting'); return; }
    setCandidates([]);
    setStatus('loading');
    try {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = await window.google.maps.importLibrary('places');
      if (request.current !== id) return;
      sessionToken.current ||= new AutocompleteSessionToken();
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        language: browserLanguage(),
        sessionToken: sessionToken.current,
      });
      if (request.current !== id) return;
      const predictions = (response.suggestions || []).map((item) => item.placePrediction).filter(Boolean);
      setCandidates(predictions);
      setStatus(predictions.length ? 'results' : 'empty');
    } catch (error) {
      if (request.current !== id) return;
      setStatus(error.code === 'ZERO_RESULTS' ? 'empty' : 'error');
    }
  };

  useEffect(() => {
    if (!apiKey || value === selectedValue.current || value.trim().length < 2 || !mapsReady) return;
    debounce.current = setTimeout(search, 400);
    return () => { clearTimeout(debounce.current); request.current += 1; };
  }, [value, apiKey, mapsReady]);
  useEffect(() => () => { clearTimeout(debounce.current); request.current += 1; }, []);

  const change = (next) => {
    request.current += 1;
    selectedValue.current = null;
    setCandidates([]);
    setStatus('idle');
    onChange(next);
  };

  const choose = async (prediction) => {
    clearTimeout(debounce.current);
    const id = ++request.current;
    setStatus('loading');
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      if (request.current !== id) return;
      if (!place.location) {
        setStatus('error');
        return;
      }
      const location = place.formattedAddress || place.displayName || prediction.text.toString();
      selectedValue.current = location;
      sessionToken.current = null;
      setCandidates([]);
      setStatus('idle');
      onSelect({
        title: place.displayName || '',
        location,
        coords: { lat: place.location.lat(), lng: place.location.lng() },
      });
    } catch {
      if (request.current === id) setStatus('error');
    }
  };

  return <div className={variant === 'map' ? 'map-search place-search' : 'place-search'}>
    {variant === 'map' && <MapPin size={18} aria-hidden="true" />}
    <div className={variant === 'field' ? 'field-with-button' : 'place-search-input'}>
      <input aria-label="場所を検索" aria-controls={listId} autoComplete="off"
        value={value} placeholder="場所を検索、または住所を貼り付け"
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); search(); }
          if (event.key === 'Escape') {
            clearTimeout(debounce.current);
            event.preventDefault();
            event.stopPropagation();
            request.current += 1;
            setCandidates([]);
            setStatus('idle');
          }
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
        <ul aria-label="場所の候補">{candidates.map((prediction, index) => <li key={prediction.placeId || index}>
          <button type="button" onClick={() => choose(prediction)}>
            <MapPin size={17} aria-hidden="true" />
            <span><strong>{prediction.mainText?.toString() || prediction.text.toString()}</strong>
              {prediction.secondaryText && <small>{prediction.secondaryText.toString()}</small>}
            </span>
          </button>
        </li>)}</ul>
      </> : <p role={status === 'error' ? 'alert' : 'status'}>{status === 'waiting' ? '地図の読み込みを待っています…' : status === 'loading' ? '検索中…' : status === 'empty' ? '場所が見つかりません。検索語を変えてください。' : '検索できませんでした。接続を確認して再試行してください。'}</p>}
    </div>}
  </div>;
}
