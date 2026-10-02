// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAttachmentMedia } from '../src/useAttachmentMedia';
import { attachmentBlob, cachedAttachmentBlob } from '../src/attachmentMedia';
import { attachmentUrl, attachmentUrlExpiresAt, attachmentUrlValidUntil } from '../src/travelDocuments';

vi.mock('../src/attachmentMedia', () => ({ attachmentBlob: vi.fn(), cachedAttachmentBlob: vi.fn() }));
vi.mock('../src/travelDocuments', () => ({
  attachmentUrl: vi.fn(), attachmentUrlExpiresAt: vi.fn(), attachmentUrlValidUntil: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  URL.createObjectURL = vi.fn(() => 'blob:cached');
  URL.revokeObjectURL = vi.fn();
  cachedAttachmentBlob.mockResolvedValue(null);
  attachmentUrlExpiresAt.mockImplementation(() => Date.now() + 3300000);
  attachmentUrlValidUntil.mockImplementation(() => Date.now() + 3600000);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('recovers an initial transient download failure without a focus or online event', async () => {
  attachmentBlob.mockRejectedValueOnce(new Error('Temporary network failure'))
    .mockResolvedValue(new Blob(['photo']));
  const { result } = renderHook(() => useAttachmentMedia('photo'));
  await act(async () => {});
  expect(result.current.failed).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(result.current.url).toBe('blob:cached');
  expect(attachmentBlob).toHaveBeenCalledTimes(2);
});

it('bounds automatic retries and cancels them when the view closes', async () => {
  attachmentBlob.mockRejectedValue(new Error('Unavailable'));
  const { unmount } = renderHook(() => useAttachmentMedia('photo'));
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(attachmentBlob).toHaveBeenCalledTimes(4);
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(attachmentBlob).toHaveBeenCalledTimes(4);
  unmount();
  const next = renderHook(() => useAttachmentMedia('other'));
  await act(async () => {});
  next.unmount();
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(attachmentBlob).toHaveBeenCalledTimes(5);
});

it('keeps a valid PDF link through a failed renewal and retries automatically', async () => {
  attachmentUrl.mockResolvedValueOnce('https://example.com/old')
    .mockRejectedValueOnce(new Error('Temporary signing failure'))
    .mockResolvedValue('https://example.com/new');
  const { result } = renderHook(() => useAttachmentMedia('booking.pdf', { download: false }));
  await act(async () => {});
  await act(async () => vi.advanceTimersByTimeAsync(3300000));
  expect(result.current).toMatchObject({ url: 'https://example.com/old', failed: false });
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(result.current.url).toBe('https://example.com/new');
  expect(attachmentUrl).toHaveBeenCalledTimes(3);
});

it('removes a PDF link only after actual expiry if renewal retries are exhausted', async () => {
  attachmentUrl.mockResolvedValueOnce('https://example.com/old').mockRejectedValue(new Error('Unavailable'));
  const { result } = renderHook(() => useAttachmentMedia('booking.pdf', { download: false }));
  await act(async () => {});
  await act(async () => vi.advanceTimersByTimeAsync(3599999));
  expect(result.current.url).toBe('https://example.com/old');
  expect(attachmentUrl).toHaveBeenCalledTimes(5);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(result.current).toMatchObject({ url: null, failed: true });
});

it('does not run automatic network retries while offline', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  attachmentBlob.mockResolvedValue(null);
  renderHook(() => useAttachmentMedia('photo'));
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(attachmentBlob).toHaveBeenCalledTimes(1);
});
