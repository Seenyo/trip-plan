import { describe, expect, it } from 'vitest';
import {
  distanceKmBetween,
  formatTravelDistance,
  formatTravelDuration,
  previousDayRouteOrigin,
  reorderActivitiesIntoTimeSlots,
  ROUTE_POINT_COLORS,
  routeColorForIndex,
  routeTextColor,
  sortActivitiesByTime,
  sortTripsByStartDate,
  travelModeForActivity,
  travelTimesForRoutes,
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

  it('shows trips in start-date order and leaves undated trips last', () => {
    const trips = [
      { id: 'iceland', startDate: '2026-10-05' },
      { id: 'undated', startDate: '' },
      { id: 'oki', startDate: '2026-09-19' },
      { id: 'also-undated' },
    ];
    expect(sortTripsByStartDate(trips).map((trip) => trip.id)).toEqual(['oki', 'iceland', 'undated', 'also-undated']);
    expect(trips.map((trip) => trip.id)).toEqual(['iceland', 'undated', 'oki', 'also-undated']);
  });

  it('formats travel estimates for the itinerary', () => {
    expect(formatTravelDuration(42 * 60_000)).toBe('42分');
    expect(formatTravelDuration(95 * 60_000)).toBe('1時間35分');
    expect(formatTravelDistance(850)).toBe('850 m');
    expect(formatTravelDistance(12_400)).toBe('12 km');
  });

  it('defaults travel to driving and preserves an explicit walking choice', () => {
    expect(travelModeForActivity({})).toBe('DRIVING');
    expect(travelModeForActivity({ travelMode: 'DRIVING' })).toBe('DRIVING');
    expect(travelModeForActivity({ travelMode: 'WALKING' })).toBe('WALKING');
  });

  it('uses the previous day final routable stop as the next day route origin', () => {
    const hotel = { id: 'hotel', coords: { lat: 64.13, lng: -16.02 } };
    const previousDay = { activities: [
      { id: 'sight', coords: { lat: 64.08, lng: -16.23 } },
      hotel,
      { id: 'note-without-location' },
    ] };
    const day = { activities: [{ id: 'first-stop', coords: { lat: 64.25, lng: -15.21 } }] };
    expect(previousDayRouteOrigin(day, previousDay)).toBe(hotel);
    expect(distanceKmBetween(hotel.coords, day.activities[0].coords)).toBeLessThan(900);
  });

  it('does not connect days across flights or days that opt out of driving', () => {
    const tokyo = { activities: [{ id: 'haneda', coords: { lat: 35.55, lng: 139.77 } }] };
    const iceland = { activities: [{ id: 'kef', coords: { lat: 63.99, lng: -22.63 } }] };
    expect(previousDayRouteOrigin(iceland, tokyo)).toBeNull();
    expect(previousDayRouteOrigin({ ...iceland, drivingFromPrevious: false }, tokyo)).toBeNull();
  });

  it('assigns a lone successful fallback route to its actual destination', () => {
    const stops = [
      { id: 'katla' }, { id: 'svartifoss' }, { id: 'park' }, { id: 'beach' }, { id: 'hali' },
    ];
    const route = { durationMillis: 13 * 60_000, distanceMeters: 14_000, legs: [{ durationMillis: 13 * 60_000 }] };
    const times = travelTimesForRoutes(stops, [route], [4], [
      { destinationIndex: 1, requestFailed: false },
      { destinationIndex: 2, requestFailed: false },
      { destinationIndex: 3, requestFailed: true },
    ]);
    expect(times.katla).toBeUndefined();
    expect(times.svartifoss).toMatchObject({ unavailable: true, requestFailed: false });
    expect(times.beach).toMatchObject({ unavailable: true, requestFailed: true });
    expect(times.hali).toMatchObject({ durationMillis: 13 * 60_000, distanceMeters: 14_000 });
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
    expect(routeColorForIndex(1, true)).toBe('#71c3c9');
    expect(routeColorForIndex(8, true)).toBe('#ffad42');
    expect(routeTextColor(routeColorForIndex(0))).toBe('#303841');
  });

  it('keeps stop numbers readable across the route palette', () => {
    const luminance = (hexColor) => hexColor.match(/[\da-f]{2}/gi).map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (first, second) => {
      const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };

    ROUTE_POINT_COLORS.forEach((color) => {
      expect(contrast(color, routeTextColor(color))).toBeGreaterThanOrEqual(4.5);
    });
  });
});
