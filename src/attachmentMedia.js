import { attachmentUrl } from './travelDocuments';

const MEDIA_CACHE = 'roam-trip-media-v1';
const pending = new Map();
const memory = new Map();
const MEMORY_LIMIT = 20 * 1024 * 1024;
let memoryBytes = 0;
const mediaRequest = (path) => new Request(new URL(`./__offline_media__/${encodeURIComponent(path)}`, window.location.href));

export async function cachedAttachmentBlob(path) {
  if (!path) return null;
  if (memory.has(path)) {
    const blob = memory.get(path);
    memory.delete(path); memory.set(path, blob);
    return blob;
  }
  if (!('caches' in window)) return null;
  try {
    const response = await (await caches.open(MEDIA_CACHE)).match(mediaRequest(path));
    return response ? response.blob() : null;
  } catch { return null; } // Safari private mode / storage eviction.
}

export async function cacheAttachmentBlob(path, blob) {
  if (!path || !blob) return false;
  if (memory.has(path)) { memoryBytes -= memory.get(path).size; memory.delete(path); }
  if (blob.size <= MEMORY_LIMIT) { memory.set(path, blob); memoryBytes += blob.size; }
  while (memoryBytes > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    memoryBytes -= memory.get(oldest).size; memory.delete(oldest);
  }
  if ('caches' in window) {
    try {
      await (await caches.open(MEDIA_CACHE)).put(mediaRequest(path), new Response(blob, {
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      }));
      return true;
    } catch { /* A full device cache must not prevent viewing the image. */ }
  }
  return false;
}

// Paths are immutable UUIDs. Cache the bytes by path, never by expiring signed URL.
// Share pending reads/downloads between the map, itinerary, reader and offline save.
export function attachmentBlob(path) {
  if (!path) return Promise.resolve(null);
  if (pending.has(path)) return pending.get(path);
  const task = (async () => {
    const cached = await cachedAttachmentBlob(path);
    if (cached) return cached;
    if (!navigator.onLine) return null;
    const url = await attachmentUrl(path);
    if (!url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`添付ファイルを取得できませんでした（${response.status}）。`);
      const blob = await response.blob();
      await cacheAttachmentBlob(path, blob);
      return blob;
    } finally { clearTimeout(timer); }
  })().finally(() => pending.delete(path));
  pending.set(path, task);
  return task;
}
