import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
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
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CirclePlus,
  Download,
  ExternalLink,
  GripVertical,
  ImagePlus,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Navigation,
  StickyNote,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Settings,
  Search,
  Sparkles,
  Store,
  Trash2,
  Undo2,
  Redo2,
  X,
  Zap,
} from 'lucide-react';
import { domesticTrip } from './domesticTrip';
import { icelandTrip } from './icelandTrip';
import { useSharedWorkspace } from './useSharedWorkspace';
import { migrateTripsForCurrentApp } from './tripMigrations';
import './styles.css';
import PlaceSearch from './PlaceSearch';
import PlanImage from './PlanImage';
import './offline';
import './travelReader.css';
import { searchBonusStores, searchEvChargers, searchTripActivities } from './planPlaces';
import { isOfflineTripComplete, offlineTripManifest, removeOfflineTrip, saveTripOffline } from './offlineTrip';
import { routeLegsForDisplay, splitOverlappingRouteLegs } from './routePresentation';
import { namedPlaceFromMapClick } from './mapPlacePick';
import { closestDayIndex, localDateISO, selectDefaultTrip } from './tripSelection';
import { BOOKMARK_CATEGORIES, bookmarkCategory, findMatchingBookmark, moveActivityToBookmark, removeTripBookmark, saveTripBookmark } from './bookmarks';
import { uploadPlanImage } from './travelDocuments';
import {
  distanceKmBetween,
  formatTravelDistance,
  formatTravelDuration,
  previousDayRouteOrigin,
  reorderActivitiesIntoTimeSlots,
  routeColorForIndex,
  saveActivityOnDate,
  sortActivitiesByTime,
  sortTripsByStartDate,
  travelModeForActivity,
  travelTimesForRoutes,
} from './itineraryUtils';

const TravelReader = React.lazy(() => import('./TravelReader'));

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const EMPTY_BOOKMARKS = [];

const seedTrips = sortTripsByStartDate([icelandTrip, domesticTrip]);
const migrateTrips = () => {
  try {
    const previous = JSON.parse(localStorage.getItem('roam.trips.v2') || '[]');
    if (Array.isArray(previous) && previous.length) {
      const retained = previous.filter((trip) => !['tokyo-weekender', 'setouchi-notes'].includes(trip.id));
      const withIceland = retained.some((trip) => trip.id === icelandTrip.id) ? retained : [icelandTrip, ...retained];
      return migrateTripsForCurrentApp(withIceland.some((trip) => trip.id === domesticTrip.id) ? withIceland : [...withIceland, domesticTrip]);
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

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function createMapMarker(maps, map, position, { className, text, title, style, onClick }) {
  const marker = new maps.OverlayView();
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = text;
  node.setAttribute('aria-label', title);
  Object.assign(node.style, style);
  node.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  marker.onAdd = () => marker.getPanes().overlayMouseTarget.appendChild(node);
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

function createStopMarker(maps, map, item, number, color, onClick) {
  return createMapMarker(maps, map, item.coords, {
    className: 'map-stop-marker',
    text: String(number),
    title: `${number}. ${item.title || '場所'}の詳細を表示`,
    style: { backgroundColor: '#ffffff', color },
    onClick,
  });
}

function MapDetailCard({ selection, travelTime, onClose, onGuide, onAddBookmarkToPlan, onEditBookmark }) {
  if (!selection) return null;
  if (selection.type === 'bonus') {
    const store = selection.item;
    return <article className="map-detail-card bonus-detail-card" aria-live="polite">
      <button className="map-detail-close" onClick={onClose} aria-label="詳細を閉じる"><X size={16} /></button>
      <span className="map-detail-symbol"><Store size={19} /></span>
      <div className="map-detail-copy"><small>近くのスーパーマーケット</small><h2>{store.title}</h2>
        {store.location && <p>{store.location}</p>}
        {store.googleMapsURI && <a href={store.googleMapsURI} target="_blank" rel="noreferrer">Google Mapsで開く <ExternalLink size={14} /></a>}
      </div>
    </article>;
  }
  if (selection.type === 'charger') {
    const charger = selection.item;
    const distance = charger.distanceFromHotelKm < 1
      ? `${Math.round(charger.distanceFromHotelKm * 1000)} m`
      : `${charger.distanceFromHotelKm.toFixed(1)} km`;
    return <article className="map-detail-card charger-detail-card" aria-live="polite">
      <button className="map-detail-close" onClick={onClose} aria-label="詳細を閉じる"><X size={16} /></button>
      <span className="map-detail-symbol"><Zap size={19} /></span>
      <div className="map-detail-copy"><small>{charger.hotelTitle}から約{distance}</small><h2>{charger.title}</h2>
        {charger.location && <p>{charger.location}</p>}
        {charger.googleMapsURI && <a href={charger.googleMapsURI} target="_blank" rel="noreferrer">Google Mapsで開く <ExternalLink size={14} /></a>}
      </div>
    </article>;
  }
  if (selection.type === 'bookmark') {
    const bookmark = selection.item;
    return <article className={`map-detail-card bookmark-detail-card bookmark-${bookmark.category} ${bookmark.images?.length ? 'has-bookmark-image' : ''}`} aria-live="polite">
      <button className="map-detail-close" onClick={onClose} aria-label="詳細を閉じる"><X size={16} /></button>
      <span className="map-detail-symbol"><Bookmark size={18} fill="currentColor" /></span>
      {bookmark.images?.[0] && <PlanImage image={bookmark.images[0]} className="bookmark-detail-image" eager expandable />}
      <div className="map-detail-copy"><small>ブックマーク · {bookmarkCategory(bookmark.category).label}</small><h2>{bookmark.title}</h2>
        {bookmark.location && <p>{bookmark.location}</p>}
        {bookmark.notes && <p className="bookmark-detail-notes">{bookmark.notes}</p>}
        <div className="bookmark-detail-actions">
          <button onClick={() => onAddBookmarkToPlan(bookmark)}>予定に追加</button>
          <button onClick={() => onEditBookmark(bookmark)}>カテゴリを変更</button>
        </div>
      </div>
    </article>;
  }
  const activity = selection.item;
  const firstImage = activity.images?.[0];
  return <article className={`map-detail-card activity-detail-card ${firstImage ? 'has-image' : ''}`} aria-live="polite">
    <button className="map-detail-close" onClick={onClose} aria-label="詳細を閉じる"><X size={16} /></button>
    <button className="map-detail-guide" onClick={() => onGuide(activity)} aria-label={`${activity.title}の地点ガイドを開く`} title="地点ガイド"><BookOpen size={17} /></button>
    {firstImage && <PlanImage image={firstImage} className="map-detail-image" eager expandable />}
    <div className="map-detail-copy"><small>{activity.time || '時間未定'}</small><h2>{activity.title}</h2>
      {travelTime && <div className={`travel-time map-travel-time ${travelTime.travelMode === 'WALKING' ? 'is-walking' : 'is-driving'} ${travelTime.unavailable ? 'is-unavailable' : ''}`}>
        <strong>{travelTime.unavailable
          ? `${travelTime.travelMode === 'WALKING' ? '徒歩' : '車'}のルートなし`
          : `${travelTime.travelMode === 'WALKING' ? '徒歩' : '車'}で${formatTravelDuration(travelTime.durationMillis)}`}</strong>
        {!travelTime.unavailable && formatTravelDistance(travelTime.distanceMeters) && <small>· {formatTravelDistance(travelTime.distanceMeters)}</small>}
      </div>}
      {activity.location && <p>{activity.location}</p>}
    </div>
  </article>;
}

const GoogleMap = React.memo(function GoogleMap({ apiKey, day, previousDay, bookmarks, onMapPick, onTravelTimesChange, travelTimes, varyRouteColors, showBonus, showChargers, focusRequest, offline, compactViewport, onGuide, onAddBookmarkToPlan, onEditBookmark }) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const overlays = useRef([]);
  const bookmarkMarkers = useRef([]);
  const locationMarker = useRef(null);
  const locationWatch = useRef(null);
  const selectionRef = useRef(null);
  const routeCache = useRef(null);
  const renderedDayId = useRef(null);
  const travelTimesStopsKey = useRef(null);
  const mapPickRequest = useRef(0);
  const mapPickCallback = useRef(onMapPick);
  const bonusCache = useRef(new Map());
  const chargerCache = useRef(new Map());
  const handledFocusRequest = useRef(null);
  const [mapStatus, setMapStatus] = useState(apiKey ? 'loading' : 'missing');
  const [routeStatus, setRouteStatus] = useState('idle');
  const [selection, setSelection] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  selectionRef.current = selection;
  mapPickCallback.current = onMapPick;

  useEffect(() => {
    if (!apiKey || window.google?.maps) return;
    window.__roamGoogleReady = () => {
      setMapStatus('ready');
      window.dispatchEvent(new Event('roam-maps-ready'));
    };
    const mapsFailed = () => {
      document.querySelector('script[data-roam-maps]')?.remove();
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
    if (!apiKey) {
      overlays.current.forEach((overlay) => overlay.setMap(null));
      overlays.current = [];
      locationMarker.current?.setMap(null);
      locationMarker.current = null;
      if (mapRef.current && window.google?.maps) window.google.maps.event?.clearInstanceListeners?.(mapRef.current);
      mapRef.current = null;
      routeCache.current = null;
      travelTimesStopsKey.current = null;
      setRouteStatus('idle');
      setMapStatus('missing');
    } else if (window.google?.maps) setMapStatus('ready');
    else setMapStatus('loading');
  }, [apiKey]);

  useEffect(() => {
    if (!mapNode.current || !window.ResizeObserver) return undefined;
    let resizeTimer;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapRef.current && window.google?.maps) window.google.maps.event.trigger(mapRef.current, 'resize');
      }, 120);
    });
    observer.observe(mapNode.current);
    return () => { observer.disconnect(); clearTimeout(resizeTimer); };
  }, [mapStatus]);

  const selectedActivityId = selection?.type === 'activity' ? selection.activityId : null;
  const selectedPreviousActivity = selection?.type === 'previous' ? selection.item : null;
  const previousActivity = previousDayRouteOrigin(day, previousDay);
  const resolvedSelection = selection?.type === 'activity'
    ? (() => {
      const item = day.activities.find((activity) => activity.id === selection.activityId);
      return item ? { ...selection, item } : null;
    })()
    : selection?.type === 'bookmark'
      ? (() => {
        const item = bookmarks.find((bookmark) => bookmark.id === selection.bookmarkId);
        return item ? { ...selection, item } : null;
      })()
      : selection;

  useEffect(() => {
    mapPickRequest.current += 1;
    setSelection(null);
  }, [day.id]);
  useEffect(() => {
    setSelection((current) => current?.type === 'activity'
      && !day.activities.some((activity) => activity.id === current.activityId) ? null : current);
  }, [day.activities]);
  useEffect(() => {
    setSelection((current) => current?.type === 'bookmark'
      && !bookmarks.some((bookmark) => bookmark.id === current.bookmarkId) ? null : current);
  }, [bookmarks]);
  useEffect(() => {
    if (!focusRequest?.requestId || handledFocusRequest.current === focusRequest.requestId) return;
    const focused = focusRequest.previousDay
      ? previousActivity
      : day.activities.find((activity) => activity.id === focusRequest.activityId);
    if (!focused) return;
    handledFocusRequest.current = focusRequest.requestId;
    const type = focusRequest.previousDay ? 'previous' : 'activity';
    setSelection((current) => focusRequest.mode === 'toggle'
      && current?.type === type
      && (type === 'previous' ? current.item?.id : current.activityId) === focused.id
      ? null : type === 'previous' ? { type, item: focused } : { type, activityId: focused.id });
  }, [day.id, day.activities, focusRequest?.activityId, focusRequest?.mode, focusRequest?.previousDay, focusRequest?.requestId, previousActivity]);

  useEffect(() => () => {
    mapPickRequest.current += 1;
    if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current);
    locationMarker.current?.setMap(null);
    overlays.current.forEach((overlay) => overlay.setMap(null));
    overlays.current = [];
    bookmarkMarkers.current.forEach((marker) => marker.setMap(null));
    bookmarkMarkers.current = [];
    if (mapRef.current && window.google?.maps) window.google.maps.event?.clearInstanceListeners?.(mapRef.current);
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current || !currentLocation) return;
    locationMarker.current?.setMap(null);
    locationMarker.current = createMapMarker(window.google.maps, mapRef.current, currentLocation, {
      className: 'map-current-location',
      text: '',
      title: '現在地',
      onClick: () => mapRef.current?.panTo(currentLocation),
    });
  }, [currentLocation, mapStatus]);

  const showCurrentLocation = () => {
    if (!navigator.geolocation || locationStatus === 'locating') return;
    setLocationStatus('locating');
    if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
    locationWatch.current = navigator.geolocation.watchPosition(({ coords }) => {
      const next = { lat: coords.latitude, lng: coords.longitude };
      setCurrentLocation(next);
      setLocationStatus('ready');
      mapRef.current?.panTo(next);
      if ((mapRef.current?.getZoom?.() || 0) < 14) mapRef.current?.setZoom(14);
    }, () => setLocationStatus('error'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapNode.current) return;
    let cancelled = false;
    const preserveBookmarkView = selectionRef.current?.type === 'bookmark' && renderedDayId.current === day.id;
    renderedDayId.current = day.id;
    const mappedStops = day.activities.map((item, index) => ({ item, index })).filter(({ item }) => item.coords);
    const points = mappedStops.map(({ item }) => item.coords);
    const routeableStops = mappedStops.filter(({ item }) => item.route !== false)
      .map(({ item, index }) => ({
        id: item.id,
        coords: item.coords,
        activityIndex: index,
        fromPreviousDay: false,
        travelMode: travelModeForActivity(item),
      }));
    const previousPoint = previousActivity?.coords;
    const connectPreviousDay = Boolean(previousActivity && routeableStops[0]);
    const rawRouteStops = connectPreviousDay
      ? [{ id: previousActivity.id, coords: previousPoint, activityIndex: -1, fromPreviousDay: true, travelMode: null }, ...routeableStops]
      : routeableStops;
    const routeStops = rawRouteStops.filter((stop, index) => index === 0
      || distanceKmBetween(rawRouteStops[index - 1].coords, stop.coords) > 0.05);
    const currentDayRouteStops = routeStops.filter((stop) => !stop.fromPreviousDay);
    const selectedDayRouteIndex = currentDayRouteStops.findIndex((stop) => stop.id === selectedActivityId);
    const selectedDestination = selectedDayRouteIndex >= 0 ? currentDayRouteStops[selectedDayRouteIndex] : null;
    const selectedStart = selectedDayRouteIndex > 0
      ? currentDayRouteStops[selectedDayRouteIndex - 1]
      : selectedDayRouteIndex === 0 ? routeStops.find((stop) => stop.fromPreviousDay) : null;
    const selectedDestinationIndex = selectedDestination ? routeStops.indexOf(selectedDestination) : -1;
    const visibleStopIds = selectedActivityId
      ? new Set([selectedActivityId, selectedStart?.id].filter(Boolean))
      : null;
    const routePoints = routeStops.map((stop) => stop.coords);
    const routeKey = JSON.stringify(routeStops.map((stop) => [stop.coords.lat, stop.coords.lng, stop.travelMode]));
    const stopIdsKey = JSON.stringify(routeStops.map((stop) => stop.id));
    const center = points[0] || { lat: 35.6812, lng: 139.7671 };
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapNode.current, {
        center,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: true,
        gestureHandling: 'greedy',
      });
      mapRef.current.addListener('click', async (event) => {
        const requestId = ++mapPickRequest.current;
        event.stop?.();
        if (selectionRef.current?.type === 'activity') {
          setSelection(null);
          return;
        }
        setSelection(null);
        const place = await namedPlaceFromMapClick(window.google.maps, event);
        if (place && requestId === mapPickRequest.current) mapPickCallback.current(place);
      });
    }
    if (currentLocation && !locationMarker.current) {
      locationMarker.current = createMapMarker(window.google.maps, mapRef.current, currentLocation, {
        className: 'map-current-location',
        text: '',
        title: '現在地',
        onClick: () => mapRef.current?.panTo(currentLocation),
      });
    }
    overlays.current.forEach((overlay) => overlay.setMap(null));
    overlays.current = [];
    const routeChanged = routeCache.current?.key !== routeKey || travelTimesStopsKey.current !== stopIdsKey;
    if (routeChanged) {
      travelTimesStopsKey.current = stopIdsKey;
      onTravelTimesChange({});
      setRouteStatus(routePoints.length > 1 ? 'loading' : 'idle');
    }
    const bounds = new window.google.maps.LatLngBounds();
    const showPreviousMarker = connectPreviousDay
      && (!selectedActivityId || selectedStart?.fromPreviousDay || selectedPreviousActivity);
    if (showPreviousMarker) {
      const previousMarker = createStopMarker(window.google.maps, mapRef.current, previousActivity, 0,
        routeColorForIndex(0, varyRouteColors),
        () => setSelection((current) => current?.type === 'previous'
          ? null : { type: 'previous', item: previousActivity }));
      overlays.current.push(previousMarker);
      bounds.extend(previousPoint);
    }
    mappedStops.filter(({ item }) => !selectedPreviousActivity && (!visibleStopIds || visibleStopIds.has(item.id))).forEach(({ item, index }) => {
      const color = routeColorForIndex(index, varyRouteColors);
      const marker = createStopMarker(window.google.maps, mapRef.current, item, index + 1, color,
        () => setSelection((current) => current?.type === 'activity' && current.activityId === item.id
          ? null : { type: 'activity', activityId: item.id }));
      overlays.current.push(marker);
      bounds.extend(item.coords);
    });
    if (!selectedActivityId && !selectedPreviousActivity && showBonus && mappedStops.length) {
      const bonusKey = JSON.stringify(mappedStops.map(({ item }) => [item.coords.lat, item.coords.lng]));
      let storesPromise = bonusCache.current.get(bonusKey);
      if (!storesPromise) {
        storesPromise = searchBonusStores(window.google.maps, mappedStops.map(({ item }) => item));
        bonusCache.current.set(bonusKey, storesPromise);
      }
      storesPromise.then((stores) => {
        if (cancelled) return;
        stores.forEach((store) => {
          const marker = createMapMarker(window.google.maps, mapRef.current, store.coords, {
            className: 'map-bonus-marker',
            text: 'B',
            title: `${store.title}の詳細を表示`,
            onClick: () => setSelection({ type: 'bonus', item: store }),
          });
          overlays.current.push(marker);
        });
      }).catch((error) => {
        if (!cancelled) console.warn('近くのBónusを表示できませんでした。', error);
      });
    }
    if (!selectedActivityId && !selectedPreviousActivity && showChargers && mappedStops.length) {
      const hotelKey = JSON.stringify(mappedStops.map(({ item }) => [item.id, item.coords.lat, item.coords.lng]));
      let chargersPromise = chargerCache.current.get(hotelKey);
      if (!chargersPromise) {
        chargersPromise = searchEvChargers(window.google.maps, mappedStops.map(({ item }) => item));
        chargerCache.current.set(hotelKey, chargersPromise);
      }
      chargersPromise.then((chargers) => {
        if (cancelled) return;
        chargers.forEach((charger) => {
          const marker = createMapMarker(window.google.maps, mapRef.current, charger.coords, {
            className: 'map-charger-marker',
            text: '⚡',
            title: `${charger.title}の詳細を表示`,
            onClick: () => setSelection({ type: 'charger', item: charger }),
          });
          overlays.current.push(marker);
        });
      }).catch((error) => {
        if (!cancelled) console.warn('宿泊先周辺のEV充電器を表示できませんでした。', error);
      });
    }
    if (routePoints.length > 1) {
      if (selectedPreviousActivity) {
        mapRef.current.setCenter(previousPoint);
        mapRef.current.setZoom(14);
      } else if (selectedActivityId && !selectedStart) {
        const selectedPoint = mappedStops.find(({ item }) => item.id === selectedActivityId)?.item.coords;
        if (selectedPoint) { mapRef.current.setCenter(selectedPoint); mapRef.current.setZoom(14); }
      } else if (!preserveBookmarkView) mapRef.current.fitBounds(bounds,
        selectedActivityId && compactViewport ? { top: 38, right: 42, bottom: 125, left: 42 } : 80);
      const drawDrivingRoute = async () => {
        try {
          const { Route } = await window.google.maps.importLibrary('routes');
          const legModes = routeStops.slice(1).map((stop) => stop.travelMode || 'DRIVING');
          const singleTravelMode = legModes.every((mode) => mode === legModes[0]);
          const routeRequest = {
            origin: routePoints[0],
            destination: routePoints[routePoints.length - 1],
            intermediates: routePoints.slice(1, -1).map((location) => ({ location })),
            travelMode: legModes[0] || 'DRIVING',
            polylineQuality: 'HIGH_QUALITY',
            fields: ['path', 'viewport', 'legs'],
          };
          let cachedRoute = routeCache.current?.key === routeKey ? routeCache.current.promise : null;
          if (!cachedRoute) {
            cachedRoute = (async () => {
              let routes = [];
              if (singleTravelMode) {
                try {
                  const result = await Route.computeRoutes(routeRequest);
                  routes = result.routes || [];
                } catch {
                  routes = [];
                }
              }
              let drivingRoutes = routes?.[0] ? [routes[0]] : [];
              let fallbackDestinationIndexes = [];
              let missingLegs = [];
              if (!drivingRoutes.length) {
                const legs = routePoints.slice(0, -1).map((origin, index) => ({
                  origin,
                  destination: routePoints[index + 1],
                  travelMode: legModes[index] || 'DRIVING',
                }));
                const legResults = await Promise.all(legs.map(async ({ origin, destination, travelMode }) => {
                  try {
                    const result = await Route.computeRoutes({
                      origin,
                      destination,
                      travelMode,
                      polylineQuality: 'HIGH_QUALITY',
                      fields: ['path', 'durationMillis', 'distanceMeters'],
                    });
                    return { route: result.routes?.[0] || null, requestFailed: false };
                  } catch {
                    return { route: null, requestFailed: true };
                  }
                }));
                fallbackDestinationIndexes = legResults
                  .map(({ route }, index) => route ? index + 1 : null)
                  .filter((index) => index !== null);
                missingLegs = legResults.flatMap(({ route, requestFailed }, index) => route
                  ? [] : [{ destinationIndex: index + 1, requestFailed }]);
                drivingRoutes = legResults.flatMap(({ route }) => route ? [route] : []);
              }
              return { drivingRoutes, fallbackDestinationIndexes, missingLegs };
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
          const { drivingRoutes, fallbackDestinationIndexes, missingLegs } = routeResult;
          if (!drivingRoutes.length && routeCache.current?.promise === cachedRoute) routeCache.current = null;
          if (cancelled) return;
          const travelTimes = travelTimesForRoutes(routeStops, drivingRoutes, fallbackDestinationIndexes, missingLegs);
          if (!drivingRoutes.length) {
            if (routeChanged) onTravelTimesChange(travelTimes);
            throw new Error('ルートが見つかりませんでした');
          }
          if (routeChanged) onTravelTimesChange(travelTimes);
          const routeCasingOptions = { strokeColor: '#303841', strokeOpacity: 0.42, strokeWeight: 8, zIndex: 1 };
          const routeLegs = routeLegsForDisplay(
            routeStops,
            drivingRoutes,
            fallbackDestinationIndexes,
            (index) => routeColorForIndex(index, varyRouteColors),
          );
          const visibleLegs = selectedActivityId
            ? routeLegs.filter((leg) => selectedStart && leg.destinationIndex === selectedDestinationIndex)
            : selectedPreviousActivity ? [] : routeLegs;
          const routeChunks = varyRouteColors && !selectedActivityId
            ? splitOverlappingRouteLegs(visibleLegs)
            : visibleLegs.map((leg) => ({ ...leg, shared: false, sharedCount: 1, sharedIndex: 0 }));
          const routeLines = routeChunks.flatMap((chunk) => {
            if (!chunk.path?.length) return [];
            const casing = new window.google.maps.Polyline({ path: chunk.path, ...routeCasingOptions });
            const colored = new window.google.maps.Polyline({
              path: chunk.path,
              strokeColor: chunk.color,
              strokeOpacity: chunk.shared ? 0 : 1,
              strokeWeight: 5,
              zIndex: 2,
              icons: chunk.shared ? [{
                icon: { path: 'M 0,-1 0,1', strokeColor: chunk.color, strokeOpacity: 1, strokeWeight: 5, scale: 4 },
                offset: `${chunk.sharedIndex * 12}px`,
                repeat: `${chunk.sharedCount * 12}px`,
              }] : undefined,
            });
            return [casing, colored];
          });
          routeLines.forEach((routeLine) => {
            routeLine.setMap(mapRef.current);
            overlays.current.push(routeLine);
          });
          if (!selectedActivityId && !selectedPreviousActivity && !preserveBookmarkView && selectionRef.current?.type !== 'bookmark' && drivingRoutes.length === 1 && drivingRoutes[0].viewport) mapRef.current.fitBounds(drivingRoutes[0].viewport, 80);
          setRouteStatus(missingLegs.length ? 'partial' : 'ready');
        } catch (error) {
          if (cancelled) return;
          console.warn('ルートを表示できませんでした。', error);
          setRouteStatus('error');
        }
      };
      drawDrivingRoute();
    } else if (points.length > 1 && !preserveBookmarkView) {
      mapRef.current.fitBounds(bounds, 80);
    } else if (!preserveBookmarkView) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(points.length ? 14 : 12);
    }
    return () => { cancelled = true; };
  }, [apiKey, day, previousDay, mapStatus, onTravelTimesChange, selectedActivityId, selectedPreviousActivity, showBonus, showChargers, varyRouteColors, compactViewport]);

  useEffect(() => {
    bookmarkMarkers.current.forEach((marker) => marker.setMap(null));
    bookmarkMarkers.current = [];
    if (mapStatus !== 'ready' || !mapRef.current || selectedActivityId || selectedPreviousActivity) return;
    bookmarks.filter((bookmark) => Number.isFinite(bookmark.coords?.lat) && Number.isFinite(bookmark.coords?.lng))
      .forEach((bookmark) => {
        const category = bookmarkCategory(bookmark.category);
        bookmarkMarkers.current.push(createMapMarker(window.google.maps, mapRef.current, bookmark.coords, {
          className: `map-bookmark-marker bookmark-${category.id}`,
          text: category.symbol,
          title: `${category.label}の候補：${bookmark.title}`,
          onClick: () => setSelection((current) => current?.type === 'bookmark' && current.bookmarkId === bookmark.id
            ? null : { type: 'bookmark', bookmarkId: bookmark.id }),
        }));
      });
    return () => {
      bookmarkMarkers.current.forEach((marker) => marker.setMap(null));
      bookmarkMarkers.current = [];
    };
  }, [bookmarks, mapStatus, selectedActivityId, selectedPreviousActivity]);

  useEffect(() => {
    if (!focusRequest?.bookmarkId || !focusRequest?.requestId || !mapRef.current) return;
    if (handledFocusRequest.current === focusRequest.requestId) return;
    const bookmark = bookmarks.find((item) => item.id === focusRequest.bookmarkId);
    if (!bookmark || !Number.isFinite(bookmark.coords?.lat) || !Number.isFinite(bookmark.coords?.lng)) return;
    handledFocusRequest.current = focusRequest.requestId;
    setSelection({ type: 'bookmark', bookmarkId: bookmark.id });
    mapRef.current.panTo(bookmark.coords);
    if ((mapRef.current.getZoom?.() || 0) < 15) mapRef.current.setZoom(15);
  }, [bookmarks, focusRequest?.bookmarkId, focusRequest?.requestId, mapStatus]);

  const accessCard = (authorizationError = false) => (
    <div className="map-key-card">
      <span className="map-key-icon"><MapPin size={18} /></span>
      <span>
        <strong>{offline ? 'オフラインで旅程を表示しています' : authorizationError ? '地図を読み込めませんでした' : '地図を利用できません'}</strong>
        <small>{offline ? '地図・検索・ルート案内はオンライン時に利用できます' : authorizationError ? '地図の接続を確認してください' : '場所検索と地図の利用には接続が必要です'}</small>
      </span>
    </div>
  );
  const detailTravelTime = resolvedSelection?.type === 'activity'
    ? travelTimes[resolvedSelection.activityId] : null;

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
        {day.activities.slice(0, 4).filter((item, index, visible) => {
          if (!selectedActivityId) return true;
          const selectedIndex = day.activities.findIndex((activity) => activity.id === selectedActivityId);
          return item.id === selectedActivityId || (selectedIndex > 0 && item.id === day.activities[selectedIndex - 1]?.id);
        }).map((item) => {
          const index = day.activities.findIndex((activity) => activity.id === item.id);
          const color = routeColorForIndex(index, varyRouteColors);
          return (
          <button
            className={`map-pin pin-${index + 1}`}
            key={item.id}
            style={{ '--pin-color': color, color, backgroundColor: '#ffffff' }}
            onClick={() => setSelection((current) => current?.type === 'activity' && current.activityId === item.id
              ? null : { type: 'activity', activityId: item.id })}
            aria-label={item.title}
          >{index + 1}</button>
          );
        })}
        {accessCard()}
        <MapDetailCard selection={resolvedSelection} travelTime={detailTravelTime}
          onClose={() => setSelection(null)} onGuide={onGuide} onAddBookmarkToPlan={onAddBookmarkToPlan} onEditBookmark={onEditBookmark} />
      </div>
    );
  }
  return (
    <div className="google-map-shell">
      <div className="google-map" ref={mapNode} />
      {mapStatus === 'loading' && <span className="map-loading">地図を読み込んでいます…</span>}
      {mapStatus === 'error' && accessCard(true)}
      {mapStatus === 'ready' && routeStatus === 'loading' && <span className="map-loading">ルートを検索しています…</span>}
      {mapStatus === 'ready' && routeStatus === 'error' && <span className="map-loading map-route-error">ルートを表示できません</span>}
      {mapStatus === 'ready' && routeStatus === 'partial' && <span className="map-route-note">一部の移動ルートを計算できません</span>}
      <button className={`map-location-button ${locationStatus === 'ready' ? 'is-active' : ''}`} onClick={showCurrentLocation}
        aria-label="現在地を表示" title="現在地を表示" disabled={locationStatus === 'locating'}>
        {locationStatus === 'locating' ? <LoaderCircle className="location-spinner" size={19} /> : <LocateFixed size={19} />}
      </button>
      {locationStatus === 'error' && <span className="map-location-error">現在地を取得できません</span>}
      <MapDetailCard selection={resolvedSelection} travelTime={detailTravelTime}
        onClose={() => setSelection(null)} onGuide={onGuide} onAddBookmarkToPlan={onAddBookmarkToPlan} onEditBookmark={onEditBookmark} />
    </div>
  );
});

function SearchBar({ apiKey, onResult }) {
  const [query, setQuery] = useState('');
  return <PlaceSearch variant="map" value={query} onChange={setQuery} apiKey={apiKey}
    onSelect={(place) => { setQuery(place.location); onResult(place); }} />;
}

function PlanSearch({ trip, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchTripActivities(trip, query).slice(0, 12), [trip, query]);
  const hasQuery = query.trim().length > 0;
  useEffect(() => { setQuery(''); setOpen(false); }, [trip.id]);
  return <div className="plan-search" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <Search size={16} aria-hidden="true" />
    <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)} onKeyDown={(event) => {
        if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur(); }
      }} placeholder="この旅行の予定を検索" aria-label="この旅行の予定を検索" />
    {hasQuery && <button className="plan-search-clear" onClick={() => { setQuery(''); setOpen(false); }} aria-label="予定検索をクリア"><X size={15} /></button>}
    {open && hasQuery && <div className="plan-search-results">
      {results.length ? results.map((result) => <button key={`${result.day.id}:${result.activity.id}`} onClick={() => {
        setQuery(result.activity.title);
        setOpen(false);
        onSelect(result);
      }}>
        <span>{result.dayIndex + 1}日目 · {formatDay(result.day.date, { month: 'numeric', day: 'numeric' })}</span>
        <strong>{result.activity.title}</strong>
        <small>{result.activity.location || result.day.title}</small>
      </button>) : <p>この旅行には一致する予定がありません</p>}
    </div>}
  </div>;
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

function SortableStop({ item, index, count, travelTime, varyRouteColors, onEdit, onDelete, onGuide, onSelect }) {
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
          backgroundColor: '#ffffff',
          color: routeColorForIndex(index, varyRouteColors),
        }}>{index + 1}</span>
        {index < count - 1 && <span className="stop-rule" style={{ backgroundColor: routeColorForIndex(index + 1, varyRouteColors) }} />}
      </div>
      <div className="stop-copy" tabIndex="0" aria-label={`${item.title}までのルートを地図で表示`}
        onClick={(event) => { if (!event.target.closest('button, a, input, textarea, select')) onSelect(item); }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onSelect(item); }
        }}>
        {travelTime && <div className={`travel-time ${travelTime.travelMode === 'WALKING' ? 'is-walking' : 'is-driving'} ${travelTime.unavailable ? 'is-unavailable' : ''}`}
          title={travelTime.unavailable ? 'この地点までの移動ルートを計算できません。地点や移動手段を確認してください。' : undefined}>
          <strong>{travelTime.unavailable
            ? `${travelTime.travelMode === 'WALKING' ? '徒歩' : '車'}の${travelTime.requestFailed ? 'ルートを取得できません' : 'ルートなし'}`
            : `${travelTime.travelMode === 'WALKING' ? '徒歩' : '車'}で${formatTravelDuration(travelTime.durationMillis)}`}</strong>
          {!travelTime.unavailable && formatTravelDistance(travelTime.distanceMeters)
            && <small>· {formatTravelDistance(travelTime.distanceMeters)}</small>}
        </div>}
        <div className="stop-heading">
          {count > 1 && <button ref={setActivatorNodeRef} className="drag-handle" type="button"
            aria-label={`${item.title}を並べ替える`} title="ドラッグして並べ替え"
            {...attributes} {...listeners}>
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
        {item.images?.length > 0 && <div className="stop-images" aria-label={`${item.title}の写真`}>
          {item.images.map((image, imageIndex) => <PlanImage key={image.id || image.path || imageIndex} image={image} expandable />)}
        </div>}
        <button className="guide-entry" onClick={() => onGuide(item)}><BookOpen size={14} />地点ガイド</button>
      </div>
    </article>
  );
}

function PreviousDayStop({ item, varyRouteColors, onGuide, onSelect }) {
  const color = routeColorForIndex(0, varyRouteColors);
  return <article className="stop previous-day-stop">
    <div className="stop-time"><span>前日</span><strong>{item.time || '時間未定'}</strong></div>
    <div className="stop-track">
      <span className="stop-number" style={{ backgroundColor: '#ffffff', color }}>0</span>
      <span className="stop-rule" style={{ backgroundColor: color }} />
    </div>
    <div className="stop-copy" tabIndex="0" aria-label={`${item.title}を地図で表示`}
      onClick={(event) => { if (!event.target.closest('button, a')) onSelect(item, { previousDay: true }); }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
          event.preventDefault();
          onSelect(item, { previousDay: true });
        }
      }}>
      <span className="previous-day-label">前日の最終地点</span>
      <div className="stop-heading"><h3>{item.title}</h3></div>
      <p><MapPin size={13} /> {item.location || '場所未設定'}</p>
      <button className="guide-entry" onClick={() => onGuide(item)}><BookOpen size={14} />地点ガイド</button>
    </div>
  </article>;
}

function Timeline({ day, previousDay, travelTimes, varyRouteColors, onEdit, onDelete, onAdd, onReorder, onGuide, onSelect }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeItem = day.activities.find((item) => item.id === activeId);
  const previousActivity = previousDayRouteOrigin(day, previousDay);
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
      autoScroll={{ canScroll: (element) => element.classList.contains('itinerary-sheet') }}
      onDragStart={({ active }) => setActiveId(active.id)} onDragCancel={() => setActiveId(null)} onDragEnd={finishDrag}>
      <div className="timeline">
        {previousActivity && <PreviousDayStop item={previousActivity} varyRouteColors={varyRouteColors}
          onGuide={onGuide} onSelect={onSelect} />}
        {day.activities.length === 0 ? (
          <button className="empty-day" onClick={onAdd}>
            <span><Sparkles size={20} /></span>
            <strong>この日の予定を作りましょう</strong>
            <small>最初の場所や予定を追加してください。</small>
          </button>
        ) : <SortableContext items={day.activities.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {day.activities.map((item, index) => <SortableStop key={item.id} item={item} index={index}
            count={day.activities.length} travelTime={travelTimes[item.id]} varyRouteColors={varyRouteColors}
            onEdit={onEdit} onDelete={onDelete} onGuide={onGuide} onSelect={onSelect} />)}
        </SortableContext>}
        {day.activities.length > 0 && <button className="add-stop-inline" onClick={onAdd}><Plus size={16} /> 予定を追加</button>}
      </div>
      {createPortal(<DragOverlay dropAnimation={reducedMotion ? null : { duration: 230, easing: 'cubic-bezier(.2,.9,.3,1)' }}>
        {activeItem && <div className="drag-preview">
          <GripVertical size={17} />
          <span>{activeItem.time || '時間未定'}</span>
          <strong>{activeItem.title}</strong>
        </div>}
      </DragOverlay>, document.body)}
    </DndContext>
  );
}

function ItinerarySheet({ trip, day, previousDay, travelTimes, varyRouteColors, dayIndex, setDayIndex, stage, setStage, onAdd, onEdit, onDelete, onReorder, onEditDay, onGuide, onSelect, onSearchResult, undo, redo, canUndo, canRedo }) {
  const touch = useRef(null);
  const dayStripTouch = useRef(null);
  const suppressClickUntil = useRef(0);
  const sheet = useRef(null);
  const handle = useRef(null);
  const mobileDays = useRef(null);
  useLayoutEffect(() => {
    const updatePeekHeight = () => {
      if (sheet.current && handle.current && mobileDays.current) {
        const height = handle.current.offsetHeight + mobileDays.current.offsetHeight;
        sheet.current.style.setProperty('--sheet-peek-height', `${height}px`);
      }
    };
    updatePeekHeight();
    if (!window.ResizeObserver) {
      window.addEventListener('resize', updatePeekHeight);
      return () => window.removeEventListener('resize', updatePeekHeight);
    }
    const observer = new ResizeObserver(updatePeekHeight);
    observer.observe(handle.current);
    observer.observe(mobileDays.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (sheet.current) sheet.current.scrollTop = 0;
  }, [stage]);
  const onTouchStart = (event) => {
    touch.current = null;
    suppressClickUntil.current = 0;
    // Portal content, multi-touch, form controls and drag handles never move the sheet.
    if (!event.currentTarget.contains(event.target) || event.touches.length > 1) return;
    const t = event.changedTouches[0];
    const stageControl = event.target.closest?.('.sheet-handle-wrap, .mobile-day-strip');
    if (!stageControl && event.target.closest?.('button, a, input, textarea, select, .stop-images')) return;
    touch.current = { id: t.identifier, x: t.clientX, y: t.clientY, atTop: event.currentTarget.scrollTop <= 1, stageControl: Boolean(stageControl) };
  };
  const onTouchEnd = (event) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = Array.from(event.changedTouches).find((point) => point.identifier === start.id);
    if (!t || event.touches.length > 0) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // A completed swipe must not also activate a date, plan or handle via a synthesized click.
    suppressClickUntil.current = Math.max(Math.abs(dx), Math.abs(dy)) > 12 ? Date.now() + 700 : 0;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45 && !start.stageControl) {
      setDayIndex(Math.max(0, Math.min(trip.days.length - 1, dayIndex + (dx < 0 ? 1 : -1))));
    } else if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < -35 && stage === 'peek') setStage('half');
      else if (dy < -35 && stage === 'half' && start.stageControl) setStage('full');
      else if (dy > 45 && start.atTop && event.currentTarget.scrollTop <= 1 && stage === 'full') setStage('half');
      else if (dy > 45 && start.atTop && event.currentTarget.scrollTop <= 1 && stage === 'half' && start.stageControl) setStage('peek');
    }
  };
  const handleLabel = stage === 'peek' ? '旅程を半分開く' : '旅程を閉じる';
  return (
    <section ref={sheet} className={`itinerary-sheet sheet-${stage}`} data-sheet-stage={stage}
      onClickCapture={(event) => {
        if (Date.now() < suppressClickUntil.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        suppressClickUntil.current = 0;
      }}
      onTouchStart={onTouchStart} onTouchMove={(event) => { if (event.touches.length > 1) touch.current = null; }}
      onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null; }} aria-label="この日の旅程">
      <div className="sheet-control-row">
        <button ref={handle} className="sheet-handle-wrap" onClick={() => setStage(stage === 'peek' ? 'half' : 'peek')}
          aria-label={handleLabel} aria-expanded={stage !== 'peek'}><span className="sheet-handle" /></button>
        <div className="sheet-history-actions">
          <button onClick={undo} disabled={!canUndo} aria-label="元に戻す" title="元に戻す"><Undo2 size={18} /></button>
          <button onClick={redo} disabled={!canRedo} aria-label="やり直す" title="やり直す"><Redo2 size={18} /></button>
        </div>
      </div>
      <div ref={mobileDays} className="mobile-day-strip"
        onTouchStart={(event) => { dayStripTouch.current = { x: event.touches[0]?.clientX, scrollLeft: event.currentTarget.querySelector('.day-strip')?.scrollLeft || 0 }; }}
        onTouchMove={(event) => {
          const strip = event.currentTarget.querySelector('.day-strip');
          if (strip && dayStripTouch.current && event.touches.length === 1) strip.scrollLeft = dayStripTouch.current.scrollLeft + dayStripTouch.current.x - event.touches[0].clientX;
        }}
        onTouchEnd={() => { dayStripTouch.current = null; }}><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
      <div className="sheet-title-row">
        <div>
          <span className="eyebrow">{dayIndex + 1}日目 · {formatDay(day.date)}</span>
          <h2>{day.title}</h2>
          {day.note && <p>{day.note}</p>}
        </div>
        <button className="icon-button subtle" onClick={onEditDay} aria-label="この日を編集"><Pencil size={17} /></button>
      </div>
      <PlanSearch trip={trip} onSelect={onSearchResult} />
      <div className="day-arrows">
        <button aria-label="前の日" title="前の日" onClick={() => setDayIndex(Math.max(0, dayIndex - 1))} disabled={dayIndex === 0}><ChevronLeft size={17} /></button>
        <span>{dayIndex + 1} / {trip.days.length}</span>
        <button aria-label="次の日" title="次の日" onClick={() => setDayIndex(Math.min(trip.days.length - 1, dayIndex + 1))} disabled={dayIndex === trip.days.length - 1}><ChevronRight size={17} /></button>
      </div>
      <Timeline day={day} previousDay={previousDay} travelTimes={travelTimes} varyRouteColors={varyRouteColors}
        onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} onReorder={onReorder} onGuide={onGuide} onSelect={onSelect} />
    </section>
  );
}

function TripRail({ trips, selectedId, onSelect, onAdd, onDelete, onHome, open, onClose, syncStatus }) {
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
      {onHome && <button className="trip-home-button" onClick={() => { onHome(); onClose(); }}><ArrowLeft size={16} /> 旅行のホームに戻る</button>}
      <div className="rail-foot"><span>{['error', 'local'].includes(syncStatus) ? 'このブラウザに保存' : '共有ワークスペース'}</span><span className="saved-dot"><Check size={12} /> {syncStatus === 'saving' ? '同期中' : syncStatus === 'loading' ? '読み込み中' : ['error', 'local'].includes(syncStatus) ? 'ローカル' : '同期済み'}</span></div>
    </aside>
  );
}

function Modal({ title, eyebrow, onClose, children, danger }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const background = document.getElementById('root');
    const previouslyInert = background?.inert || false;
    const previousFocus = document.activeElement;
    if (background) background.inert = true;
    const firstFocus = dialogRef.current?.querySelector(danger ? '.secondary-button' : '.modal-heading button');
    firstFocus?.focus({ preventScroll: true });
    return () => {
      if (background) background.inert = previouslyInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      else document.querySelector('.rail-toggle')?.focus({ preventScroll: true });
    };
  }, [danger]);
  const containFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={dialogRef} className={`modal ${danger ? 'danger' : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={containFocus}>
        <div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={19} /></button></div>
        {children}
      </section>
    </div>, document.body
  );
}

function ActivityForm({ initial, currentDate, onSave, onMoveToBookmark, onClose, apiKey, tripId }) {
  const [form, setForm] = useState({
    time: '10:00', title: '', location: '', notes: '', coords: null, travelMode: 'DRIVING', images: [], ...initial,
    images: initial?.images || [], date: currentDate,
  });
  const [pendingImages, setPendingImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  useEffect(() => () => pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const addImages = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    const remaining = Math.max(0, 8 - form.images.length - pendingImages.length);
    const accepted = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
      && file.size <= 10 * 1024 * 1024).slice(0, remaining);
    setImageError(accepted.length === files.length ? '' : remaining === 0
      ? '写真は1つの予定につき8枚まで追加できます。'
      : 'JPEG・PNG・WebP・GIFの10MB以下の写真を選んでください。');
    setPendingImages((current) => [...current, ...accepted.map((file) => ({ id: uid(), file, preview: URL.createObjectURL(file) }))]);
  };
  const removePendingImage = (id) => setPendingImages((current) => current.filter((image) => {
    if (image.id === id) URL.revokeObjectURL(image.preview);
    return image.id !== id;
  }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    setImageError('');
    try {
      const uploaded = await Promise.all(pendingImages.map(({ file }) => uploadPlanImage(tripId, file)));
      const { date, ...activity } = form;
      onSave({ ...activity, images: [...activity.images, ...uploaded], id: activity.id || uid() }, date);
    } catch (error) {
      setImageError(error.message || '写真をアップロードできませんでした。');
      setBusy(false);
    }
  };
  const moveToBookmark = async () => {
    if (!initial?.id || !form.title.trim() || busy) return;
    setBusy(true);
    setImageError('');
    try {
      const uploaded = await Promise.all(pendingImages.map(({ file }) => uploadPlanImage(tripId, file)));
      const { date, ...activity } = form;
      onMoveToBookmark({ ...activity, images: [...activity.images, ...uploaded] });
    } catch (error) {
      setImageError(error.message || '写真をアップロードできませんでした。');
      setBusy(false);
    }
  };
  return (
    <Modal title={initial?.id ? '予定を編集' : '予定を追加'} eyebrow="この日の旅程" onClose={() => { if (!busy) onClose(); }}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field date-field"><span>日付</span><input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label className="field time-field"><span>時刻</span><input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></label>
        <label className="field title-field"><span>予定</span><input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="夕食、美術館、電車など" /></label>
        <div className="field full"><span>場所</span>
          <PlaceSearch value={form.location} apiKey={apiKey}
            onChange={(location) => setForm((current) => ({ ...current, location, coords: null }))}
            onSelect={({ location, coords }) => setForm((current) => ({ ...current, location, coords }))} />
          {form.coords && <small className="located"><Check size={12} /> 地図に追加済み</small>}
        </div>
        <fieldset className={`field travel-mode-field ${initial?.id ? '' : 'full'}`}>
          <legend>移動方法</legend>
          <div className="travel-mode-options">
            <label className={travelModeForActivity(form) === 'DRIVING' ? 'active' : ''}>
              <input type="radio" name="travelMode" value="DRIVING" checked={travelModeForActivity(form) === 'DRIVING'} onChange={() => set('travelMode', 'DRIVING')} />
              <span>車</span>
            </label>
            <label className={travelModeForActivity(form) === 'WALKING' ? 'active' : ''}>
              <input type="radio" name="travelMode" value="WALKING" checked={travelModeForActivity(form) === 'WALKING'} onChange={() => set('travelMode', 'WALKING')} />
              <span>徒歩</span>
            </label>
          </div>
          <small>この予定までの移動方法を選べます</small>
        </fieldset>
        {initial?.id && <div className="field bookmark-move-field"><span>候補として残す</span>
          <button type="button" className="bookmark-move-button" onClick={moveToBookmark} disabled={!form.title.trim() || busy}>
            <Bookmark size={17} /> ブックマークに移す
          </button>
          <small>{form.coords ? 'カテゴリを選んでから予定から外します' : '場所がない候補は地図に表示されません'}</small>
        </div>}
        <label className="field full"><span>メモ</span><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="予約情報、注意事項、注文したいものなど" rows="3" /></label>
        <div className="field full plan-photo-field"><span>写真</span>
          {(form.images.length > 0 || pendingImages.length > 0) && <div className="plan-photo-grid">
            {form.images.map((image, index) => <div className="plan-photo-item" key={image.id || image.path || index}>
              <PlanImage image={image} />
              <button type="button" onClick={() => set('images', form.images.filter((_, imageIndex) => imageIndex !== index))} aria-label={`${index + 1}枚目の写真を外す`}><X size={15} /></button>
            </div>)}
            {pendingImages.map((image, index) => <div className="plan-photo-item is-pending" key={image.id}>
              <img src={image.preview} alt={image.file.name} />
              <button type="button" onClick={() => removePendingImage(image.id)} aria-label={`追加予定の${index + 1}枚目の写真を外す`}><X size={15} /></button>
            </div>)}
          </div>}
          <label className={`plan-photo-upload ${form.images.length + pendingImages.length >= 8 ? 'is-disabled' : ''}`}>
            <input type="file" aria-label="写真を追加" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy || form.images.length + pendingImages.length >= 8} onChange={addImages} />
            <ImagePlus size={18} /><span><strong>写真を追加</strong><small>複数選択できます · 1枚10MBまで</small></span>
          </label>
          {imageError && <small className="plan-photo-error" role="alert">{imageError}</small>}
        </div>
        <div className="modal-actions full"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>キャンセル</button><button className="primary-button" disabled={busy}>{busy ? '写真を保存中…' : '予定を保存'}</button></div>
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
        <label className="field full"><span>旅行名</span><input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="例：京都で過ごす週末" /></label>
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
        <label className="field full"><span>この日のタイトル</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="field full"><span>日付</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="field full"><span>この日のメモ</span><textarea rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="過ごし方、注意事項、大切にしたいことなど" /></label>
        <button type="button" className="text-button full" onClick={onAddDay}><Plus size={16} /> この日の後に1日追加</button>
        <div className="modal-actions full"><button type="button" className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button">この日を保存 <Check size={16} /></button></div>
      </form>
    </Modal>
  );
}

function SettingsModal({ varyRouteColors, setVaryRouteColors, onClose }) {
  const [varyColors, setVaryColors] = useState(varyRouteColors);
  return (
    <Modal title="地図の設定" onClose={onClose}>
      <label className="route-color-setting">
        <input type="checkbox" checked={varyColors} onChange={(event) => setVaryColors(event.target.checked)} />
        <span className="setting-switch" aria-hidden="true"><i /></span>
        <span><strong>地点ごとにルート色を変える</strong><small>地図の区間と旅程の番号を同じ色で表示します</small></span>
      </label>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>キャンセル</button><button className="primary-button" onClick={() => { setVaryRouteColors(varyColors); onClose(); }}>設定を保存</button></div>
    </Modal>
  );
}

function PlaceActionModal({ place, existing, movingFromPlan, onSaveBookmark, onAddToPlan, onClose }) {
  const [category, setCategory] = useState(existing?.category || 'other');
  return <Modal title={movingFromPlan ? '予定をブックマークに移す' : place.title || '場所'} eyebrow="この旅行の候補" onClose={onClose}>
    {place.location && <p className="bookmark-place-address">{place.location}</p>}
    {place.notes && <p className="bookmark-place-notes">{place.notes}</p>}
    {place.images?.[0] && <PlanImage image={place.images[0]} className="bookmark-place-image" expandable />}
    {!movingFromPlan && <button className="bookmark-plan-action" onClick={onAddToPlan}><Plus size={17} /> この日の予定に追加</button>}
    <fieldset className="bookmark-category-field">
      <legend>{existing ? '保存先のカテゴリを変更' : 'ブックマークに保存'}</legend>
      <p>{movingFromPlan ? 'カテゴリを選んで保存すると、この予定を旅程から外します。' : '予定に入れる前の候補として、この旅行に保存します。'}</p>
      <div className="bookmark-category-grid">
        {BOOKMARK_CATEGORIES.map((item) => <label key={item.id} className={`bookmark-category-option bookmark-${item.id} ${category === item.id ? 'is-selected' : ''}`}>
          <input type="radio" name="bookmark-category" value={item.id} checked={category === item.id} onChange={() => setCategory(item.id)} />
          <span className="bookmark-category-symbol">{item.symbol}</span>{item.label}
        </label>)}
      </div>
    </fieldset>
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>キャンセル</button>
      <button className="primary-button" onClick={() => onSaveBookmark(category)}><Bookmark size={16} /> {movingFromPlan ? '候補に移す' : existing ? 'ブックマークを更新' : 'ブックマークに保存'}</button></div>
  </Modal>;
}

function BookmarkListModal({ trip, mapAvailable, onFocus, onEdit, onRemove, onClose }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const bookmarks = trip.bookmarks || EMPTY_BOOKMARKS;
  const visible = bookmarks.filter((bookmark) => (category === 'all' || bookmark.category === category)
    && `${bookmark.title} ${bookmark.location}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <Modal title="ブックマーク" eyebrow={trip.title} onClose={onClose}>
    <div className="bookmark-filters" aria-label="ブックマークのカテゴリ">
      {[{ id: 'all', label: `すべて ${bookmarks.length}` }, ...BOOKMARK_CATEGORIES].map((item) => <button key={item.id}
        className={category === item.id ? 'is-active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}
    </div>
    <label className="bookmark-list-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="候補を検索" aria-label="ブックマークを検索" /></label>
    {visible.length ? <ul className="bookmark-list">{visible.map((bookmark) => <li key={bookmark.id}>
      <button className="bookmark-list-place" onClick={() => onFocus(bookmark)} aria-label={`${bookmark.title}${mapAvailable && Number.isFinite(bookmark.coords?.lat) && Number.isFinite(bookmark.coords?.lng) ? 'を地図で表示' : 'の詳細を表示'}`}>
        <span className={`bookmark-category-symbol bookmark-${bookmarkCategory(bookmark.category).id}`}>{bookmarkCategory(bookmark.category).symbol}</span>
        <span><strong>{bookmark.title}</strong><small>{bookmark.location || bookmarkCategory(bookmark.category).label}</small></span>
        {mapAvailable && Number.isFinite(bookmark.coords?.lat) && Number.isFinite(bookmark.coords?.lng)
          ? <MapPin size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </button>
      <div className="bookmark-list-actions"><button onClick={() => onEdit(bookmark)}>カテゴリ変更</button><button onClick={() => onRemove(bookmark)}>削除</button></div>
    </li>)}</ul> : <p className="bookmark-empty">{bookmarks.length ? '一致する候補がありません。' : '地図上の場所や検索結果から、行きたい場所を保存できます。'}</p>}
  </Modal>;
}

function FinishedTripLanding({ trips, showPastTrips, onShowPastTrips, onOpenTrip, onCreate, loading, undo, redo, canUndo, canRedo }) {
  return <main className="finished-trip-screen">
    <div className="finished-trip-brand"><span className="brand-mark"><Navigation size={19} fill="currentColor" /></span><strong>ROAM</strong>
      {(canUndo || canRedo) && <div className="finished-trip-history">
        <button onClick={undo} disabled={!canUndo} aria-label="元に戻す" title="元に戻す"><Undo2 size={19} /></button>
        <button onClick={redo} disabled={!canRedo} aria-label="やり直す" title="やり直す"><Redo2 size={19} /></button>
      </div>}
    </div>
    <section className="finished-trip-content">
      {loading ? <p className="finished-trip-loading" role="status"><LoaderCircle size={22} className="offline-save-spinner" /> 旅行を読み込んでいます…</p>
        : showPastTrips ? <>
          <button className="finished-trip-back" onClick={() => onShowPastTrips(false)}><ArrowLeft size={17} /> 戻る</button>
          <h1>過去の旅行</h1>
          <p>見返したい旅行を選んでください。</p>
          <div className="finished-trip-list">{trips.map((trip) => <button key={trip.id} onClick={() => onOpenTrip(trip.id)}>
            <span><strong>{trip.title}</strong><small>{dateRange(trip)}</small></span><ChevronRight size={20} />
          </button>)}</div>
        </> : <>
          <span className="finished-trip-symbol"><Navigation size={30} fill="currentColor" /></span>
          <h1>{trips.length ? '予定されている旅行はありません' : '新しい旅行を始めましょう'}</h1>
          <p>{trips.length ? 'これまでの旅行を見返すか、次の旅行を作成できます。' : '日付を決めて、行きたい場所を旅程に追加しましょう。'}</p>
          <div className="finished-trip-actions">
            <button className="finished-trip-primary" onClick={onCreate}><Plus size={19} /> 新しい旅行を追加</button>
            {trips.length > 0 && <button className="finished-trip-secondary" onClick={() => onShowPastTrips(true)}>過去の旅行を見る <ChevronRight size={19} /></button>}
          </div>
        </>}
    </section>
  </main>;
}

function App() {
  const initialTrips = useMemo(() => migrateTrips(), []);
  const { trips, setTrips, undo, redo, canUndo, canRedo, syncStatus } = useSharedWorkspace(initialTrips);
  const online = useOnlineStatus();
  const bundledApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [varyRouteColors, setVaryRouteColors] = useStoredState('roam.varyRouteColors.v2', true);
  const apiKey = bundledApiKey;
  const sortedTrips = useMemo(() => sortTripsByStartDate(trips), [trips]);
  const openingSelection = useRef(selectDefaultTrip(trips, localDateISO()));
  const autoSelectOnLoad = useRef(true);
  const [selectedId, setSelectedId] = useState(openingSelection.current?.tripId ?? null);
  const [dayIndex, setDayIndex] = useState(openingSelection.current?.dayIndex ?? 0);
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [sheetStage, setSheetStage] = useState('peek');
  const [railOpen, setRailOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [travelTimes, setTravelTimes] = useState({});
  const [mapFocus, setMapFocus] = useState(null);
  const [modal, setModal] = useState(null);
  const [reader, setReader] = useState(null);
  const [offlineSave, setOfflineSave] = useState({ tripId: null, status: 'idle', message: '' });
  const trip = selectedId ? trips.find((item) => item.id === selectedId) || sortedTrips[0] : null;
  const day = trip?.days[Math.min(dayIndex, trip.days.length - 1)];
  const bookmarks = trip?.bookmarks || EMPTY_BOOKMARKS;

  const selectTrip = useCallback((id) => {
    autoSelectOnLoad.current = false;
    const nextTrip = trips.find((item) => item.id === id);
    setSelectedId(nextTrip?.id ?? null);
    setDayIndex(nextTrip ? closestDayIndex(nextTrip, localDateISO()) : 0);
    setMapFocus(null);
    setShowPastTrips(false);
  }, [trips]);

  const updateTrip = useCallback((updater) => {
    setTrips((current) => current.map((item) => item.id === trip.id ? updater(item) : item));
  }, [setTrips, trip?.id]);

  const updateDay = useCallback((updater) => {
    updateTrip((current) => ({ ...current, days: current.days.map((item, index) => index === dayIndex ? updater(item) : item) }));
  }, [updateTrip, dayIndex]);

  const saveActivity = (activity, targetDate) => {
    const sourceDayId = modal?.dayId || day.id;
    const newDayId = uid();
    const nextTrip = saveActivityOnDate(trip, sourceDayId, activity, targetDate, newDayId);
    updateTrip((current) => saveActivityOnDate(current, sourceDayId, activity, targetDate, newDayId));
    setDayIndex(nextTrip.days.findIndex((item) => item.date === targetDate));
    setModal(null);
  };
  const createTrip = (form) => {
    const firstDay = { id: uid(), date: form.startDate, title: '到着・最初の一日', note: '予定を詰めすぎず、余白を残しておきましょう。', activities: [] };
    const newTrip = { ...form, id: uid(), endDate: form.endDate || form.startDate, days: [firstDay] };
    setTrips((current) => [...current, newTrip]);
    autoSelectOnLoad.current = false;
    setSelectedId(newTrip.id);
    setDayIndex(0);
    setModal(null);
  };
  const deleteTrip = (id) => {
    if (!confirm('この旅行を削除しますか？')) return;
    const remaining = trips.filter((item) => item.id !== id);
    removeOfflineTrip(id);
    setTrips(remaining);
    if (id === selectedId) {
      autoSelectOnLoad.current = false;
      const next = selectDefaultTrip(remaining, localDateISO());
      setSelectedId(next?.tripId ?? null);
      setDayIndex(next?.dayIndex ?? 0);
    }
  };
  const addDay = () => {
    const currentDate = new Date(`${day.date}T12:00:00`);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDay = { id: uid(), date: currentDate.toISOString().slice(0, 10), title: '新しい一日', note: '', activities: [] };
    updateTrip((current) => { const days = [...current.days]; days.splice(dayIndex + 1, 0, newDay); return { ...current, days }; });
    setDayIndex(dayIndex + 1);
    setModal({ type: 'day', day: newDay });
  };
  const mapPick = useCallback((place) => setModal({ type: 'placeChoice', place }), []);
  const addBookmarkToPlan = useCallback((bookmark) => setModal({
    type: 'activity', dayId: day?.id,
    activity: { time: bookmark.time || '10:00', title: bookmark.title, location: bookmark.location, coords: bookmark.coords,
      notes: bookmark.notes || '', images: bookmark.images || [], travelMode: bookmark.travelMode || 'DRIVING',
      ...(bookmark.route === false ? { route: false } : {}) },
  }), [day?.id]);
  const editBookmark = useCallback((bookmark) => setModal({ type: 'placeChoice', place: bookmark }), []);
  const saveBookmark = (place, category) => {
    const existing = findMatchingBookmark(bookmarks, place);
    const newId = uid();
    updateTrip((current) => saveTripBookmark(current, place, category, newId));
    const coords = place.coords || existing?.coords;
    setMapFocus(Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng)
      ? { bookmarkId: existing?.id || newId, requestId: uid() } : null);
    if (window.matchMedia('(max-width: 820px)').matches) setSheetStage('peek');
    setModal(null);
  };
  const movePlanToBookmark = (place, category, source) => {
    const existing = findMatchingBookmark(bookmarks, place);
    const newId = uid();
    updateTrip((current) => moveActivityToBookmark(current, source.dayId, place, category, newId));
    const coords = place.coords || existing?.coords;
    setMapFocus(Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng)
      ? { bookmarkId: existing?.id || newId, requestId: uid() } : null);
    if (window.matchMedia('(max-width: 820px)').matches) setSheetStage('peek');
    setModal(null);
  };
  const openGuide = useCallback((activity) => setReader({ trip, activity }), [trip]);
  const saveCurrentTripOffline = async () => {
    if (!trip || offlineSave.status === 'saving') return;
    setOfflineSave({ tripId: trip.id, status: 'saving', message: 'オフライン保存を準備しています…' });
    try {
      const saved = await saveTripOffline(trip, (message) => setOfflineSave({ tripId: trip.id, status: 'saving', message }));
      const complete = isOfflineTripComplete(saved, trip);
      const missing = [
        !saved.shellReady && 'アプリ本体',
        !saved.documentsFresh && '最新のガイド',
        saved.mediaSaved !== saved.mediaTotal && `画像・添付（${saved.mediaSaved}/${saved.mediaTotal}件）`,
      ].filter(Boolean);
      setOfflineSave({
        tripId: trip.id,
        status: complete ? 'saved' : 'partial',
        message: complete
          ? 'この旅行を端末に保存しました'
          : `旅程データは保存しましたが、${missing.join('・')}を保存できませんでした。オンラインで再度お試しください`,
      });
    } catch (error) {
      setOfflineSave({ tripId: trip.id, status: 'error', message: error.message || 'オフライン保存に失敗しました' });
    }
  };

  useEffect(() => {
    if (!autoSelectOnLoad.current || syncStatus === 'loading') return;
    autoSelectOnLoad.current = false;
    const next = selectDefaultTrip(trips, localDateISO());
    setSelectedId(next?.tripId ?? null);
    setDayIndex(next?.dayIndex ?? 0);
  }, [syncStatus, trips]);
  useEffect(() => { if (dayIndex >= (trip?.days.length || 1)) setDayIndex(0); }, [trip?.days.length, dayIndex]);

  if (!trip) return <>
    <FinishedTripLanding trips={sortedTrips} showPastTrips={showPastTrips} onShowPastTrips={setShowPastTrips}
      onOpenTrip={selectTrip} onCreate={() => setModal({ type: 'trip' })} loading={online && syncStatus === 'loading'}
      undo={() => { autoSelectOnLoad.current = true; undo(); }} redo={redo} canUndo={canUndo} canRedo={canRedo} />
    {modal?.type === 'trip' && <TripForm onSave={createTrip} onClose={() => setModal(null)} />}
  </>;
  if (!day) return <div className="empty-app"><button className="primary-button" onClick={() => setTrips(seedTrips)}>旅行データを復元</button></div>;

  const storedOfflineManifest = offlineTripManifest(trip.id);
  const offlineComplete = isOfflineTripComplete(storedOfflineManifest, trip);
  const offlinePartial = Boolean(storedOfflineManifest) && !offlineComplete;
  const offlineButtonLabel = offlineComplete
    ? 'オフライン保存済み。もう一度保存'
    : offlinePartial ? 'オフライン保存を完了する' : 'この旅行をオフライン保存';

  return (
    <main className={`app-shell mobile-sheet-${sheetStage} ${railOpen ? '' : 'rail-hidden'} ${timelineOpen ? '' : 'timeline-hidden'}`}>
      <TripRail trips={sortedTrips} selectedId={trip.id} onSelect={selectTrip} onAdd={() => setModal({ type: 'trip' })} onDelete={deleteTrip}
        onHome={selectDefaultTrip(trips, localDateISO()) ? null : () => selectTrip(null)} open={railOpen} onClose={() => setRailOpen(false)} syncStatus={syncStatus} />
      {railOpen && <button className="rail-scrim" onClick={() => setRailOpen(false)} aria-label="旅行一覧を閉じる" />}
      <section className="map-stage">
        <header className="topbar">
          <button className="icon-button rail-toggle" onClick={() => setRailOpen((open) => !open)}
            aria-label={railOpen ? '旅行一覧を閉じる' : '旅行一覧を開く'} title={railOpen ? '旅行一覧を閉じる' : '旅行一覧を開く'}>
            {railOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="trip-heading"><span className="eyebrow">{dateRange(trip)}</span><h1>{trip.title}</h1><p>{trip.subtitle}</p></div>
          <button className="icon-button history-button" onClick={undo} disabled={!canUndo} aria-label="元に戻す" title="元に戻す"><Undo2 size={19} /></button>
          <button className="icon-button history-button" onClick={redo} disabled={!canRedo} aria-label="やり直す" title="やり直す"><Redo2 size={19} /></button>
          <button className="icon-button notebook-toggle" onClick={() => setReader({ trip })} aria-label="旅行ノートを開く" title="旅行ノート"><StickyNote size={20} /></button>
          <button className={`icon-button offline-save-button ${offlineComplete ? 'is-saved' : offlinePartial ? 'is-partial' : ''}`}
            onClick={saveCurrentTripOffline} disabled={!online || offlineSave.status === 'saving'}
            aria-label={offlineButtonLabel} title={online ? offlineButtonLabel : 'オンライン時に保存できます'}>
            {offlineSave.status === 'saving' && offlineSave.tripId === trip.id
              ? <LoaderCircle className="offline-save-spinner" size={19} />
              : offlineComplete ? <Check size={19} /> : offlinePartial ? <CircleAlert size={19} /> : <Download size={19} />}
          </button>
          <button className="icon-button" onClick={() => setModal({ type: 'settings' })} aria-label="地図の設定"><Settings size={19} /></button>
          <button className="icon-button timeline-toggle" onClick={() => setTimelineOpen((open) => !open)}
            aria-label={timelineOpen ? '旅程を閉じる' : '旅程を開く'} title={timelineOpen ? '旅程を閉じる' : '旅程を開く'}>
            {timelineOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </header>
        {online && <SearchBar apiKey={apiKey} onResult={mapPick} />}
        <GoogleMap apiKey={online ? apiKey : ''} day={day} previousDay={trip.days[dayIndex - 1]} bookmarks={bookmarks} onMapPick={mapPick}
          onTravelTimesChange={setTravelTimes} travelTimes={travelTimes}
          varyRouteColors={varyRouteColors} showBonus={trip.id === icelandTrip.id} showChargers focusRequest={mapFocus} offline={!online}
          compactViewport={sheetStage === 'half'}
          onGuide={openGuide} onAddBookmarkToPlan={addBookmarkToPlan} onEditBookmark={editBookmark} />
        <button className="map-bookmarks-button" onClick={() => setModal({ type: 'bookmarkList' })}
          aria-label={`ブックマークを開く（${bookmarks.length}件）`} title="この旅行のブックマーク">
          <Bookmark size={17} /><span>候補</span><strong>{bookmarks.length}</strong>
        </button>
        <div className="desktop-day-strip"><DayStrip trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} /></div>
        <div className="map-hint"><MapPin size={14} /> 名前のある場所をタップして予定・候補に追加</div>
        {offlineSave.tripId === trip.id && offlineSave.message && <div className={`offline-save-status is-${offlineSave.status}`} role="status">
          {offlineSave.status === 'saving' && <LoaderCircle className="offline-save-spinner" size={15} />}
          {offlineSave.message}
        </div>}
      </section>
      <ItinerarySheet trip={trip} day={day} previousDay={trip.days[dayIndex - 1]} travelTimes={travelTimes} varyRouteColors={varyRouteColors} dayIndex={dayIndex} setDayIndex={setDayIndex} stage={sheetStage} setStage={setSheetStage} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} onAdd={() => setModal({ type: 'activity', dayId: day.id })} onEdit={(activity) => setModal({ type: 'activity', dayId: day.id, activity })} onDelete={(id) => {
        const activity = day.activities.find((item) => item.id === id);
        if (activity) setModal({ type: 'confirmActivityDelete', activity, tripId: trip.id, dayId: day.id });
      }} onReorder={(activities) => updateDay((current) => ({ ...current, activities }))} onEditDay={() => setModal({ type: 'day', day })} onGuide={openGuide}
      onSelect={(activity, options = {}) => {
        setMapFocus({ activityId: activity.id, previousDay: options.previousDay, requestId: uid(), mode: 'toggle' });
        if (window.matchMedia('(max-width: 820px)').matches && sheetStage !== 'half') setSheetStage('peek');
      }}
      onSearchResult={({ activity, dayIndex: resultDayIndex }) => {
        setDayIndex(resultDayIndex);
        setMapFocus({ activityId: activity.id, requestId: uid(), mode: 'select' });
        if (window.matchMedia('(max-width: 820px)').matches && sheetStage !== 'half') setSheetStage('peek');
      }} />
      {reader && <React.Suspense fallback={<div className="travel-reader-backdrop" role="status">ページを開いています…</div>}><TravelReader trip={reader.trip} activity={reader.activity} onClose={() => setReader(null)} /></React.Suspense>}
      {modal?.type === 'placeChoice' && <PlaceActionModal key={modal.place.id || modal.place.placeId || `${modal.place.coords?.lat},${modal.place.coords?.lng}`}
        place={modal.place} existing={findMatchingBookmark(bookmarks, modal.place)} movingFromPlan={Boolean(modal.source)} onClose={() => setModal(null)}
        onAddToPlan={() => addBookmarkToPlan(modal.place)} onSaveBookmark={(category) => modal.source
          ? movePlanToBookmark(modal.place, category, modal.source) : saveBookmark(modal.place, category)} />}
      {modal?.type === 'bookmarkList' && <BookmarkListModal trip={trip} mapAvailable={online && Boolean(apiKey)} onClose={() => setModal(null)}
        onFocus={(bookmark) => {
          if (online && apiKey && Number.isFinite(bookmark.coords?.lat) && Number.isFinite(bookmark.coords?.lng)) {
            setMapFocus({ bookmarkId: bookmark.id, requestId: uid() });
            if (window.matchMedia('(max-width: 820px)').matches) setSheetStage('peek');
            setModal(null);
          } else editBookmark(bookmark);
        }} onEdit={editBookmark} onRemove={(bookmark) => setModal({ type: 'confirmBookmarkDelete', bookmark })} />}
      {modal?.type === 'confirmBookmarkDelete' && <Modal title="ブックマークを削除" eyebrow="削除の確認" onClose={() => setModal(null)} danger>
        <p className="delete-confirm-copy">「{modal.bookmark.title}」をこの旅行の候補から削除しますか？</p>
        <div className="modal-actions"><button className="secondary-button" onClick={() => setModal({ type: 'bookmarkList' })}>キャンセル</button>
          <button className="delete-confirm-button" onClick={() => { updateTrip((current) => removeTripBookmark(current, modal.bookmark.id)); setModal({ type: 'bookmarkList' }); }}>削除する</button></div>
      </Modal>}
      {modal?.type === 'activity' && <ActivityForm initial={modal.activity} currentDate={trip.days.find((item) => item.id === modal.dayId)?.date || day.date} onSave={saveActivity}
        onMoveToBookmark={(activity) => setModal({ type: 'placeChoice', place: activity, source: { dayId: modal.dayId } })}
        onClose={() => setModal(null)} apiKey={apiKey} tripId={trip.id} />}
      {modal?.type === 'confirmActivityDelete' && <Modal title="予定を削除" eyebrow="削除の確認" onClose={() => setModal(null)} danger>
        <p className="delete-confirm-copy">「{modal.activity.title}」を旅程から削除しますか？</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setModal(null)}>キャンセル</button>
          <button className="delete-confirm-button" onClick={() => {
            const { tripId, dayId, activity } = modal;
            setTrips((current) => current.map((item) => item.id === tripId
              ? { ...item, days: item.days.map((currentDay) => currentDay.id === dayId
                ? { ...currentDay, activities: currentDay.activities.filter((plan) => plan.id !== activity.id) }
                : currentDay) }
              : item));
            setModal(null);
          }}>削除する</button>
        </div>
      </Modal>}
      {modal?.type === 'trip' && <TripForm onSave={createTrip} onClose={() => setModal(null)} />}
      {modal?.type === 'day' && <DayForm day={modal.day} onClose={() => setModal(null)} onAddDay={addDay} onSave={(saved) => { updateDay(() => saved); setModal(null); }} />}
      {modal?.type === 'settings' && <SettingsModal varyRouteColors={varyRouteColors}
        setVaryRouteColors={setVaryRouteColors} onClose={() => setModal(null)} />}
    </main>
  );
}

const rootElement = document.getElementById('root');
const appRoot = window.__roamRoot ?? createRoot(rootElement);
window.__roamRoot = appRoot;
appRoot.render(<App />);
