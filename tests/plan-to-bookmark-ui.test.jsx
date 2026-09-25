// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => {
    const [trips, setTrips] = React.useState([{
      id: 'trip', title: '旅', subtitle: '', startDate: '2026-10-01', endDate: '2026-10-01',
      days: [{ id: 'day', date: '2026-10-01', title: '一日目', activities: [
        { id: 'plan', title: '古い教会', time: '11:00', location: 'アイスランド', coords: { lat: 64, lng: -21 }, notes: '入口を確認' },
      ] }],
    }]);
    return { trips, setTrips, undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false, syncStatus: 'local' };
  },
}));

it('moves an edited plan into the chosen bookmark category', async () => {
  vi.setSystemTime(new Date('2026-09-25T12:00:00'));
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  fireEvent.click(screen.getByRole('button', { name: '古い教会を編集' }));
  fireEvent.click(screen.getByRole('button', { name: 'ブックマークに移す' }));
  expect(await screen.findByRole('heading', { name: '予定をブックマークに移す' })).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /遺跡/ }));
  fireEvent.click(screen.getByRole('button', { name: '候補に移す' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: '古い教会を編集' })).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'ブックマークを開く（1件）' }));
  fireEvent.click(screen.getByRole('button', { name: '遺跡' }));
  expect(screen.getByRole('button', { name: '古い教会の詳細を表示' })).toBeTruthy();

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.useRealTimers();
});
