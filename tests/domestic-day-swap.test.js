import { expect, it } from 'vitest';
import { swapDomesticActivities, TO_SEPTEMBER_20, TO_SEPTEMBER_21 } from '../scripts/swap-domestic-days.mjs';

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
