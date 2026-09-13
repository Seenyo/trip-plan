import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  GripVertical,
  KeyRound,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { domesticTrip } from './domesticTrip';
import { icelandTrip } from './icelandTrip';
import { useSharedWorkspace } from './useSharedWorkspace';
import './styles.css';
import PlaceSearch from './PlaceSearch';
import {
  formatTravelDistance,
  formatTravelDuration,
  reorderActivitiesIntoTimeSlots,
  routeColorForIndex,
  routeTextColor,
  sortActivitiesByTime,
} from './itineraryUtils';

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const seedTrips = [icelandTrip, domesticTrip];
const migrateTrips = () => {
  try {
    const previous = JSON.parse(localStorage.getItem('roam.trips.v2') || '[]');
    if (Array.isArray(previous) && previous.length) {
      const retained = previous.filter((trip) => !['tokyo-weekender', 'setouchi-notes'].includes(trip.id));
      const withIceland = retained.some((trip) => trip.id === icelandTrip.id) ? retained : [icelandTrip, ...retained];
      return withIceland.some((trip) => trip.id === domesticTrip.id) ? withIceland : [...withIceland, domesticTrip];
    }
  } catch { /* fall through to the current built-in trips */ }
  return seedTrips;
};

const formatDay = (date, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
  if (!date) return '日付未定';
  return new Intl.DateTimeFormat('ja-JP', options).format(new Date(`${date}T12:00:00`));
};

const dateRange = (trip) => {
  const sameYear = trip.startDate?.slice(0, 4) === trip.endDate?.slice(0, 4);
  const start = formatDay(trip.startDate, { year: 'numeric', month: 'short', day: 'numeric' });
  const end = formatDay(trip.endDate, { ...(sameYear ? {} : { year: 'numeric' }), month: 'short', day: 'numeric' });
  return `${start} — ${end}`;
};

const distanceKm = (start, end) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(end.lat - start.lat);
  const longitudeDelta = toRadians(end.lng - start.lng);
  const startLatitude = toRadians(start.lat);
  const endLatitude = toRadians(end.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const resolvedInitial = () => typeof initialValue === 'function' ? initialValue() : initialValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : resolvedInitial();
    } catch {
      return resolvedInitial();
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function createStopMarker(maps, map, position, number, title, color) {
  const marker = new maps.OverlayView();
  const node = document.createElement('div');
  node.className = 'map-stop-marker';
  node.textContent = String(number);
  node.style.backgroundColor = color;
  node.style.color = routeTextColor(color);
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', `${number}. ${title || '場所'}`);
  marker.onAdd = () => marker.getPanes().overlayLayer.appendChild(node);
  marker.draw = () => {
    const point = marker.getProjection().fromLatLngToDivPixel(new maps.LatLng(position));
    if (!point) return;
    node.style.left = `${point.x}px`;
    node.style.top = `${point.y}px`;
  };
  marker.onRemove = () => node.remove();
  marker.setMap(map);
  return marker;
}

function GoogleMap({ apiKey, day, previousDay, onMapPick, onRequestKey, onTravelTimesChange, varyRouteColors }) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const overlays = useRef([]);
  const routeCache = useRef(null);
  const [mapStatus, setMapStatus] = useState(apiKey ? 'loading' : 'missing');
  const [routeStatus, setRouteStatus] = useState('idle');

  useEffect(() => {
    if (!apiKey || window.google?.maps) return;
    window.__roamGoogleReady = () => {
      setMapStatus('ready');
      window.dispatchEvent(new Event('roam-maps-ready'));
    };
    const mapsFailed = () => {
      setMapStatus('error');
      window.dispatchEvent(new Event('roam-maps-error'));
    };
    window.gm_authFailure = mapsFailed;
    const existing = document.querySelector('script[data-roam-maps]');
    if (existing) return;
    const script = document.createElement('script');
    script.dataset.roamMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__roamGoogleReady&loading=async&v=weekly&language=ja&region=JP`;
    script.async = true;
    script.onerror = mapsFailed;
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (window.google?.maps && apiKey) setMapStatus('ready');
  }, [apiKey]);

  useEffect(() => {
    if (!mapNode.current || !window.ResizeObserver) return undefined;
    const observer = new ResizeObserver(() => {
      if (mapRef.current && window.google?.maps) window.google.maps.event.trigger(mapRef.current, 'resize');
    });
    observer.observe(mapNode.current);
    return () => observer.disconnect();
  }, [mapStatus]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapNode.current) return;
    let cancelled = false;
    const mappedStops = day.activities.map((item, index) => ({ item, index })).filter(({ item }) => item.coords);
    const points = mappedStops.map(({ item }) => item.coords);
    const drivableStops = mappedStops.filter(({ item }) => item.route !== false)
      .map(({ item, index }) => ({ id: item.id, coords: item.coords, activityIndex: index, fromPreviousDay: false }));
    const previousActivity = previousDay?.activities.filter((item) => item.coords && item.route !== false).at(-1);
    const previousPoint = previousActivity?.coords;
    const connectPreviousDay = day.drivingFromPrevious !== false
      && previousPoint && drivableStops[0] && distanceKm(previousPoint, drivableStops[0].coords) < 900;
    const rawRouteStops = connectPreviousDay
      ? [{ id: null, coords: previousPoint, activityIndex: -1, fromPreviousDay: true }, ...drivableStops]
      : drivableStops;
    const routeStops = rawRouteStops.filter((stop, index) => index === 0
      || distanceKm(rawRouteStops[index - 1].coords, stop.coords) > 0.05);
    const routePoints = routeStops.map((stop) => stop.coords);
    const routeKey = JSON.stringify(routeStops.map((stop) => [stop.coords.lat, stop.coords.lng]));
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
    onTravelTimesChange({});
    setRouteStatus(routePoints.length > 1 ? 'loading' : 'idle');
    const bounds = new window.google.maps.LatLngBounds();
    if (connectPreviousDay) bounds.extend(previousPoint);
    mappedStops.forEach(({ item, index }) => {
      const color = routeColorForIndex(index, varyRouteColors);
      const marker = createStopMarker(window.google.maps, mapRef.current, item.coords, index + 1, item.title, color);
      overlays.current.push(marker);
      bounds.extend(item.coords);
    });
    if (routePoints.length > 1) {
      mapRef.current.fitBounds(bounds, 80);
      const drawDrivingRoute = async () => {
        try {
          const { Route } = await window.google.maps.importLibrary('routes');
          const routeRequest = {
            origin: routePoints[0],
            destination: routePoints[routePoints.length - 1],
            intermediates: routePoints.slice(1, -1).map((location) => ({ location })),
            travelMode: 'DRIVING',
            polylineQuality: 'HIGH_QUALITY',
            fields: ['path', 'viewport', 'legs'],
          };
          let cachedRoute = routeCache.current?.key === routeKey ? routeCache.current.promise : null;
          if (!cachedRoute) {
            cachedRoute = (async () => {
              let routes = [];
              try {
                const result = await Route.computeRoutes(routeRequest);
                routes = result.routes || [];
              } catch {
                routes = [];
              }
              let drivingRoutes = routes?.[0] ? [routes[0]] : [];
              let fallbackDestinationIndexes = [];
              if (!drivingRoutes.length) {
                const legs = routePoints.slice(0, -1).map((origin, index) => ({ origin, destination: routePoints[index + 1] }));
                const legResults = await Promise.all(legs.map(async ({ origin, destination }) => {
                  try {
                    const result = await Route.computeRoutes({
                      origin,
                      destination,
                      travelMode: 'DRIVING',
                      polylineQuality: 'HIGH_QUALITY',
                      fields: ['path', 'durationMillis', 'distanceMeters'],
                    });
                    return result.routes?.[0] || null;
                  } catch {
                    return null;
                  }
                }));
                fallbackDestinationIndexes = legResults
                  .map((route, index) => route ? index + 1 : null)
                  .filter((index) => index !== null);
                drivingRoutes = legResults.filter(Boolean);
              }
              return { drivingRoutes, fallbackDestinationIndexes };
            })();
            routeCache.current = { key: routeKey, promise: cachedRoute };
          }
          let routeResult;
          try {
            routeResult = await cachedRoute;
          } catch (error) {
            if (routeCache.current?.promise === cachedRoute) routeCache.current = null;
            throw error;
          }
          const { drivingRoutes, fallbackDestinationIndexes } = routeResult;
          if (!drivingRoutes.length && routeCache.current?.promise === cachedRoute) routeCache.current = null;
          if (cancelled) return;
          if (!drivingRoutes.length) throw new Error('車のルートが見つかりませんでした');
          const travelTimes = {};
          if (drivingRoutes.length === 1 && drivingRoutes[0].legs?.length) {
            drivingRoutes[0].legs.forEach((leg, index) => {
              const destination = routeStops[index + 1];
              if (destination?.id && Number.isFinite(leg.durationMillis)) {
                travelTimes[destination.id] = {
                  durationMillis: leg.durationMillis,
                  distanceMeters: leg.distanceMeters,
                  fromPreviousDay: routeStops[index]?.fromPreviousDay || false,
                };
              }
            });
          } else {
            drivingRoutes.forEach((route, index) => {
              const destinationIndex = fallbackDestinationIndexes[index] ?? index + 1;
              const destination = routeStops[destinationIndex];
              if (destination?.id && Number.isFinite(route.durationMillis)) {
                travelTimes[destination.id] = {
                  durationMillis: route.durationMillis,
                  distanceMeters: route.distanceMeters,
                  fromPreviousDay: routeStops[destinationIndex - 1]?.fromPreviousDay || false,
                };
              }
            });
          }
          onTravelTimesChange(travelTimes);
          const polylineOptions = (strokeColor) => ({ strokeColor, strokeOpacity: 0.9, strokeWeight: 5 });
          const hasLegPaths = varyRouteColors && fallbackDestinationIndexes.length === 0
            && drivingRoutes.length === 1 && drivingRoutes[0].legs?.every((leg) => leg.path?.length);
          const routeLines = hasLegPaths
            ? drivingRoutes[0].legs.map((leg, index) => new window.google.maps.Polyline({
              path: leg.path,
              ...polylineOptions(routeColorForIndex(routeStops[index + 1]?.activityIndex ?? index, true)),
            }))
            : drivingRoutes.flatMap((route, index) => {
              const destinationIndex = fallbackDestinationIndexes[index] ?? index + 1;
              const activityIndex = routeStops[destinationIndex]?.activityIndex ?? destinationIndex;
              return route.createPolylines({
                polylineOptions: polylineOptions(routeColorForIndex(activityIndex, varyRouteColors)),
              });
            });
          routeLines.forEach((routeLine) => {
            routeLine.setMap(mapRef.current);
            overlays.current.push(routeLine);
          });
          if (drivingRoutes.length === 1 && drivingRoutes[0].viewport) mapRef.current.fitBounds(drivingRoutes[0].viewport, 80);
          setRouteStatus('ready');
        } catch (error) {
          if (cancelled) return;
          console.warn('車のルートを表示できませんでした。', error);
          setRouteStatus('error');
        }
      };
      drawDrivingRoute();
    } else if (points.length > 1) {
      mapRef.current.fitBounds(bounds, 80);
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(points.length ? 14 : 12);
    }
    return () => { cancelled = true; };
  }, [day, previousDay, mapStatus, onMapPick, onTravelTimesChange, varyRouteColors]);

  const accessCard = (authorizationError = false) => (
    <button className="map-key-card" onClick={onRequestKey}>
      <span className="map-key-icon"><KeyRound size={18} /></span>
      <span>
        <strong>{authorizationError ? 'Google Mapsの使用を許可' : 'Google Mapsを接続'}</strong>
        <small>{authorizationError ? 'Google Cloudのキー制限でこのサイトを許可してください' : '場所検索や地図からの追加にはAPIキーが必要です'}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );

  if (!apiKey) {
    return (
      <div className="map-fallback" aria-label="地図プレビュー">
        <div className="map-grid" />
        <div className="river river-one" />
        <div className="river river-two" />
        <span className="map-label label-shibuya">渋谷</span>
        <span className="map-label label-ueno">上野</span>
        <span className="map-label label-ginza">銀座</span>
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
      {mapStatus === 'loading' && <span className="map-loading">地図を読み込んでいます…</span>}
      {mapStatus === 'error' && accessCard(true)}
      {mapStatus === 'ready' && routeStatus === 'loading' && <span className="map-loading">車のルートを検索しています…</span>}
      {mapStatus === 'ready' && routeStatus === 'error' && <span className="map-loading map-route-error">車のルートを表示できません</span>}
    </div>
  );
}

function SearchBar({ apiKey, onResult, onRequestKey }) {
  const [query, setQuery] = useState('');
  return <PlaceSearch variant="map" value={query} onChange={setQuery} apiKey={apiKey}
    onRequestKey={onRequestKey} onSelect={(place) => { setQuery(place.location); onResult(place); }} />;
}

function DayStrip({ trip, dayIndex, setDayIndex }) {
  return (
    <div className="day-strip" role="tablist" aria-label="旅行の日程">
      {trip.days.map((day, index) => (
        <button key={day.id} className={index === dayIndex ? 'active' : ''} onClick={() => setDayIndex(index)} role="tab" aria-selected={index === dayIndex}>
          <span>{index + 1}日目</span>
          <strong>{formatDay(day.date, { weekday: 'short', day: 'numeric' })}</strong>
        </button>
      ))}
    </div>
  );
}

function SortableStop({ item, index, count, travelTime, varyRouteColors, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: count < 2 });
  return (
    <article ref={setNodeRef} className={`stop sortable-stop ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="stop-time">{item.time || '時間未定'}</div>
      <div className="stop-track">
        <span className="stop-number" style={{
          backgroundColor: routeColorForIndex(index, varyRouteColors),
          color: routeTextColor(routeColorForIndex(index, varyRouteColors)),
        }}>{index + 1}</span>
        {index < count - 1 && <span className="stop-rule" />}
      </div>
      <div className="stop-copy">
        {travelTime && <div className="travel-time">
          <span><Navigation size={13} /> 車</span>
          <strong>{formatTravelDuration(travelTime.durationMillis)}</strong>
          {formatTravelDistance(travelTime.distanceMeters)
            && <small>· {formatTravelDistance(travelTime.distanceMeters)}</small>}
          <em>{travelTime.fromPreviousDay ? '前の日から' : '前の予定から'}</em>
        </div>}
        <div className="stop-heading">
          {count > 1 && <button ref={setActivatorNodeRef} className="drag-handle" type="button"
            aria-label={`${item.title}を並べ替える`} title="ドラッグして並べ替え"
            onTouchStart={(event) => event.stopPropagation()} {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>}
          <h3>{item.title}</h3>
          <div className="stop-actions">
            <button onClick={() => onEdit(item)} aria-label={`${item.title}を編集`}><Pencil size={15} /></button>
            <button onClick={() => onDelete(item.id)} aria-label={`${item.title}を削除`}><Trash2 size={15} /></button>
          </div>
        </div>
        <p><MapPin size={13} /> {item.location || '場所未設定'}</p>
        {item.notes && <small>{item.notes}</small>}
      </div>
    </article>
  );
}

function Timeline({ day, travelTimes, varyRouteColors, onEdit, onDelete, onAdd, onReorder }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeItem = day.activities.find((item) => item.id === activeId);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finishDrag = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const fromIndex = day.activities.findIndex((item) => item.id === active.id);
    const toIndex = day.activities.findIndex((item) => item.id === over.id);
    onReorder(reorderActivitiesIntoTimeSlots(day.activities, fromIndex, toIndex));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)} onDragCancel={() => setActiveId(null)} onDragEnd={finishDrag}>
      <div className="timeline">
        {day.activities.length === 0 ? (
          <button className="empty-day" onClick={onAdd}>
            <span><Sparkles size={20} /></span>
            <strong>この日の予定を作りましょう</strong>
            <small>最初の場所や予定を追加してください。</small>
          </button>
        ) : <SortableContext items={day.activities.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {day.activities.map((item, index) => <SortableStop key={item.id} item={item} index={index}
            count={day.activities.length} travelTime={travelTimes[item.id]} varyRouteColors={varyRouteColors}
            onEdit={onEdit} onDelete={onDelete} />)}
        </SortableContext>}
        {day.activities.length > 0 && <button className="add-stop-inline" onClick={onAdd}><Plus size={16} /> 予定を追加</button>}
      </div>
      <DragOverlay dropAnimation={reducedMotion ? null : { duration: 230, easing: 'cubic-bezier(.2,.9,.3,1)' }}>
        {activeItem && <div className="drag-preview">
          <GripVertical size={17} />
          <span>{activeItem.time || '時間未定'}</span>
          <strong>{activeItem.title}</strong>
        </div>}
      </DragOverlay>
    </DndContext>
  );
}

function ItinerarySheet({ trip, day, travelTimes, varyRouteColors, dayIndex, setDayIndex, open, setOpen, onAdd, onEdit, onDelete, onReorder, onEditDay }) {
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
    <section className={`itinerary-sheet ${open ? 'sheet-open' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label="この日の旅程">
      <button className="sheet-handle-wrap" onClick={() => setOpen(!open)} aria-label={open ? '旅程を閉じる' : '旅程を開く'}><span className="sheet-handle" /></button>
      <div className="mobile-day-strip"><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
      <div className="sheet-title-row">
        <div>
          <span className="eyebrow">{dayIndex + 1}日目 · {formatDay(day.date)}</span>
          <h2>{day.title}</h2>
          {day.note && <p>{day.note}</p>}
        </div>
        <button className="icon-button subtle" onClick={onEditDay} aria-label="この日を編集"><Pencil size={17} /></button>
      </div>
      <div className="day-arrows">
        <button aria-label="前の日" title="前の日" onClick={() => setDayIndex(Math.max(0, dayIndex - 1))} disabled={dayIndex === 0}><ChevronLeft size={17} /></button>
        <span>{dayIndex + 1} / {trip.days.length}</span>
        <button aria-label="次の日" title="次の日" onClick={() => setDayIndex(Math.min(trip.days.length - 1, dayIndex + 1))} disabled={dayIndex === trip.days.length - 1}><ChevronRight size={17} /></button>
      </div>
      <Timeline day={day} travelTimes={travelTimes} varyRouteColors={varyRouteColors}
        onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} onReorder={onReorder} />
    </section>
  );
}

function TripRail({ trips, selectedId, onSelect, onAdd, onDelete, open, onClose, syncStatus }) {
  const palette = ['#FF5722', '#76ABAE', '#F5F5F5'];
  return (
    <aside className={`trip-rail ${open ? 'rail-open' : ''}`}>
      <div className="rail-brand"><span className="brand-mark"><Navigation size={18} fill="currentColor" /></span><span>ROAM</span></div>
      <div className="rail-heading"><span>旅行一覧</span><button onClick={onAdd} aria-label="旅行を追加"><Plus size={17} /></button></div>
      <div className="trip-list">
        {trips.map((trip, index) => (
          <button key={trip.id} className={`trip-card ${trip.id === selectedId ? 'active' : ''}`} onClick={() => {
            onSelect(trip.id);
            if (window.matchMedia('(max-width: 820px)').matches) onClose();
          }}>
            <span className="trip-card-top"><span className="trip-dot" style={{ background: palette[index % palette.length] }} /><small>{trip.days.length}日間</small>{trips.length > 1 && <span className="trip-trash" onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}><Trash2 size={14} /></span>}</span>
            <strong>{trip.title}</strong>
            <span>{dateRange(trip)}</span>
          </button>
        ))}
      </div>
      <button className="new-trip-button" onClick={onAdd}><CirclePlus size={19} /> 新しい旅行を作成</button>
      <div className="rail-foot"><span>{['error', 'local'].includes(syncStatus) ? 'このブラウザに保存' : '共有ワークスペース'}</span><span className="saved-dot"><Check size={12} /> {syncStatus === 'saving' ? '同期中' : syncStatus === 'loading' ? '読み込み中' : ['error', 'local'].includes(syncStatus) ? 'ローカル' : '同期済み'}</span></div>
    </aside>
  );
}

function Modal({ title, eyebrow, onClose, children, danger }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`modal ${danger ? 'danger' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={19} /></button></div>
        {children}
      </section>
    </div>
  );
}

function ActivityForm({ initial, onSave, onClose, apiKey }) {
  const [form, setForm] = useState(initial || { time: '10:00', title: '', location: '', notes: '', coords: null });
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return (
    <Modal title={initial?.id ? '予定を編集' : '予定を追加'} eyebrow="この日の旅程" onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) onSave({ ...form, id: form.id || uid() }); }}>
        <label className="field time-field"><span>時刻</span><input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></label>
        <label className="field title-field"><span>予定</span><input autoFocus required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="夕食、美術館、電車など" /></label>
        <div className="field full"><span>場所</span>
          <PlaceSearch value={form.location} apiKey={apiKey}
            onChange={(location) => setForm((current) => ({ ...current, location, coords: null }))}
            onSelect={({ location, coords }) => setForm((current) => ({ ...current, location, coords }))} />
          {form.coords && <small className="located"><Check size={12} /> 地図に追加済み</small>}
        </div>
        <label className="field full"><span>メモ</span><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="予約情報、注意事項、注文したいものなど" rows="3" /></label>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button">予定を保存</button></div>
      </form>
    </Modal>
  );
}

function TripForm({ onSave, onClose }) {
  const [form, setForm] = useState({ title: '', subtitle: '', startDate: '', endDate: '', color: '#FF5722' });
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return (
    <Modal title="新しい旅行を作成" eyebrow="新規旅行" onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (form.title && form.startDate) onSave(form); }}>
        <label className="field full"><span>旅行名</span><input autoFocus required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="例：京都で過ごす週末" /></label>
        <label className="field full"><span>旅行の説明</span><input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="例：お寺、朝の散歩、とっておきの食事" /></label>
        <label className="field"><span>開始日</span><input required type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label className="field"><span>終了日</span><input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button">旅行を作成 <ArrowLeft size={16} /></button></div>
      </form>
    </Modal>
  );
}

function DayForm({ day, onSave, onAddDay, onClose }) {
  const [form, setForm] = useState(day);
  return (
    <Modal title="この日の予定を編集" eyebrow={formatDay(day.date)} onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <label className="field full"><span>この日のタイトル</span><input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="field full"><span>日付</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="field full"><span>この日のメモ</span><textarea rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="過ごし方、注意事項、大切にしたいことなど" /></label>
        <button type="button" className="text-button full" onClick={onAddDay}><Plus size={16} /> この日の後に1日追加</button>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button">この日を保存 <Check size={16} /></button></div>
      </form>
    </Modal>
  );
}

function SettingsModal({ apiKey, setApiKey, varyRouteColors, setVaryRouteColors, onClose }) {
  const [value, setValue] = useState(apiKey);
  const [varyColors, setVaryColors] = useState(varyRouteColors);
  return (
    <Modal title="Google Mapsを接続" eyebrow="地図の設定" onClose={onClose}>
      <div className="settings-copy"><p>Google Maps JavaScript APIキーを入力すると、地図、場所検索、地図をタップして予定を追加する機能が使えます。</p><p>キーはこのブラウザに保存されます。公開サイトでは、Google CloudでGitHub Pagesのドメインに利用を制限してください。</p></div>
      <label className="field full"><span>APIキー</span><input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="AIza…" /></label>
      <label className="route-color-setting">
        <input type="checkbox" checked={varyColors} onChange={(event) => setVaryColors(event.target.checked)} />
        <span className="setting-switch" aria-hidden="true"><i /></span>
        <span><strong>地点ごとにルート色を変える</strong><small>地図の区間と旅程の番号を同じ色で表示します</small></span>
      </label>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button" onClick={() => { setApiKey(value.trim()); setVaryRouteColors(varyColors); onClose(); }}>設定を保存</button></div>
    </Modal>
  );
}

function App() {
  const initialTrips = useMemo(() => migrateTrips(), []);
  const { trips, setTrips, syncStatus } = useSharedWorkspace(initialTrips);
  const bundledApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [savedApiKey, setApiKey] = useStoredState('roam.googleMapsKey', '');
  const [varyRouteColors, setVaryRouteColors] = useStoredState('roam.varyRouteColors', false);
  const apiKey = savedApiKey || bundledApiKey;
  const [selectedId, setSelectedId] = useState(trips[0]?.id);
  const [dayIndex, setDayIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [travelTimes, setTravelTimes] = useState({});
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
    updateDay((current) => ({
      ...current,
      activities: sortActivitiesByTime(current.activities.some((item) => item.id === activity.id)
        ? current.activities.map((item) => item.id === activity.id ? activity : item)
        : [...current.activities, activity]),
    }));
    setModal(null);
  };
  const createTrip = (form) => {
    const firstDay = { id: uid(), date: form.startDate, title: '到着・最初の一日', note: '予定を詰めすぎず、余白を残しておきましょう。', activities: [] };
    const newTrip = { ...form, id: uid(), endDate: form.endDate || form.startDate, days: [firstDay] };
    setTrips((current) => [...current, newTrip]);
    setSelectedId(newTrip.id);
    setDayIndex(0);
    setModal(null);
  };
  const deleteTrip = (id) => {
    if (!confirm('この旅行を削除しますか？')) return;
    const remaining = trips.filter((item) => item.id !== id);
    setTrips(remaining);
    if (id === selectedId) { setSelectedId(remaining[0]?.id); setDayIndex(0); }
  };
  const addDay = () => {
    const currentDate = new Date(`${day.date}T12:00:00`);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDay = { id: uid(), date: currentDate.toISOString().slice(0, 10), title: '新しい一日', note: '', activities: [] };
    updateTrip((current) => { const days = [...current.days]; days.splice(dayIndex + 1, 0, newDay); return { ...current, days }; });
    setDayIndex(dayIndex + 1);
    setModal({ type: 'day', day: newDay });
  };
  const mapPick = useCallback((place) => setModal({ type: 'activity', activity: { time: '10:00', title: '', notes: '', ...place } }), []);

  useEffect(() => { setDayIndex(0); }, [selectedId]);
  useEffect(() => { if (dayIndex >= (trip?.days.length || 1)) setDayIndex(0); }, [trip?.days.length, dayIndex]);

  if (!trip || !day) return <div className="empty-app"><button className="primary-button" onClick={() => setTrips(seedTrips)}>旅行データを復元</button></div>;

  return (
    <main className={`app-shell ${railOpen ? '' : 'rail-hidden'}`}>
      <TripRail trips={trips} selectedId={trip.id} onSelect={setSelectedId} onAdd={() => setModal({ type: 'trip' })} onDelete={deleteTrip} open={railOpen} onClose={() => setRailOpen(false)} syncStatus={syncStatus} />
      {railOpen && <button className="rail-scrim" onClick={() => setRailOpen(false)} aria-label="旅行一覧を閉じる" />}
      <section className="map-stage">
        <header className="topbar">
          <button className="icon-button rail-toggle" onClick={() => setRailOpen((open) => !open)}
            aria-label={railOpen ? '旅行一覧を閉じる' : '旅行一覧を開く'} title={railOpen ? '旅行一覧を閉じる' : '旅行一覧を開く'}>
            {railOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="trip-heading"><span className="eyebrow">{dateRange(trip)}</span><h1>{trip.title}</h1><p>{trip.subtitle}</p></div>
          <button className="icon-button" onClick={() => setModal({ type: 'settings' })} aria-label="地図の設定"><Settings size={19} /></button>
        </header>
        <SearchBar apiKey={apiKey} onResult={mapPick} onRequestKey={() => setModal({ type: 'settings' })} />
        <GoogleMap apiKey={apiKey} day={day} previousDay={trip.days[dayIndex - 1]} onMapPick={mapPick}
          onRequestKey={() => setModal({ type: 'settings' })} onTravelTimesChange={setTravelTimes}
          varyRouteColors={varyRouteColors} />
        <div className="desktop-day-strip"><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
        <div className="map-hint"><MapPin size={14} /> 地図をタップして予定を追加</div>
      </section>
      <ItinerarySheet trip={trip} day={day} travelTimes={travelTimes} varyRouteColors={varyRouteColors} dayIndex={dayIndex} setDayIndex={setDayIndex} open={sheetOpen} setOpen={setSheetOpen} onAdd={() => setModal({ type: 'activity' })} onEdit={(activity) => setModal({ type: 'activity', activity })} onDelete={(id) => updateDay((current) => ({ ...current, activities: current.activities.filter((item) => item.id !== id) }))} onReorder={(activities) => updateDay((current) => ({ ...current, activities }))} onEditDay={() => setModal({ type: 'day', day })} />
      <nav className="mobile-nav" aria-label="クイック操作">
        <button onClick={() => setRailOpen(true)}><CalendarDays size={19} /><span>旅行</span></button>
        <button className="nav-add" aria-label="予定を追加" onClick={() => setModal({ type: 'activity' })}><Plus size={23} /></button>
      </nav>
      {modal?.type === 'activity' && <ActivityForm initial={modal.activity} onSave={saveActivity} onClose={() => setModal(null)} apiKey={apiKey} />}
      {modal?.type === 'trip' && <TripForm onSave={createTrip} onClose={() => setModal(null)} />}
      {modal?.type === 'day' && <DayForm day={modal.day} onClose={() => setModal(null)} onAddDay={addDay} onSave={(saved) => { updateDay(() => saved); setModal(null); }} />}
      {modal?.type === 'settings' && <SettingsModal apiKey={apiKey} setApiKey={setApiKey}
        varyRouteColors={varyRouteColors} setVaryRouteColors={setVaryRouteColors} onClose={() => setModal(null)} />}
    </main>
  );
}

const rootElement = document.getElementById('root');
const appRoot = window.__roamRoot ?? createRoot(rootElement);
window.__roamRoot = appRoot;
appRoot.render(<App />);
