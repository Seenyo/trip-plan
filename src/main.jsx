import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  KeyRound,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import './styles.css';

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const seedTrips = [
  {
    id: 'tokyo-weekender',
    title: 'Tokyo, unhurried',
    subtitle: 'Small streets, good coffee, late trains',
    startDate: '2026-10-16',
    endDate: '2026-10-19',
    color: '#FF5722',
    days: [
      {
        id: 'tokyo-day-1',
        date: '2026-10-16',
        title: 'Old Tokyo & blue hour',
        note: 'Land softly. Keep the evening loose.',
        activities: [
          { id: uid(), time: '10:30', title: 'Kissaten breakfast', location: 'Kayaba Coffee, Yanaka', notes: 'Try the egg sandwich.', coords: { lat: 35.7221, lng: 139.7709 } },
          { id: uid(), time: '12:30', title: 'Walk Yanaka Ginza', location: 'Yanaka Ginza, Tokyo', notes: 'Take the long way through the cemetery.', coords: { lat: 35.7275, lng: 139.7667 } },
          { id: uid(), time: '17:10', title: 'Sunset by the river', location: 'Sumida Park, Tokyo', notes: 'Blue hour begins around 17:30.', coords: { lat: 35.7113, lng: 139.8025 } },
        ],
      },
      {
        id: 'tokyo-day-2',
        date: '2026-10-17',
        title: 'Design shops & vinyl',
        note: 'West side day. Reservations at 19:30.',
        activities: [
          { id: uid(), time: '09:30', title: 'Coffee in Kiyosumi', location: 'Kiyosumi Shirakawa, Tokyo', notes: '', coords: { lat: 35.6818, lng: 139.8007 } },
          { id: uid(), time: '13:00', title: 'Daikanyama wandering', location: 'Daikanyama T-Site, Tokyo', notes: 'Books, lunch, and stationery.', coords: { lat: 35.6488, lng: 139.6992 } },
          { id: uid(), time: '19:30', title: 'Dinner in Ebisu', location: 'Ebisu, Tokyo', notes: 'Reservation saved in email.', coords: { lat: 35.6467, lng: 139.7101 } },
        ],
      },
      {
        id: 'tokyo-day-3',
        date: '2026-10-18',
        title: 'A slower Sunday',
        note: 'One anchor, everything else optional.',
        activities: [
          { id: uid(), time: '10:00', title: 'Morning at Meiji Jingu', location: 'Meiji Jingu, Tokyo', notes: '', coords: { lat: 35.6764, lng: 139.6993 } },
          { id: uid(), time: '14:00', title: 'Picnic in Yoyogi', location: 'Yoyogi Park, Tokyo', notes: 'Pick up fruit and onigiri.', coords: { lat: 35.6717, lng: 139.6949 } },
        ],
      },
    ],
  },
  {
    id: 'setouchi-notes',
    title: 'Setouchi art islands',
    subtitle: 'Ferries, concrete, sea air',
    startDate: '2027-04-08',
    endDate: '2027-04-12',
    color: '#76ABAE',
    days: [
      { id: uid(), date: '2027-04-08', title: 'Across to Naoshima', note: 'Pack light for the ferry.', activities: [] },
      { id: uid(), date: '2027-04-09', title: 'Art House Project', note: '', activities: [] },
    ],
  },
];

const formatDay = (date, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
  if (!date) return 'Date TBD';
  return new Intl.DateTimeFormat('en', options).format(new Date(`${date}T12:00:00`));
};

const dateRange = (trip) => {
  const start = formatDay(trip.startDate, { month: 'short', day: 'numeric' });
  const end = formatDay(trip.endDate, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} — ${end}`;
};

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function GoogleMap({ apiKey, day, onMapPick, onRequestKey }) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const overlays = useRef([]);
  const [mapStatus, setMapStatus] = useState(apiKey ? 'loading' : 'missing');
  const [routeStatus, setRouteStatus] = useState('idle');

  useEffect(() => {
    if (!apiKey || window.google?.maps) return;
    window.__roamGoogleReady = () => setMapStatus('ready');
    window.gm_authFailure = () => setMapStatus('error');
    const existing = document.querySelector('script[data-roam-maps]');
    if (existing) return;
    const script = document.createElement('script');
    script.dataset.roamMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__roamGoogleReady&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => setMapStatus('error');
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (window.google?.maps && apiKey) setMapStatus('ready');
  }, [apiKey]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapNode.current) return;
    let cancelled = false;
    const points = day.activities.filter((item) => item.coords).map((item) => item.coords);
    const center = points[0] || { lat: 35.6812, lng: 139.7671 };
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapNode.current, {
        center,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F5F5F5' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#76ABAE' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F5F5F5' }] },
        ],
      });
      mapRef.current.addListener('click', async (event) => {
        const coords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        let location = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
        try {
          const result = await new window.google.maps.Geocoder().geocode({ location: coords });
          location = result.results?.[0]?.formatted_address || location;
        } catch { /* coordinates remain usable */ }
        onMapPick({ coords, location });
      });
    }
    overlays.current.forEach((overlay) => overlay.setMap(null));
    overlays.current = [];
    setRouteStatus(points.length > 1 ? 'loading' : 'idle');
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point, index) => {
      const marker = new window.google.maps.Marker({
        position: point,
        map: mapRef.current,
        label: { text: `${index + 1}`, color: '#303841', fontWeight: '700' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 17, fillColor: '#F5F5F5', fillOpacity: 1, strokeColor: '#FF5722', strokeWeight: 3 },
        zIndex: 5,
      });
      overlays.current.push(marker);
      bounds.extend(point);
    });
    if (points.length > 1) {
      mapRef.current.fitBounds(bounds, 80);
      const drawDrivingRoute = async () => {
        try {
          const { Route } = await window.google.maps.importLibrary('routes');
          const { routes } = await Route.computeRoutes({
            origin: points[0],
            destination: points[points.length - 1],
            intermediates: points.slice(1, -1).map((location) => ({ location })),
            travelMode: 'DRIVING',
            polylineQuality: 'HIGH_QUALITY',
            fields: ['path', 'viewport'],
          });
          if (cancelled) return;
          const primaryRoute = routes?.[0];
          if (!primaryRoute) throw new Error('No driving route found');
          const routeLines = primaryRoute.createPolylines({
            polylineOptions: {
              strokeColor: '#FF5722',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });
          routeLines.forEach((routeLine) => {
            routeLine.setMap(mapRef.current);
            overlays.current.push(routeLine);
          });
          if (primaryRoute.viewport) mapRef.current.fitBounds(primaryRoute.viewport, 80);
          setRouteStatus('ready');
        } catch (error) {
          if (cancelled) return;
          console.warn('Unable to draw the driving route.', error);
          setRouteStatus('error');
        }
      };
      drawDrivingRoute();
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(points.length ? 14 : 12);
    }
    return () => { cancelled = true; };
  }, [day, mapStatus, onMapPick]);

  const accessCard = (authorizationError = false) => (
    <button className="map-key-card" onClick={onRequestKey}>
      <span className="map-key-icon"><KeyRound size={18} /></span>
      <span>
        <strong>{authorizationError ? 'Authorize Google Maps' : 'Connect Google Maps'}</strong>
        <small>{authorizationError ? 'Allow this site in your Google Cloud key restrictions' : 'Add your API key to enable search and map picking'}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );

  if (!apiKey) {
    return (
      <div className="map-fallback" aria-label="Map preview">
        <div className="map-grid" />
        <div className="river river-one" />
        <div className="river river-two" />
        <span className="map-label label-shibuya">SHIBUYA</span>
        <span className="map-label label-ueno">UENO</span>
        <span className="map-label label-ginza">GINZA</span>
        <svg className="route-line" viewBox="0 0 600 760" preserveAspectRatio="none" aria-hidden="true">
          <path d="M146 180 C220 230, 194 340, 326 360 S440 510, 370 630" />
        </svg>
        {day.activities.slice(0, 4).map((item, index) => (
          <button
            className={`map-pin pin-${index + 1}`}
            key={item.id}
            style={{ '--pin-color': index === 0 ? '#FF5722' : '#303841' }}
            onClick={() => onMapPick({ coords: item.coords, location: item.location })}
            aria-label={item.title}
          >{index + 1}</button>
        ))}
        {accessCard()}
      </div>
    );
  }
  return (
    <div className="google-map-shell">
      <div className="google-map" ref={mapNode} />
      {mapStatus === 'loading' && <span className="map-loading">Loading map…</span>}
      {mapStatus === 'error' && accessCard(true)}
      {mapStatus === 'ready' && routeStatus === 'loading' && <span className="map-loading">Finding the driving route…</span>}
      {mapStatus === 'ready' && routeStatus === 'error' && <span className="map-loading map-route-error">Driving route unavailable</span>}
    </div>
  );
}

function SearchBar({ apiKey, onResult, onRequestKey }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const search = async (event) => {
    event.preventDefault();
    if (!apiKey || !window.google?.maps) return onRequestKey();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await new window.google.maps.Geocoder().geocode({ address: query });
      const place = result.results?.[0];
      if (place) onResult({ location: place.formatted_address, coords: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() } });
    } finally {
      setSearching(false);
    }
  };
  return (
    <form className="map-search" onSubmit={search}>
      <Search size={18} />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place" aria-label="Search a place" />
      {query && <button type="button" className="clear-search" onClick={() => setQuery('')}><X size={15} /></button>}
      <button className="search-submit" aria-label="Search" disabled={searching}>{searching ? '…' : <ArrowLeft size={16} />}</button>
    </form>
  );
}

function DayStrip({ trip, dayIndex, setDayIndex }) {
  return (
    <div className="day-strip" role="tablist" aria-label="Trip days">
      {trip.days.map((day, index) => (
        <button key={day.id} className={index === dayIndex ? 'active' : ''} onClick={() => setDayIndex(index)} role="tab" aria-selected={index === dayIndex}>
          <span>Day {index + 1}</span>
          <strong>{formatDay(day.date, { weekday: 'short', day: 'numeric' })}</strong>
        </button>
      ))}
    </div>
  );
}

function Timeline({ day, onEdit, onDelete, onAdd }) {
  return (
    <div className="timeline">
      {day.activities.length === 0 ? (
        <button className="empty-day" onClick={onAdd}>
          <span><Sparkles size={20} /></span>
          <strong>Give this day a shape</strong>
          <small>Add the first place or moment.</small>
        </button>
      ) : day.activities.map((item, index) => (
        <article className="stop" key={item.id}>
          <div className="stop-time">{item.time || 'Anytime'}</div>
          <div className="stop-track">
            <span className="stop-number">{index + 1}</span>
            {index < day.activities.length - 1 && <span className="stop-rule" />}
          </div>
          <div className="stop-copy">
            <div className="stop-heading">
              <h3>{item.title}</h3>
              <div className="stop-actions">
                <button onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}><Pencil size={15} /></button>
                <button onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button>
              </div>
            </div>
            <p><MapPin size={13} /> {item.location || 'Location not set'}</p>
            {item.notes && <small>{item.notes}</small>}
          </div>
        </article>
      ))}
      {day.activities.length > 0 && <button className="add-stop-inline" onClick={onAdd}><Plus size={16} /> Add a stop</button>}
    </div>
  );
}

function ItinerarySheet({ trip, day, dayIndex, setDayIndex, open, setOpen, onAdd, onEdit, onDelete, onEditDay }) {
  const touch = useRef(null);
  const onTouchStart = (event) => {
    const t = event.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (event) => {
    if (!touch.current) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
      setDayIndex(Math.max(0, Math.min(trip.days.length - 1, dayIndex + (dx < 0 ? 1 : -1))));
    } else if (Math.abs(dy) > 35) setOpen(dy < 0);
    touch.current = null;
  };
  return (
    <section className={`itinerary-sheet ${open ? 'sheet-open' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label="Day itinerary">
      <button className="sheet-handle-wrap" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse itinerary' : 'Expand itinerary'}><span className="sheet-handle" /></button>
      <div className="mobile-day-strip"><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
      <div className="sheet-title-row">
        <div>
          <span className="eyebrow">Day {dayIndex + 1} · {formatDay(day.date)}</span>
          <h2>{day.title}</h2>
          {day.note && <p>{day.note}</p>}
        </div>
        <button className="icon-button subtle" onClick={onEditDay} aria-label="Edit day"><Pencil size={17} /></button>
      </div>
      <div className="day-arrows">
        <button aria-label="Previous day" title="Previous day" onClick={() => setDayIndex(Math.max(0, dayIndex - 1))} disabled={dayIndex === 0}><ChevronLeft size={17} /></button>
        <span>{dayIndex + 1} / {trip.days.length}</span>
        <button aria-label="Next day" title="Next day" onClick={() => setDayIndex(Math.min(trip.days.length - 1, dayIndex + 1))} disabled={dayIndex === trip.days.length - 1}><ChevronRight size={17} /></button>
      </div>
      <Timeline day={day} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
    </section>
  );
}

function TripRail({ trips, selectedId, onSelect, onAdd, onDelete, open, onClose }) {
  const palette = ['#FF5722', '#76ABAE', '#F5F5F5'];
  return (
    <aside className={`trip-rail ${open ? 'rail-open' : ''}`}>
      <div className="rail-brand"><span className="brand-mark"><Navigation size={18} fill="currentColor" /></span><span>ROAM</span><button className="mobile-close" onClick={onClose}><X size={20} /></button></div>
      <div className="rail-heading"><span>Your journeys</span><button onClick={onAdd}><Plus size={17} /></button></div>
      <div className="trip-list">
        {trips.map((trip, index) => (
          <button key={trip.id} className={`trip-card ${trip.id === selectedId ? 'active' : ''}`} onClick={() => { onSelect(trip.id); onClose(); }}>
            <span className="trip-card-top"><span className="trip-dot" style={{ background: palette[index % palette.length] }} /><small>{trip.days.length} days</small>{trips.length > 1 && <span className="trip-trash" onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}><Trash2 size={14} /></span>}</span>
            <strong>{trip.title}</strong>
            <span>{dateRange(trip)}</span>
          </button>
        ))}
      </div>
      <button className="new-trip-button" onClick={onAdd}><CirclePlus size={19} /> Plan another trip</button>
      <div className="rail-foot"><span>Saved in this browser</span><span className="saved-dot"><Check size={12} /> Saved</span></div>
    </aside>
  );
}

function Modal({ title, eyebrow, onClose, children, danger }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`modal ${danger ? 'danger' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
        {children}
      </section>
    </div>
  );
}

function ActivityForm({ initial, onSave, onClose, apiKey }) {
  const [form, setForm] = useState(initial || { time: '10:00', title: '', location: '', notes: '', coords: null });
  const [searching, setSearching] = useState(false);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const lookup = async () => {
    if (!apiKey || !window.google?.maps || !form.location.trim()) return;
    setSearching(true);
    try {
      const result = await new window.google.maps.Geocoder().geocode({ address: form.location });
      const place = result.results?.[0];
      if (place) setForm((current) => ({ ...current, location: place.formatted_address, coords: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() } }));
    } finally { setSearching(false); }
  };
  return (
    <Modal title={initial?.id ? 'Edit this stop' : 'Add a stop'} eyebrow="Day plan" onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) onSave({ ...form, id: form.id || uid() }); }}>
        <label className="field time-field"><span>Time</span><input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></label>
        <label className="field title-field"><span>What are you doing?</span><input autoFocus required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Dinner, museum, train…" /></label>
        <label className="field full"><span>Location</span><div className="field-with-button"><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Search a place or paste an address" /><button type="button" onClick={lookup} disabled={!apiKey || searching}>{searching ? '…' : <LocateFixed size={17} />}</button></div>{form.coords && <small className="located"><Check size={12} /> Pinned on the map</small>}</label>
        <label className="field full"><span>Notes</span><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Reservation details, reminders, what to order…" rows="3" /></label>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save stop <Check size={16} /></button></div>
      </form>
    </Modal>
  );
}

function TripForm({ onSave, onClose }) {
  const [form, setForm] = useState({ title: '', subtitle: '', startDate: '', endDate: '', color: '#FF5722' });
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return (
    <Modal title="Start a new journey" eyebrow="Fresh page" onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (form.title && form.startDate) onSave(form); }}>
        <label className="field full"><span>Trip name</span><input autoFocus required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="A long weekend in Kyoto" /></label>
        <label className="field full"><span>Small description</span><input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Temples, morning walks, one perfect meal" /></label>
        <label className="field"><span>Starts</span><input required type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label className="field"><span>Ends</span><input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Create trip <ArrowLeft size={16} /></button></div>
      </form>
    </Modal>
  );
}

function DayForm({ day, onSave, onAddDay, onClose }) {
  const [form, setForm] = useState(day);
  return (
    <Modal title="Shape the day" eyebrow={formatDay(day.date)} onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <label className="field full"><span>Day title</span><input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="field full"><span>Date</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="field full"><span>Day note</span><textarea rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="The pace, a reminder, or the one thing that matters…" /></label>
        <button type="button" className="text-button full" onClick={onAddDay}><Plus size={16} /> Add another day after this one</button>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save day <Check size={16} /></button></div>
      </form>
    </Modal>
  );
}

function SettingsModal({ apiKey, setApiKey, onClose }) {
  const [value, setValue] = useState(apiKey);
  return (
    <Modal title="Connect Google Maps" eyebrow="Map settings" onClose={onClose}>
      <div className="settings-copy"><p>Paste a Google Maps JavaScript API key to enable live maps, location search, and tap-to-pin.</p><p>The key stays in this browser. For a public website, restrict it to your GitHub Pages domain in Google Cloud.</p></div>
      <label className="field full"><span>API key</span><input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="AIza…" /></label>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => { setApiKey(value.trim()); onClose(); }}>Save key <KeyRound size={16} /></button></div>
    </Modal>
  );
}

function App() {
  const [trips, setTrips] = useStoredState('roam.trips.v1', seedTrips);
  const bundledApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [savedApiKey, setApiKey] = useStoredState('roam.googleMapsKey', '');
  const apiKey = savedApiKey || bundledApiKey;
  const [selectedId, setSelectedId] = useState(trips[0]?.id);
  const [dayIndex, setDayIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const trip = trips.find((item) => item.id === selectedId) || trips[0];
  const day = trip?.days[Math.min(dayIndex, trip.days.length - 1)];

  const updateTrip = useCallback((updater) => {
    setTrips((current) => current.map((item) => item.id === trip.id ? updater(item) : item));
  }, [setTrips, trip?.id]);

  const updateDay = useCallback((updater) => {
    updateTrip((current) => ({ ...current, days: current.days.map((item, index) => index === dayIndex ? updater(item) : item) }));
  }, [updateTrip, dayIndex]);

  const saveActivity = (activity) => {
    updateDay((current) => ({ ...current, activities: current.activities.some((item) => item.id === activity.id) ? current.activities.map((item) => item.id === activity.id ? activity : item) : [...current.activities, activity].sort((a, b) => a.time.localeCompare(b.time)) }));
    setModal(null);
  };
  const createTrip = (form) => {
    const firstDay = { id: uid(), date: form.startDate, title: 'Arrival & first impressions', note: 'Keep space for the unexpected.', activities: [] };
    const newTrip = { ...form, id: uid(), endDate: form.endDate || form.startDate, days: [firstDay] };
    setTrips((current) => [...current, newTrip]);
    setSelectedId(newTrip.id);
    setDayIndex(0);
    setModal(null);
  };
  const deleteTrip = (id) => {
    if (!confirm('Delete this trip from this browser?')) return;
    const remaining = trips.filter((item) => item.id !== id);
    setTrips(remaining);
    if (id === selectedId) { setSelectedId(remaining[0]?.id); setDayIndex(0); }
  };
  const addDay = () => {
    const currentDate = new Date(`${day.date}T12:00:00`);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDay = { id: uid(), date: currentDate.toISOString().slice(0, 10), title: 'A new day', note: '', activities: [] };
    updateTrip((current) => { const days = [...current.days]; days.splice(dayIndex + 1, 0, newDay); return { ...current, days }; });
    setDayIndex(dayIndex + 1);
    setModal({ type: 'day', day: newDay });
  };
  const mapPick = useCallback((place) => setModal({ type: 'activity', activity: { time: '10:00', title: '', notes: '', ...place } }), []);

  useEffect(() => { setDayIndex(0); }, [selectedId]);
  useEffect(() => { if (dayIndex >= (trip?.days.length || 1)) setDayIndex(0); }, [trip?.days.length, dayIndex]);

  if (!trip || !day) return <div className="empty-app"><button className="primary-button" onClick={() => setTrips(seedTrips)}>Restore sample trips</button></div>;

  return (
    <main className="app-shell">
      <TripRail trips={trips} selectedId={trip.id} onSelect={setSelectedId} onAdd={() => setModal({ type: 'trip' })} onDelete={deleteTrip} open={railOpen} onClose={() => setRailOpen(false)} />
      {railOpen && <button className="rail-scrim" onClick={() => setRailOpen(false)} aria-label="Close trips" />}
      <section className="map-stage">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setRailOpen(true)}><Menu size={20} /></button>
          <div className="trip-heading"><span className="eyebrow">{dateRange(trip)}</span><h1>{trip.title}</h1><p>{trip.subtitle}</p></div>
          <button className="icon-button" onClick={() => setModal({ type: 'settings' })}><Settings size={19} /></button>
        </header>
        <SearchBar apiKey={apiKey} onResult={mapPick} onRequestKey={() => setModal({ type: 'settings' })} />
        <GoogleMap apiKey={apiKey} day={day} onMapPick={mapPick} onRequestKey={() => setModal({ type: 'settings' })} />
        <div className="desktop-day-strip"><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
        <div className="map-hint"><MapPin size={14} /> Tap the map to add a stop</div>
      </section>
      <ItinerarySheet trip={trip} day={day} dayIndex={dayIndex} setDayIndex={setDayIndex} open={sheetOpen} setOpen={setSheetOpen} onAdd={() => setModal({ type: 'activity' })} onEdit={(activity) => setModal({ type: 'activity', activity })} onDelete={(id) => updateDay((current) => ({ ...current, activities: current.activities.filter((item) => item.id !== id) }))} onEditDay={() => setModal({ type: 'day', day })} />
      <nav className="mobile-nav" aria-label="Quick actions">
        <button onClick={() => setRailOpen(true)}><CalendarDays size={19} /><span>Trips</span></button>
        <button className="nav-add" aria-label="Add a stop" onClick={() => setModal({ type: 'activity' })}><Plus size={23} /></button>
        <button onClick={() => setModal({ type: 'settings' })}><Settings size={19} /><span>Settings</span></button>
      </nav>
      {modal?.type === 'activity' && <ActivityForm initial={modal.activity} onSave={saveActivity} onClose={() => setModal(null)} apiKey={apiKey} />}
      {modal?.type === 'trip' && <TripForm onSave={createTrip} onClose={() => setModal(null)} />}
      {modal?.type === 'day' && <DayForm day={modal.day} onClose={() => setModal(null)} onAddDay={addDay} onSave={(saved) => { updateDay(() => saved); setModal(null); }} />}
      {modal?.type === 'settings' && <SettingsModal apiKey={apiKey} setApiKey={setApiKey} onClose={() => setModal(null)} />}
    </main>
  );
}

const rootElement = document.getElementById('root');
const appRoot = window.__roamRoot ?? createRoot(rootElement);
window.__roamRoot = appRoot;
appRoot.render(<App />);
