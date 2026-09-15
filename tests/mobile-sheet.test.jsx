// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { icelandTrip } from '../src/icelandTrip';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({ trips: [icelandTrip], setTrips: vi.fn(), syncStatus: 'local' }),
}));

it('opens on an upward swipe, stays open while scrolling plans, and closes from the handle', async () => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });
  const sheet = document.querySelector('.itinerary-sheet');

  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  expect(sheet.classList.contains('sheet-open')).toBe(true);

  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.classList.contains('sheet-open')).toBe(true);

  fireEvent.click(sheet.querySelector('.sheet-handle-wrap'));
  expect(sheet.classList.contains('sheet-open')).toBe(false);
  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
});
