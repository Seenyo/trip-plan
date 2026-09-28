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

export const isLodgingActivity = (activity) => Boolean(activity?.coords) && (
  activity.category === 'lodging'
  || /(?:^|-)stay(?:-|$)/i.test(activity.id || '')
  || /hotel|hostel|guesthouse|guest house|resort|lodge|igloo|宿泊|ホテル|旅館/i.test(activity.title || '')
);

export async function searchEvChargers(maps, activities) {
  const hotels = activities.filter(isLodgingActivity);
  if (!hotels.length) return [];
  const { Place, SearchNearbyRankPreference } = await maps.importLibrary('places');
  const responses = await Promise.allSettled(hotels.map(async (hotel) => {
    const result = await Place.searchNearby({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
      includedPrimaryTypes: ['electric_vehicle_charging_station'],
      locationRestriction: { center: hotel.coords, radius: 10000 },
      rankPreference: SearchNearbyRankPreference?.DISTANCE || 'DISTANCE',
      language: 'ja',
      region: 'is',
      maxResultCount: 3,
    });
    return (result.places || []).map((place) => ({ place, hotel }));
  }));
  const unique = new Map();
  responses.flatMap((response) => response.status === 'fulfilled' ? response.value : []).forEach(({ place, hotel }) => {
    const coords = locationLiteral(place.location);
    if (!coords) return;
    const distanceFromHotelKm = distanceKm(hotel.coords, coords);
    if (distanceFromHotelKm > 10) return;
    const id = place.id || `${coords.lat},${coords.lng}`;
    const current = unique.get(id);
    if (current && current.distanceFromHotelKm <= distanceFromHotelKm) return;
    unique.set(id, {
      id,
      placeId: place.id || null,
      title: place.displayName || 'EV充電スポット',
      location: place.formattedAddress || '',
      coords,
      googleMapsURI: place.googleMapsURI || '',
      hotelId: hotel.id,
      hotelTitle: hotel.title,
      distanceFromHotelKm,
    });
  });
  return [...unique.values()].sort((a, b) => a.distanceFromHotelKm - b.distanceFromHotelKm);
}
