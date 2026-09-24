import { expect, it } from 'vitest';
import { isOfflineTripComplete } from '../src/offlineTrip';

const completeManifest = {
  shellReady: true,
  documentsFresh: true,
  mediaTotal: 2,
  mediaSaved: 2,
};

it('only treats an offline trip as complete when the shell, guides, and media are ready', () => {
  expect(isOfflineTripComplete(completeManifest)).toBe(true);
  expect(isOfflineTripComplete({ ...completeManifest, shellReady: false })).toBe(false);
  expect(isOfflineTripComplete({ ...completeManifest, documentsFresh: false })).toBe(false);
  expect(isOfflineTripComplete({ ...completeManifest, mediaSaved: 1 })).toBe(false);
});

it('does not treat old or malformed offline manifests as complete', () => {
  expect(isOfflineTripComplete(null)).toBe(false);
  expect(isOfflineTripComplete({ shellReady: true, documentsFresh: true })).toBe(false);
});
