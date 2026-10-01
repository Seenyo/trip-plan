// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => ({ trips: null }));
vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => {
    const [trips, setTrips] = React.useState([{
      id: 'trip', title: '旅', startDate: '2026-10-01', endDate: '2026-10-01',
      days: [{ id: 'day', date: '2026-10-01', title: '一日目', activities: [] }],
      bookmarks: [{ id: 'saved', title: '森のカフェ', category: 'food', notes: '朝ごはん候補', coords: { lat: 64, lng: -21 } }],
    }]);
    workspace.trips = trips;
    return { trips, setTrips, syncStatus: 'local' };
  },
}));

it('edits and clears notes in the list and preserves drafts across category creation', async () => {
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  fireEvent.click(screen.getByRole('button', { name: 'ご飯' }));
  fireEvent.click(screen.getByRole('button', { name: '森のカフェのメモを編集' }));
  fireEvent.change(screen.getByRole('textbox', { name: '森のカフェのメモ' }), { target: { value: 'シナモンロールを食べる\nテイクアウトも可' } });
  fireEvent.click(screen.getByRole('button', { name: 'メモを保存' }));
  expect(workspace.trips[0].bookmarks[0]).toMatchObject({ category: 'food', notes: 'シナモンロールを食べる\nテイクアウトも可' });
  expect(screen.getByRole('heading', { name: 'ブックマーク' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox', { name: 'ブックマークを検索' }), { target: { value: 'シナモン' } });
  expect(screen.getByRole('button', { name: '森のカフェの詳細を表示' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox', { name: 'ブックマークを検索' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '森のカフェのメモを編集' }));
  fireEvent.change(screen.getByRole('textbox', { name: '森のカフェのメモ' }), { target: { value: 'キャンセルする編集' } });
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  expect(workspace.trips[0].bookmarks[0].notes).toContain('シナモンロール');

  fireEvent.click(screen.getByRole('button', { name: 'カテゴリ変更' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'メモ' }), { target: { value: '新カテゴリ用のメモ' } });
  fireEvent.click(screen.getByRole('button', { name: '自分でカテゴリを追加' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'カテゴリ名' }), { target: { value: '朝食' } });
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(screen.getByRole('textbox', { name: 'メモ' }).value).toBe('新カテゴリ用のメモ');
  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを更新' }));
  await waitFor(() => expect(workspace.trips[0].bookmarks[0].notes).toBe('新カテゴリ用のメモ'));

  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  fireEvent.click(screen.getByRole('button', { name: '森のカフェのメモを編集' }));
  fireEvent.change(screen.getByRole('textbox', { name: '森のカフェのメモ' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'メモを保存' }));
  expect(workspace.trips[0].bookmarks[0].notes).toBe('');

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.useRealTimers();
});
