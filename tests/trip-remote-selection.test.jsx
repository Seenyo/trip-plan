// @vitest-environment jsdom
import React from 'react';
import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('../src/useSharedWorkspace', async () => {
  const React = (await import('react')).default;
  const local = [{ id: 'past', title: '過去の旅', startDate: '2020-01-01', endDate: '2020-01-01', days: [{ id: 'past-day', date: '2020-01-01', title: '過去', activities: [] }] }];
  const remote = [{ id: 'upcoming', title: '次の旅', startDate: '2099-01-01', endDate: '2099-01-02', days: [{ id: 'future-day', date: '2099-01-01', title: '出発日', activities: [] }] }];
  return {
    useSharedWorkspace: () => {
      const [state, setState] = React.useState({ trips: local, syncStatus: 'loading' });
      React.useEffect(() => { setState({ trips: remote, syncStatus: 'saved' }); }, []);
      return { ...state, setTrips: vi.fn() };
    },
  };
});

it('selects an upcoming trip after the shared workspace replaces local trips', async () => {
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });
  expect(screen.getByRole('heading', { name: '次の旅' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '出発日' })).toBeTruthy();
  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
