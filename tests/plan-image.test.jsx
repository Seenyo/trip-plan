// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PlanImage from '../src/PlanImage';
import { attachmentUrl } from '../src/travelDocuments';
import { offlineAttachmentBlob } from '../src/offlineTrip';

vi.mock('../src/travelDocuments', () => ({ ATTACHMENT_URL_TTL_SECONDS: 3600, attachmentUrl: vi.fn() }));
vi.mock('../src/offlineTrip', () => ({ offlineAttachmentBlob: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  document.body.innerHTML = '<div id="root"></div>';
  attachmentUrl.mockResolvedValue('https://example.com/photo.jpg');
  offlineAttachmentBlob.mockResolvedValue(null);
  URL.createObjectURL = vi.fn(() => 'blob:offline-photo');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('opens the full photo without selecting a plan, traps focus, and returns to its thumbnail', async () => {
  const selectPlan = vi.fn();
  render(<div onClick={selectPlan}><PlanImage image={{ path: 'trip/photo', alt: '滝の写真' }} expandable /></div>, { container: document.getElementById('root') });
  const thumbnail = await screen.findByRole('button', { name: '滝の写真を拡大' });
  thumbnail.focus();
  fireEvent.click(thumbnail);
  expect(selectPlan).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('img').src).toBe('https://example.com/photo.jpg');
  expect(attachmentUrl).toHaveBeenCalledTimes(1);
  expect(document.getElementById('root').inert).toBe(true);
  const close = screen.getByRole('button', { name: '写真を閉じる' });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(close);
  fireEvent.click(dialog.querySelector('img'));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(selectPlan).not.toHaveBeenCalled();
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(thumbnail);
  expect(document.getElementById('root').inert).toBe(false);
  fireEvent.click(thumbnail);
  fireEvent.click(screen.getByRole('dialog'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('expands cached photos offline and releases their object URL on unmount', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  offlineAttachmentBlob.mockResolvedValue(new Blob(['photo']));
  const { unmount } = render(<PlanImage image={{ path: 'trip/photo' }} expandable />);
  fireEvent.click(await screen.findByRole('button', { name: '予定の写真を拡大' }));
  expect(screen.getByRole('dialog').querySelector('img').src).toBe('blob:offline-photo');
  expect(attachmentUrl).not.toHaveBeenCalled();
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:offline-photo');
});

it('coalesces resume events and ignores a late response for an old photo', async () => {
  let resolveOld;
  attachmentUrl.mockImplementation((path) => path === 'old' ? new Promise((resolve) => { resolveOld = resolve; }) : Promise.resolve(null));
  const { rerender } = render(<PlanImage image="old" expandable />);
  fireEvent.focus(window);
  fireEvent.online(window);
  fireEvent(document, new Event('visibilitychange'));
  expect(attachmentUrl).toHaveBeenCalledTimes(1);
  offlineAttachmentBlob.mockResolvedValue(new Blob(['new']));
  rerender(<PlanImage image="new" expandable />);
  const thumbnail = await screen.findByRole('button', { name: '予定の写真を拡大' });
  await act(async () => { resolveOld('https://example.com/old.jpg'); });
  expect(thumbnail.querySelector('img').src).toBe('blob:offline-photo');
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});
