import { describe, expect, it } from 'vitest';
import { BOOKMARK_CATEGORIES, findMatchingBookmark, moveActivityToBookmark, removeTripBookmark, saveTripBookmark } from '../src/bookmarks';

const place = { placeId: 'google-place-1', title: '  Café  ', location: 'Main Street', coords: { lat: 64.1, lng: -21.9 } };

describe('trip bookmarks', () => {
  it('saves candidates apart from the itinerary and updates the same Google place', () => {
    const trip = { id: 'iceland', days: [{ activities: [{ id: 'planned' }] }] };
    const saved = saveTripBookmark(trip, place, 'food', 'bookmark-1');
    expect(saved.bookmarks).toEqual([{ id: 'bookmark-1', placeId: 'google-place-1', title: 'Café', location: 'Main Street', coords: place.coords, category: 'food' }]);
    expect(saved.days).toBe(trip.days);
    const updated = saveTripBookmark(saved, { ...place, title: 'Cafe' }, 'other', 'bookmark-2');
    expect(updated.bookmarks).toHaveLength(1);
    expect(updated.bookmarks[0]).toMatchObject({ id: 'bookmark-1', title: 'Cafe', category: 'other' });
  });

  it('matches saved places by ID and removes only the selected candidate', () => {
    const trip = saveTripBookmark({ bookmarks: [] }, place, 'nature', 'first');
    expect(findMatchingBookmark(trip.bookmarks, { placeId: place.placeId })).toMatchObject({ id: 'first' });
    expect(removeTripBookmark(trip, 'first').bookmarks).toEqual([]);
    expect(trip.bookmarks).toHaveLength(1);
  });

  it('offers supermarket and heritage categories and moves a located plan without losing its details', () => {
    expect(BOOKMARK_CATEGORIES.map(({ label }) => label)).toContain('スーパー');
    expect(BOOKMARK_CATEGORIES.map(({ label }) => label)).toContain('遺跡');
    const activity = { id: 'stop-1', title: '古い教会', location: 'アイスランド', coords: { lat: 64, lng: -21 },
      time: '11:00', notes: '入口を確認', images: [{ path: 'trip/photo' }], travelMode: 'WALKING' };
    const trip = { id: 'iceland', days: [{ id: 'day-1', activities: [activity, { id: 'stop-2' }] }] };
    const moved = moveActivityToBookmark(trip, 'day-1', activity, 'heritage', 'bookmark-1');
    expect(moved.days[0].activities.map(({ id }) => id)).toEqual(['stop-2']);
    expect(moved.bookmarks[0]).toMatchObject({ title: '古い教会', category: 'heritage', notes: '入口を確認',
      images: [{ path: 'trip/photo' }], time: '11:00', travelMode: 'WALKING' });
    expect(trip.days[0].activities).toHaveLength(2);
    expect(moveActivityToBookmark(trip, 'day-1', { ...activity, coords: null }, 'heritage', 'bookmark-2').bookmarks[0].coords).toBeNull();
  });
});
