export async function namedPlaceFromMapClick(maps, event) {
  event.stop?.();
  if (!event.placeId) return null;
  try {
    const { Place } = await maps.importLibrary('places');
    const place = new Place({ id: event.placeId });
    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
    const title = place.displayName?.trim();
    if (!title || !place.location) return null;
    return {
      title,
      location: place.formattedAddress || title,
      coords: { lat: place.location.lat(), lng: place.location.lng() },
    };
  } catch {
    return null;
  }
}
