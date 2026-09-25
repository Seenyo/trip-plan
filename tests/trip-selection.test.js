import { describe, expect, it } from 'vitest';
import { closestDayIndex, localDateISO, selectDefaultTrip } from '../src/tripSelection';

const trip = (id, startDate, endDate, dates) => ({
  id, startDate, endDate, days: dates.map((date) => ({ id: date, date, activities: [] })),
});

describe('opening the closest upcoming trip and day', () => {
  it('uses the local calendar date instead of the UTC day', () => {
    expect(localDateISO(new Date(2026, 8, 25, 23, 30))).toBe('2026-09-25');
  });

  it('prefers the ongoing trip and opens its day nearest to today', () => {
    const oki = trip('oki', '2026-09-20', '2026-09-26', ['2026-09-20', '2026-09-24', '2026-09-26']);
    const iceland = trip('iceland', '2026-10-05', '2026-10-17', ['2026-10-05']);
    expect(selectDefaultTrip([iceland, oki], '2026-09-25')).toEqual({ tripId: 'oki', dayIndex: 2 });
    expect(selectDefaultTrip([iceland, oki], '2026-09-26')).toEqual({ tripId: 'oki', dayIndex: 2 });
  });

  it('skips completed trips and opens the first day of the next trip', () => {
    const oki = trip('oki', '2026-09-20', '2026-09-26', ['2026-09-20', '2026-09-26']);
    const iceland = trip('iceland', '2026-10-05', '2026-10-17', ['2026-10-05', '2026-10-07']);
    expect(selectDefaultTrip([iceland, oki], '2026-09-27')).toEqual({ tripId: 'iceland', dayIndex: 0 });
    expect(selectDefaultTrip([iceland, oki], '2026-10-18')).toBeNull();
  });

  it('chooses the nearer day, preferring a coming day in an exact tie', () => {
    const sparse = trip('sparse', '2026-10-01', '2026-10-10', ['2026-10-03', '2026-10-07']);
    expect(closestDayIndex(sparse, '2026-10-05')).toBe(1);
  });
});
