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

import { saveTripOffline } from '../src/offlineTrip';

beforeEach(() => {
  localStorage.clear();
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
