import { distanceKmBetween } from './itineraryUtils';

// Place IDs may be reused; photo objects and URLs must be fetched fresh.
const matchedPlaceIds = new Map();

const coordinatesOf = (location) => {
  if (!location) return null;
  const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
  const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

export async function loadPlacePhotos(maps, item, limit = 2) {
  if (!maps || !item?.title || (!item.placeId && ![item.coords?.lat, item.coords?.lng].every(Number.isFinite))) return [];
  const { Place } = await maps.importLibrary('places');
  let place;
  if (item.placeId) {
    place = new Place({ id: item.placeId });
  } else {
    const key = `${item.title}\u0000${item.coords.lat},${item.coords.lng}`;
    const savedId = matchedPlaceIds.get(key);
    if (savedId) place = new Place({ id: savedId });
    else {
      const { places = [] } = await Place.searchByText({
        textQuery: item.title,
        fields: ['id', 'location'],
        locationBias: { center: item.coords, radius: 2000 },
        maxResultCount: 3,
      });
      place = places.find((candidate) => distanceKmBetween(item.coords, coordinatesOf(candidate.location)) <= 2);
      if (!place) return [];
      if (place.id) matchedPlaceIds.set(key, place.id);
    }
  }
  await place.fetchFields({ fields: ['photos'] });
  return (place.photos || []).filter((photo) => photo.googleMapsURI).slice(0, limit).map((photo) => ({
    url: photo.getURI({ maxWidth: 480 }),
    googleMapsURI: photo.googleMapsURI,
    authors: (photo.authorAttributions || []).map((author) => ({
      name: author.displayName || '',
      uri: author.uri || '',
      photoURI: author.photoURI || '',
    })),
  }));
}
