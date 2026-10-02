// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PlanImage from '../src/PlanImage';
import { attachmentBlob } from '../src/attachmentMedia';
vi.mock('../src/attachmentMedia', () => ({ attachmentBlob: vi.fn(), cachedAttachmentBlob: vi.fn() }));
vi.mock('../src/travelDocuments', () => ({ ATTACHMENT_URL_TTL_SECONDS: 3600, attachmentUrl: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  document.body.innerHTML = '<div id="root"></div>';
  attachmentBlob.mockResolvedValue(new Blob(['photo']));
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.IntersectionObserver; });

it('uses a thumbnail until expanded and traps focus without selecting a plan', async () => {
  const selectPlan = vi.fn();
  render(<div onClick={selectPlan}><PlanImage image={{ path: 'trip/full', thumbnailPath: 'trip/thumb', alt: '滝の写真' }} expandable /></div>, { container: document.getElementById('root') });
  const thumbnail = await screen.findByRole('button', { name: '滝の写真を拡大' });
  await waitFor(() => expect(thumbnail.disabled).toBe(false));
  expect(attachmentBlob).toHaveBeenCalledWith('trip/thumb');
  expect(attachmentBlob).not.toHaveBeenCalledWith('trip/full');
  thumbnail.focus();
  fireEvent.click(thumbnail);
  await waitFor(() => expect(attachmentBlob).toHaveBeenCalledWith('trip/full'));
  expect(selectPlan).not.toHaveBeenCalled();
  expect(document.getElementById('root').inert).toBe(true);
  const close = screen.getByRole('button', { name: '写真を閉じる' });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(thumbnail);
  expect(document.getElementById('root').inert).toBe(false);
});

it('does not reload successful blobs on resume, reconnection or elapsed time', async () => {
  const { unmount } = render(<PlanImage image="trip/photo" />);
  await screen.findByRole('img');
  fireEvent.focus(window); fireEvent.online(window); fireEvent(document, new Event('visibilitychange'));
  await act(async () => {});
  expect(attachmentBlob).toHaveBeenCalledTimes(1);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

it('ignores a late old-image response and never shows it for the new path', async () => {
  let finish;
  attachmentBlob.mockImplementation(path => path === 'old' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(new Blob(['new'])));
  const { rerender } = render(<PlanImage image="old" />);
  rerender(<PlanImage image="new" />);
  await screen.findByRole('img');
  await act(async () => finish(new Blob(['old'])));
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
});

it('retries missing offline images when the connection returns', async () => {
  attachmentBlob.mockResolvedValueOnce(null);
  render(<PlanImage image="trip/offline" />);
  await screen.findByLabelText('写真を読み込めません');
  fireEvent.online(window);
  await screen.findByRole('img');
  expect(attachmentBlob).toHaveBeenCalledTimes(2);
});

it('falls back to the cached full image when the thumbnail is unavailable', async () => {
  attachmentBlob.mockImplementation(path => Promise.resolve(path==='thumb'?null:new Blob(['full'])));
  render(<PlanImage image={{ path:'full', thumbnailPath:'thumb' }} />);
  await screen.findByRole('img');
  expect(attachmentBlob.mock.calls.map(([path])=>path)).toEqual(['thumb','full']);
});

it('does not fetch offscreen thumbnails before intersection', async () => {
  let intersect;
  window.IntersectionObserver = class { constructor(callback) { intersect=callback; } observe() {} disconnect() {} };
  render(<PlanImage image="offscreen" />);
  expect(attachmentBlob).not.toHaveBeenCalled();
  await act(async () => intersect([{ isIntersecting:true }]));
  await screen.findByRole('img');
  expect(attachmentBlob).toHaveBeenCalledWith('offscreen');
});
