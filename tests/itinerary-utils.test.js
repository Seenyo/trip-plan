import { describe, expect, it } from 'vitest';
import { formatTravelDistance, formatTravelDuration, sortActivitiesByTime } from '../src/itineraryUtils';

describe('itinerary helpers', () => {
  it('reorders edited activities by time and leaves unscheduled items last', () => {
    const activities = [
      { id: 'lunch', time: '12:00' },
      { id: 'unscheduled', time: '' },
      { id: 'museum', time: '09:30' },
    ];
    expect(sortActivitiesByTime(activities).map((item) => item.id)).toEqual(['museum', 'lunch', 'unscheduled']);
  });

  it('formats travel estimates for the itinerary', () => {
    expect(formatTravelDuration(42 * 60_000)).toBe('42分');
    expect(formatTravelDuration(95 * 60_000)).toBe('1時間35分');
    expect(formatTravelDistance(850)).toBe('850 m');
    expect(formatTravelDistance(12_400)).toBe('12 km');
  });
});
