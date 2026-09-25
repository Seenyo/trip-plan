// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => ({ trips: null }));

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => {
    const [trips, setTrips] = React.useState([{
      id: 'trip', title: '旅', subtitle: '', startDate: '2026-10-01', endDate: '2026-10-01',
      days: [{ id: 'day', date: '2026-10-01', title: '一日目', activities: [] }],
      bookmarks: [{ id: 'saved', placeId: 'place-1', title: '温泉候補', location: 'アイスランド', coords: { lat: 64, lng: -21 }, category: 'other' }],
    }]);
    workspace.trips = trips;
    return { trips, setTrips, undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false, syncStatus: 'local' };
  },
}));

it('creates a trip category from the bookmark list and applies it to a saved place', async () => {
  vi.setSystemTime(new Date('2026-09-25T12:00:00'));
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  expect(screen.getByRole('button', { name: 'オブジェ' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'カテゴリ追加' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'カテゴリ名' }), { target: { value: '温泉' } });
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '温泉' })).toBeTruthy());
  expect(workspace.trips[0].bookmarkCategories[0]).toMatchObject({ label: '温泉', symbol: '温' });

  fireEvent.click(screen.getByRole('button', { name: '温泉候補の詳細を表示' }));
  fireEvent.click(screen.getByRole('radio', { name: /温泉/ }));
  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを更新' }));
  await waitFor(() => expect(workspace.trips[0].bookmarks[0].category).toBe(workspace.trips[0].bookmarkCategories[0].id));

  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  fireEvent.click(screen.getByRole('button', { name: 'カテゴリ変更' }));
  fireEvent.click(screen.getByRole('button', { name: '自分でカテゴリを追加' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'カテゴリ名' }), { target: { value: '朝市' } });
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /朝市/ }).checked).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを更新' }));
  await waitFor(() => expect(workspace.trips[0].bookmarks[0].category).toBe(workspace.trips[0].bookmarkCategories[1].id));

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.useRealTimers();
});
