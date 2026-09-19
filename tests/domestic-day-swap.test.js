import { expect, it } from 'vitest';
import { migrateTripsForCurrentApp, swapDomesticActivities, TO_SEPTEMBER_20, TO_SEPTEMBER_21 } from '../src/tripMigrations';
import { domesticTrip } from '../src/domesticTrip';

const activity = (id) => ({ id, title: id, time: '10:00' });
const trip = { id: 'silver-week-oki-chugoku-2026', days: [
  { id: '20', date: '2026-09-20', activities: [activity('arrival'), activity('domestic-car-pickup'), ...TO_SEPTEMBER_21.map(activity), activity('cf29e932-048c-4b5d-91c5-d50cba7d3336')] },
  { id: '21', date: '2026-09-21', activities: [...TO_SEPTEMBER_20.map(activity), activity('domestic-car-return'), activity('stay')] },
] };

it('swaps the requested stops while preserving their order and the surrounding plans', () => {
  const result = swapDomesticActivities(trip);
  expect(result.days[0].activities.map((a) => a.id)).toEqual(['arrival', 'domestic-car-pickup', ...TO_SEPTEMBER_20, 'cf29e932-048c-4b5d-91c5-d50cba7d3336']);
  expect(result.days[1].activities.map((a) => a.id)).toEqual([...TO_SEPTEMBER_21, 'domestic-car-return', 'stay']);
  expect(result.days[0].title).toBe('鳥取観光');
  expect(result.days[1].title).toBe('出雲観光から境港へ');
  expect(swapDomesticActivities(result)).toBe(result);
});

it('migrates an old browser workspace and leaves unrelated or incomplete trips intact', () => {
  const unrelated = { id: 'another-trip', days: [] };
  const incomplete = { id: trip.id, days: [{ date: '2026-09-20', activities: [] }] };
  const result = migrateTripsForCurrentApp([unrelated, trip, incomplete]);
  expect(result[0]).toBe(unrelated);
  expect(result[1].days[0].activities.map((a) => a.id)).toContain(TO_SEPTEMBER_20[0]);
  expect(result[2]).toBe(incomplete);
});

it('ships the corrected days in the browser fallback', () => {
  const september20 = domesticTrip.days.find((day) => day.date === '2026-09-20');
  const september21 = domesticTrip.days.find((day) => day.date === '2026-09-21');
  expect(september20.activities.map((activity) => activity.id)).toEqual([
    'domestic-yonago-arrival-bus', '773e14a9-c78e-47ff-abac-2ace7867ef51', 'domestic-car-pickup',
    ...TO_SEPTEMBER_20, 'cf29e932-048c-4b5d-91c5-d50cba7d3336',
  ]);
  expect(september21.activities.map((activity) => activity.id).slice(0, 3)).toEqual(TO_SEPTEMBER_21);
  expect(swapDomesticActivities(domesticTrip)).toBe(domesticTrip);
});
