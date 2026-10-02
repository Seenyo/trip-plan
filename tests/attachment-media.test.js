// @vitest-environment jsdom
import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/travelDocuments', () => ({ attachmentUrl: vi.fn(async () => 'https://example.com/signed') }));
import { attachmentUrl } from '../src/travelDocuments';
let media, entries, store;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubGlobal('Blob', NodeBlob);
  entries = new Map();
  store = {
    match: vi.fn(async request => entries.get(request.url)?.clone()),
    put: vi.fn(async (request,response) => entries.set(request.url,response)),
  };
  vi.stubGlobal('caches', { open: vi.fn(async () => store) });
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  vi.stubGlobal('fetch',vi.fn(async () => new Response('bytes',{headers:{'Content-Type':'image/webp'}})));
  media=await import('../src/attachmentMedia');
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('uses an existing offline cache online without signing or downloading', async () => {
  const key=new URL('./__offline_media__/trip%2Fphoto',window.location.href).href;
  entries.set(key,new Response('saved',{headers:{'Content-Type':'image/webp'}}));
  const blob=await media.attachmentBlob('trip/photo');
  expect(await blob.text()).toBe('saved');
  expect(attachmentUrl).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('deduplicates concurrent consumers and reuses bytes after a module reload', async () => {
  const [a,b]=await Promise.all([media.attachmentBlob('photo'),media.attachmentBlob('photo')]);
  expect(a).toBe(b); expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.put).toHaveBeenCalledTimes(1);
  vi.resetModules();
  const reloaded=await import('../src/attachmentMedia');
  expect(await (await reloaded.attachmentBlob('photo')).text()).toBe('bytes');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('displays a downloaded image even when Safari rejects persistent caching', async () => {
  store.match.mockRejectedValue(new Error('Storage unavailable'));
  store.put.mockRejectedValue(new Error('Quota exceeded'));
  const first=await media.attachmentBlob('photo');
  expect(await first.text()).toBe('bytes');
  expect(await media.attachmentBlob('photo')).toBe(first);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await media.cacheAttachmentBlob('photo',first)).toBe(false);
});
it('never caches failed HTTP responses and permits a later successful retry', async () => {
  fetch.mockResolvedValueOnce(new Response('expired',{status:403}));
  await expect(media.attachmentBlob('photo')).rejects.toThrow('403');
  expect(store.put).not.toHaveBeenCalled();
  expect(await (await media.attachmentBlob('photo')).text()).toBe('bytes');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('returns missing media offline without making a network request', async () => {
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
  expect(await media.attachmentBlob('missing')).toBeNull();
  expect(fetch).not.toHaveBeenCalled(); expect(attachmentUrl).not.toHaveBeenCalled();
});

it('allows a progressing download to take longer than fifteen seconds', async () => {
  vi.useFakeTimers();
  let signal;
  fetch.mockImplementationOnce(async (_url, options) => {
    signal = options.signal;
    await new Promise(resolve => setTimeout(resolve, 20000));
    return new Response('slow photo');
  });
  const download = media.attachmentBlob('slow');
  await vi.advanceTimersByTimeAsync(16000);
  expect(signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(4000);
  expect(await (await download).text()).toBe('slow photo');
  await vi.advanceTimersByTimeAsync(media.ATTACHMENT_DOWNLOAD_TIMEOUT_MS);
  expect(signal.aborted).toBe(false);
});

it('still aborts stalled downloads after the longer timeout', async () => {
  vi.useFakeTimers();
  fetch.mockImplementationOnce((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const outcome = media.attachmentBlob('stalled').catch(error => error);
  await vi.advanceTimersByTimeAsync(media.ATTACHMENT_DOWNLOAD_TIMEOUT_MS);
  expect((await outcome).name).toBe('AbortError');
  expect(store.put).not.toHaveBeenCalled();
});
