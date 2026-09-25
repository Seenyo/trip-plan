// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const oldTrip = {
  id: 'old-trip', title: '思い出の旅', subtitle: '', startDate: '2020-05-01', endDate: '2020-05-01',
  days: [{
    id: 'old-day', date: '2020-05-01', title: '一日目', activities: [
      { id: 'a', time: '09:00', title: 'A地点', coords: { lat: 35, lng: 139 } },
      { id: 'b', time: '10:00', title: 'B地点', coords: { lat: 35.1, lng: 139.1 } },
      { id: 'c', time: '11:00', title: 'C地点', coords: { lat: 35.2, lng: 139.2 } },
    ],
  }],
};

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({ trips: [oldTrip], setTrips: vi.fn(), syncStatus: 'local' }),
}));

it('offers new and past trips, then preserves the half sheet when a plan is selected', async () => {
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn((query) => ({ matches: query.includes('max-width'), addListener: vi.fn(), removeListener: vi.fn() }));
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  expect(screen.getByRole('heading', { name: '予定されている旅行はありません' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '新しい旅行を追加' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByRole('dialog').querySelector('[aria-label="閉じる"]'));

  fireEvent.click(screen.getByRole('button', { name: '過去の旅行を見る' }));
  fireEvent.click(screen.getByRole('button', { name: /思い出の旅/ }));
  const sheet = document.querySelector('.itinerary-sheet');
  fireEvent.click(sheet.querySelector('.sheet-handle-wrap'));
  expect(sheet.dataset.sheetStage).toBe('half');

  fireEvent.click(screen.getByLabelText('B地点までのルートを地図で表示'));
  expect(sheet.dataset.sheetStage).toBe('half');
  expect(document.querySelector('.app-shell').classList.contains('mobile-sheet-half')).toBe(true);
  expect(document.querySelectorAll('.map-pin')).toHaveLength(2);
  const detail = document.querySelector('.activity-detail-card');
  expect(detail.querySelector('h2').textContent).toBe('B地点');
  expect(detail.querySelector('[aria-label="B地点の地点ガイドを開く"]').textContent).toBe('');

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
