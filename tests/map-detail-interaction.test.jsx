// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { icelandTrip } from '../src/icelandTrip';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({ trips: [icelandTrip], setTrips: vi.fn(), syncStatus: 'local' }),
}));

it('highlights a timeline stop without a map card, but opens it from its pin', async () => {
  vi.setSystemTime(new Date('2026-09-25T12:00:00'));
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  const stop = document.querySelector('.sortable-stop .stop-copy');
  expect(stop).toBeTruthy();
  fireEvent.click(stop);
  expect(document.querySelector('.map-detail-card')).toBeNull();

  const pin = document.querySelector('.map-fallback .map-pin');
  expect(pin).toBeTruthy();
  fireEvent.click(pin);
  expect(document.querySelector('.map-detail-card')).toBeTruthy();
  fireEvent.click(document.querySelector('.map-detail-close'));
  expect(document.querySelector('.map-detail-card')).toBeNull();

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.useRealTimers();
});
