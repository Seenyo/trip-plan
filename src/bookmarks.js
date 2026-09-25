import { distanceKmBetween } from './itineraryUtils';

export const BOOKMARK_CATEGORIES = [
  { id: 'food', label: 'ご飯', symbol: '食' },
  { id: 'nature', label: '自然', symbol: '自' },
  { id: 'facility', label: '施設', symbol: '施' },
  { id: 'other', label: 'その他', symbol: '他' },
];

export const bookmarkCategory = (id) => BOOKMARK_CATEGORIES.find((item) => item.id === id)
  || BOOKMARK_CATEGORIES.at(-1);

export const findMatchingBookmark = (bookmarks = [], place) => bookmarks.find((bookmark) => (
  (place.id && bookmark.id === place.id)
  || (place.placeId && bookmark.placeId === place.placeId)
  || (!place.placeId && !bookmark.placeId && distanceKmBetween(bookmark.coords, place.coords) < 0.05)
));

export function saveTripBookmark(trip, place, category, newId) {
  if (!place?.title?.trim() || !Number.isFinite(place.coords?.lat) || !Number.isFinite(place.coords?.lng)) return trip;
  const bookmarks = trip.bookmarks || [];
  const existing = findMatchingBookmark(bookmarks, place);
  const bookmark = {
    id: existing?.id || newId,
    placeId: place.placeId || existing?.placeId || null,
    title: place.title.trim(),
    location: place.location || '',
    coords: place.coords,
    category: bookmarkCategory(category).id,
  };
  return {
    ...trip,
    bookmarks: existing
      ? bookmarks.map((item) => item.id === existing.id ? bookmark : item)
      : [...bookmarks, bookmark],
  };
}

export const removeTripBookmark = (trip, bookmarkId) => ({
  ...trip,
  bookmarks: (trip.bookmarks || []).filter((bookmark) => bookmark.id !== bookmarkId),
});
