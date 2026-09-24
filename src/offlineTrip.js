import { attachmentUrl, cacheDocuments, cachedDocuments, loadDocuments } from './travelDocuments';

const MEDIA_CACHE = 'roam-trip-media-v1';
const manifestKey = (tripId) => `roam.offlineTrip.v1.${tripId}`;
const mediaRequest = (path) => new Request(new URL(`./__offline_media__/${encodeURIComponent(path)}`, window.location.href));

export function offlineTripManifest(tripId) {
  try { return JSON.parse(localStorage.getItem(manifestKey(tripId)) || 'null'); } catch { return null; }
}

function manifestMatchesTrip(manifest, currentTrip) {
  if (!manifest?.trip || !currentTrip) return false;
  try { return JSON.stringify(manifest?.trip) === JSON.stringify(currentTrip); } catch { return false; }
}

function documentsSnapshot(documents) {
  return JSON.stringify((documents || []).map((document) => ({
    id: document.id,
    revision: document.revision || 0,
    attachments: (document.blocks || [])
      .filter((block) => ['image', 'file'].includes(block.type) && block.path)
      .map((block) => ({ id: block.id, type: block.type, path: block.path }))
      .sort((a, b) => `${a.id}:${a.path}`.localeCompare(`${b.id}:${b.path}`)),
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

export function isOfflineTripComplete(
  manifest,
  currentTrip = manifest?.trip,
  currentDocuments = currentTrip?.id ? cachedDocuments(currentTrip.id) : [],
) {
  return Boolean(
    manifest?.shellReady
    && manifest.documentsFresh
    && Number.isInteger(manifest.mediaTotal)
    && Number.isInteger(manifest.mediaSaved)
    && manifest.mediaSaved === manifest.mediaTotal
    && manifestMatchesTrip(manifest, currentTrip)
    && manifest.documentsSnapshot === documentsSnapshot(currentDocuments)
  );
}

export function removeOfflineTrip(tripId) {
  try { localStorage.removeItem(manifestKey(tripId)); return true; } catch { return false; }
}

export function offlineTripSnapshots() {
  const prefix = 'roam.offlineTrip.v1.';
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key) => key?.startsWith(prefix))
    .flatMap((key) => {
      try { return JSON.parse(localStorage.getItem(key))?.trip || []; } catch { return []; }
    });
}

export async function offlineAttachmentBlob(path) {
  if (!path || !('caches' in window)) return null;
  const response = await (await caches.open(MEDIA_CACHE)).match(mediaRequest(path));
  return response ? response.blob() : null;
}

async function cacheAttachment(path) {
  const signedUrl = await attachmentUrl(path);
  if (!signedUrl) throw new Error('添付ファイルのURLを取得できませんでした。');
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`添付ファイルを取得できませんでした（${response.status}）。`);
  const blob = await response.blob();
  await (await caches.open(MEDIA_CACHE)).put(mediaRequest(path), new Response(blob, {
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
  }));
}

const tripMediaPaths = (trip, documents) => [...new Set([
  ...trip.days.flatMap((day) => day.activities.flatMap((activity) => (
    activity.images || []
  )).map((image) => typeof image === 'string' ? image : image?.path)),
  ...documents.flatMap((document) => document.blocks
    .filter((block) => ['image', 'file'].includes(block.type))
    .map((block) => block.path)),
].filter(Boolean))];

async function ensureShellIsReady() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return false;
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
  ]);
  return Boolean(registration?.active);
}

export async function saveTripOffline(trip, onProgress = () => {}) {
  if (!navigator.onLine) throw new Error('オフライン保存にはインターネット接続が必要です。');
  onProgress('旅程とガイドを保存しています…');
  let documents = cachedDocuments(trip.id);
  let documentsFresh = false;
  try {
    documents = await loadDocuments(trip.id);
    documentsFresh = cacheDocuments(trip.id, documents);
  } catch { /* Keep any documents already stored on this device. */ }

  const paths = tripMediaPaths(trip, documents);
  onProgress(paths.length ? `画像・添付を保存しています（0/${paths.length}）` : 'アプリをオフライン用に準備しています…');
  let mediaSaved = 0;
  for (let index = 0; index < paths.length; index += 3) {
    const results = await Promise.allSettled(paths.slice(index, index + 3).map(cacheAttachment));
    mediaSaved += results.filter((result) => result.status === 'fulfilled').length;
    onProgress(`画像・添付を保存しています（${Math.min(index + 3, paths.length)}/${paths.length}）`);
  }

  const [shellReady, persistentStorage] = await Promise.all([
    ensureShellIsReady().catch(() => false),
    navigator.storage?.persist?.().catch(() => false) || false,
  ]);
  const manifest = {
    trip,
    savedAt: new Date().toISOString(),
    documentCount: documents.length,
    documentsFresh,
    documentsSnapshot: documentsSnapshot(documents),
    mediaTotal: paths.length,
    mediaSaved,
    shellReady,
    persistentStorage: Boolean(persistentStorage),
  };
  localStorage.setItem(manifestKey(trip.id), JSON.stringify(manifest));
  return manifest;
}
