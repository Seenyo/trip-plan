// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';

const documents = vi.hoisted(() => ({
  cacheDocuments: vi.fn(),
  cachedDocuments: vi.fn(),
  loadDocuments: vi.fn(),
}));

vi.mock('../src/travelDocuments', () => ({
  attachmentUrl: vi.fn(),
  cacheDocuments: documents.cacheDocuments,
  cachedDocuments: documents.cachedDocuments,
  loadDocuments: documents.loadDocuments,
}));

vi.mock('../src/attachmentMedia', () => ({ attachmentBlob: vi.fn(async () => new Blob(['photo'])), cacheAttachmentBlob: vi.fn(async () => true), cachedAttachmentBlob: vi.fn() }));
import { attachmentBlob, cacheAttachmentBlob } from '../src/attachmentMedia';
import { saveTripOffline } from '../src/offlineTrip';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  cacheAttachmentBlob.mockResolvedValue(true);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  documents.cachedDocuments.mockReset().mockReturnValue([]);
  documents.loadDocuments.mockReset().mockResolvedValue([]);
  documents.cacheDocuments.mockReset().mockReturnValue(true);
});

it('does not mark downloaded documents fresh when the device cache rejects them', async () => {
  documents.cacheDocuments.mockReturnValue(false);

  const saved = await saveTripOffline({ id: 'trip', days: [] });

  expect(documents.cacheDocuments).toHaveBeenCalledWith('trip', []);
  expect(saved.documentsFresh).toBe(false);
});

it('includes photos retained on bookmarks in the offline download', async () => {
  const saved = await saveTripOffline({ id: 'trip', days: [], bookmarks: [
    { id: 'candidate', images: [{ path: 'trip/bookmark-photo' }] },
  ] });
  expect(saved.mediaTotal).toBe(1);
});

it('saves both variants and deduplicates photos shared by stops, bookmarks and guides', async () => {
  documents.loadDocuments.mockResolvedValue([{ id:'guide', revision:1, blocks:[{ type:'image', path:'full', thumbnailPath:'thumb' }] }]);
  const image={path:'full',thumbnailPath:'thumb'};
  const trip={id:'trip',days:[{activities:[{images:[image]}]}],bookmarks:[{images:[image]}]};
  const saved=await saveTripOffline(trip);
  expect(saved.mediaTotal).toBe(2); expect(saved.mediaSaved).toBe(2);
  expect(attachmentBlob.mock.calls.map(([path])=>path)).toEqual(['full','thumb']);
});
it('does not report durable offline saving when the device rejects the cache', async () => {
  cacheAttachmentBlob.mockResolvedValue(false);
  const saved=await saveTripOffline({id:'trip',days:[{activities:[{images:[{path:'full'}]}]}]});
  expect(saved.mediaTotal).toBe(1); expect(saved.mediaSaved).toBe(0);
});
