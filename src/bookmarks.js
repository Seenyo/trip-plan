import { distanceKmBetween } from './itineraryUtils';

export const BOOKMARK_CATEGORIES = [
  { id: 'food', label: 'ご飯', symbol: '食', color: '#dc7350' },
  { id: 'nature', label: '自然', symbol: '自', color: '#599b68' },
  { id: 'facility', label: '施設', symbol: '施', color: '#7979b7' },
  { id: 'supermarket', label: 'スーパー', symbol: 'ス', color: '#4e9f9a' },
  { id: 'heritage', label: '遺跡', symbol: '遺', color: '#a98054' },
  { id: 'object', label: 'オブジェ', symbol: 'オ', color: '#cf7795' },
  { id: 'other', label: 'その他', symbol: '他', color: '#688b9f' },
];

export const CUSTOM_CATEGORY_COLORS = ['#4e9f9a', '#dc7350', '#7979b7', '#d19b44', '#599b68', '#cf7795'];

export const bookmarkCategoriesForTrip = (trip) => [
  ...BOOKMARK_CATEGORIES,
  ...(Array.isArray(trip?.bookmarkCategories) ? trip.bookmarkCategories.filter((item) => (
    typeof item.id === 'string' && item.id.startsWith('custom-')
    && typeof item.label === 'string' && item.label.trim()
    && /^#[\da-f]{6}$/i.test(item.color)
  )) : []),
];

export const bookmarkCategory = (id, categories = BOOKMARK_CATEGORIES) => categories.find((item) => item.id === id)
  || BOOKMARK_CATEGORIES.find((item) => item.id === 'other');

export function addBookmarkCategory(trip, label, color, id) {
  const name = label.trim();
  if (!name || name.length > 16) throw new Error('カテゴリ名は1〜16文字で入力してください。');
  if (bookmarkCategoriesForTrip(trip).some((item) => item.label.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('同じ名前のカテゴリがあります。');
  }
  if (!CUSTOM_CATEGORY_COLORS.includes(color)) throw new Error('カテゴリの色を選んでください。');
  return {
    ...trip,
    bookmarkCategories: [...(trip.bookmarkCategories || []), { id, label: name, symbol: Array.from(name)[0], color }],
  };
}

export const findMatchingBookmark = (bookmarks = [], place) => bookmarks.find((bookmark) => (
  (place.id && bookmark.id === place.id)
  || (place.placeId && bookmark.placeId === place.placeId)
  || (!place.placeId && !bookmark.placeId && distanceKmBetween(bookmark.coords, place.coords) < 0.05)
));

export function saveTripBookmark(trip, place, category, newId) {
  if (!place?.title?.trim()) return trip;
  const bookmarks = trip.bookmarks || [];
  const existing = findMatchingBookmark(bookmarks, place);
  const bookmark = {
    id: existing?.id || newId,
    placeId: place.placeId || existing?.placeId || null,
    title: place.title.trim(),
    location: place.location || '',
    coords: place.coords || existing?.coords || null,
    category: bookmarkCategory(category, bookmarkCategoriesForTrip(trip)).id,
    ...Object.fromEntries(['notes', 'images', 'time', 'travelMode', 'route'].filter((key) => place[key] !== undefined || existing?.[key] !== undefined)
      .map((key) => [key, place[key] ?? existing[key]])),
  };
  return {
    ...trip,
    bookmarks: existing
      ? bookmarks.map((item) => item.id === existing.id ? bookmark : item)
      : [...bookmarks, bookmark],
  };
}

export function moveActivityToBookmark(trip, dayId, activity, category, newId) {
  const day = trip.days.find((item) => item.id === dayId);
  if (!day?.activities.some((item) => item.id === activity.id)
    || !activity.title?.trim()) return trip;
  const withBookmark = saveTripBookmark(trip, activity, category, newId);
  return {
    ...withBookmark,
    days: withBookmark.days.map((item) => item.id === dayId
      ? { ...item, activities: item.activities.filter((plan) => plan.id !== activity.id) }
      : item),
  };
}

export const removeTripBookmark = (trip, bookmarkId) => ({
  ...trip,
  bookmarks: (trip.bookmarks || []).filter((bookmark) => bookmark.id !== bookmarkId),
});
