// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { icelandTrip } from '../src/icelandTrip';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({ trips: [icelandTrip], setTrips: vi.fn(), syncStatus: 'local' }),
}));

it('keeps mobile swipes and plan deletion under deliberate controls', async () => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });
  const sheet = document.querySelector('.itinerary-sheet');
  const app = document.querySelector('.app-shell');

  expect(sheet.dataset.sheetStage).toBe('peek');

  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');
  expect(app.classList.contains('mobile-sheet-half')).toBe(true);

  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('full');
  expect(app.classList.contains('mobile-sheet-full')).toBe(true);

  sheet.scrollTop = 100;
  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.dataset.sheetStage).toBe('full');

  sheet.scrollTop = 0;
  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.dataset.sheetStage).toBe('half');

  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.dataset.sheetStage).toBe('peek');

  fireEvent.click(sheet.querySelector('.sheet-handle-wrap'));
  expect(sheet.dataset.sheetStage).toBe('half');
  fireEvent.click(sheet.querySelector('.sheet-handle-wrap'));
  expect(sheet.dataset.sheetStage).toBe('peek');

  fireEvent.click(document.querySelector('[aria-label="羽田空港を出発を削除"]'));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(document.getElementById('root').inert).toBe(true);
  const confirmButton = dialog.querySelector('.delete-confirm-button');
  confirmButton.focus();
  fireEvent.keyDown(confirmButton, { key: 'Tab' });
  expect(document.activeElement).toBe(dialog.querySelector('.modal-heading button'));
  fireEvent.click(dialog.querySelector('.secondary-button'));
  expect(document.getElementById('root').inert).toBe(false);
  expect(document.querySelector('[aria-label="羽田空港を出発を削除"]')).toBeTruthy();

  await act(async () => { window.__roamRoot.unmount(); });
  delete window.__roamRoot;
});
