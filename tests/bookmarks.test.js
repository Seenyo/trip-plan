import { describe, expect, it } from 'vitest';
import { findMatchingBookmark, removeTripBookmark, saveTripBookmark } from '../src/bookmarks';

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
});
