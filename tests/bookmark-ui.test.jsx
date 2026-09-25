// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({
    trips: [{
      id: 'trip', title: '旅', subtitle: '', startDate: '2026-10-01', endDate: '2026-10-01',
      days: [{ id: 'day', date: '2026-10-01', title: '一日目', activities: [] }],
      bookmarks: [{ id: 'saved', placeId: 'place-1', title: '森のカフェ', location: 'アイスランド', coords: { lat: 64, lng: -21 }, category: 'food' }],
    }],
    setTrips: vi.fn(), syncStatus: 'local',
  }),
}));

it('lists saved candidates by category and opens their details offline', async () => {
  vi.setSystemTime(new Date('2026-09-25T12:00:00'));
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  expect(screen.getByRole('button', { name: '森のカフェの詳細を表示' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '自然' }));
  expect(screen.queryByRole('button', { name: '森のカフェの詳細を表示' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'ご飯' }));
  fireEvent.click(screen.getByRole('button', { name: '森のカフェの詳細を表示' }));
  expect(screen.getByRole('heading', { name: '森のカフェ' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: /ご飯/ }).checked).toBe(true);

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.useRealTimers();
});
