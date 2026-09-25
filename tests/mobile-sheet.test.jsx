// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { icelandTrip } from '../src/icelandTrip';

vi.mock('../src/useSharedWorkspace', () => ({
  useSharedWorkspace: () => ({ trips: [{ ...icelandTrip, days: icelandTrip.days.map((day, index) => index ? day : {
    ...day, activities: [...day.activities, { id: 'second-stop', title: '乗り継ぎ', time: '23:00' }],
  }) }], setTrips: vi.fn(), syncStatus: 'local' }),
}));

it('keeps mobile swipes and plan deletion under deliberate controls', async () => {
  vi.setSystemTime(new Date('2026-09-25T12:00:00'));
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

  const timeline = sheet.querySelector('.timeline');
  fireEvent.touchStart(timeline, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(timeline, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');

  sheet.scrollTop = 0;
  fireEvent.touchStart(timeline, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(timeline, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.dataset.sheetStage).toBe('half');

  const mobileDays = sheet.querySelector('.mobile-day-strip');
  fireEvent.touchStart(mobileDays, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(mobileDays, { changedTouches: [{ clientX: 200, clientY: 360 }] });
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

  const handle = sheet.querySelector('.sheet-handle-wrap');
  fireEvent.touchStart(handle, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('full');

  // Mobile Safari can synthesize a click after a swipe on the handle.
  fireEvent.click(handle, { detail: 1 });
  expect(sheet.dataset.sheetStage).toBe('full');

  // Native horizontal scrolling of the date strip must not change the day.
  const selectedDate = mobileDays.querySelector('[aria-selected="true"]').textContent;
  fireEvent.touchStart(mobileDays, { touches: [{ clientX: 250, clientY: 60 }], changedTouches: [{ clientX: 250, clientY: 60 }] });
  fireEvent.touchMove(mobileDays, { touches: [{ clientX: 80, clientY: 60 }] });
  fireEvent.touchEnd(mobileDays, { changedTouches: [{ clientX: 80, clientY: 60 }] });
  expect(mobileDays.querySelector('[aria-selected="true"]').textContent).toBe(selectedDate);
  expect(mobileDays.querySelector('.day-strip').scrollLeft).toBe(170);

  // A swipe on one date must not swallow a deliberate tap on another date.
  const [firstDate, nextDate] = mobileDays.querySelectorAll('[role="tab"]');
  fireEvent.touchStart(firstDate, { changedTouches: [{ clientX: 250, clientY: 60 }] });
  fireEvent.touchEnd(firstDate, { changedTouches: [{ clientX: 80, clientY: 60 }] });
  fireEvent.click(nextDate, { detail: 1 });
  expect(nextDate.getAttribute('aria-selected')).toBe('true');
  fireEvent.click(firstDate, { detail: 0 });

  sheet.scrollTop = 0;
  fireEvent.touchStart(sheet, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(sheet, { changedTouches: [{ clientX: 200, clientY: 600 }] });
  expect(sheet.dataset.sheetStage).toBe('half');

  const edit = sheet.querySelector('.stop-actions button');
  const dragHandle = sheet.querySelector('.drag-handle');
  for (const control of [edit, dragHandle]) {
    fireEvent.touchStart(control, { changedTouches: [{ clientX: 200, clientY: 650 }] });
    fireEvent.touchEnd(control, { changedTouches: [{ clientX: 200, clientY: 460 }] });
    expect(sheet.dataset.sheetStage).toBe('half');
  }

  // Pinching, cancellation and mismatched fingers cannot advance the sheet.
  fireEvent.touchStart(handle, { touches: [{ identifier: 1 }, { identifier: 2 }], changedTouches: [{ identifier: 1, clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');
  fireEvent.touchStart(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 600 }] });
  fireEvent.touchMove(handle, { touches: [{ identifier: 1 }, { identifier: 2 }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');
  fireEvent.touchStart(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 600 }] });
  fireEvent.touchCancel(handle);
  fireEvent.touchEnd(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');
  fireEvent.touchStart(handle, { changedTouches: [{ identifier: 1, clientX: 200, clientY: 600 }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ identifier: 2, clientX: 200, clientY: 360 }] });
  expect(sheet.dataset.sheetStage).toBe('half');

  fireEvent.touchStart(handle, { changedTouches: [{ clientX: 200, clientY: 360 }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ clientX: 200, clientY: 600 }] });
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
  vi.useRealTimers();
});
