const normalizeText = (value = '') => value
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

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

export function searchTripActivities(trip, query) {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (!trip || !words.length) return [];
  return trip.days.flatMap((day, dayIndex) => day.activities.map((activity, activityIndex) => ({
    activity,
    activityIndex,
    day,
    dayIndex,
  }))).filter(({ activity, day }) => {
    const searchable = normalizeText([
      activity.title,
      activity.location,
      activity.notes,
      day.title,
      day.date,
    ].filter(Boolean).join(' '));
    return words.every((word) => searchable.includes(word));
  });
}

const locationLiteral = (location) => {
  if (!location) return null;
  if (typeof location.toJSON === 'function') return location.toJSON();
  const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
  const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const isBonusStore = (place) => normalizeText(place.displayName).replace(/[^a-z]/g, '').startsWith('bonus');

export async function searchBonusStores(maps, activities) {
  const coordinates = activities.map((activity) => activity.coords).filter(Boolean);
  if (!coordinates.length) return [];
  const centers = coordinates.filter((coordinate, index) => (
    coordinates.slice(0, index).every((previous) => distanceKm(previous, coordinate) > 20)
  ));
  const { Place } = await maps.importLibrary('places');
  const responses = await Promise.allSettled(centers.map((center) => Place.searchByText({
    textQuery: 'Bónus supermarket',
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
    includedType: 'supermarket',
    useStrictTypeFiltering: true,
    locationBias: { center, radius: 30000 },
    language: 'is',
    region: 'is',
    maxResultCount: 5,
  })));
  const stores = responses.flatMap((response) => response.status === 'fulfilled' ? response.value.places || [] : []);
  const unique = new Map();
  stores.forEach((place) => {
    const coords = locationLiteral(place.location);
    if (!coords || !isBonusStore(place)
      || coordinates.every((coordinate) => distanceKm(coordinate, coords) > 30)) return;
    const id = place.id || `${coords.lat},${coords.lng}`;
    if (!unique.has(id)) unique.set(id, {
      id,
      title: place.displayName || 'Bónus',
      location: place.formattedAddress || '',
      coords,
      googleMapsURI: place.googleMapsURI || '',
    });
  });
  return [...unique.values()];
}
