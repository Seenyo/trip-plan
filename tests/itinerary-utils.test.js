import { describe, expect, it } from 'vitest';
import {
  formatTravelDistance,
  formatTravelDuration,
  reorderActivitiesIntoTimeSlots,
  routeColorForIndex,
  sortActivitiesByTime,
} from '../src/itineraryUtils';

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

  it('moves activities through the existing chronological time slots', () => {
    const activities = [
      { id: 'A', time: '05:00' },
      { id: 'B', time: '10:00' },
      { id: 'C', time: '11:00' },
      { id: 'D', time: '13:00' },
      { id: 'E', time: '15:00' },
    ];
    expect(reorderActivitiesIntoTimeSlots(activities, 3, 1)).toEqual([
      { id: 'A', time: '05:00' },
      { id: 'D', time: '10:00' },
      { id: 'B', time: '11:00' },
      { id: 'C', time: '13:00' },
      { id: 'E', time: '15:00' },
    ]);
  });

  it('uses one route color by default and point colors when enabled', () => {
    expect(routeColorForIndex(0)).toBe('#ffad42');
    expect(routeColorForIndex(4)).toBe('#ffad42');
    expect(routeColorForIndex(0, true)).toBe('#ffad42');
    expect(routeColorForIndex(1, true)).toBe('#4f9298');
    expect(routeColorForIndex(8, true)).toBe('#ffad42');
  });
});
