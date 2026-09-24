// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { isOfflineTripComplete, offlineTripSnapshots, removeOfflineTrip } from '../src/offlineTrip';

const completeManifest = {
  trip: { id: 'trip', days: [] },
  shellReady: true,
  documentsFresh: true,
  mediaTotal: 2,
  mediaSaved: 2,
};

beforeEach(() => localStorage.clear());

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

it('invalidates a complete save when the current trip has changed', () => {
  const savedTrip = { id: 'iceland', days: [{ id: 'day-1', activities: [] }] };
  const manifest = { ...completeManifest, trip: savedTrip };
  expect(isOfflineTripComplete(manifest, savedTrip)).toBe(true);
  expect(isOfflineTripComplete(manifest, {
    ...savedTrip,
    days: [{ id: 'day-1', activities: [{ id: 'new-stop' }] }],
  })).toBe(false);
});

it('removes a deleted trip from offline snapshots', () => {
  localStorage.setItem('roam.offlineTrip.v1.deleted', JSON.stringify({ trip: { id: 'deleted', days: [] } }));
  expect(offlineTripSnapshots().map((trip) => trip.id)).toEqual(['deleted']);
  removeOfflineTrip('deleted');
  expect(offlineTripSnapshots()).toEqual([]);
});
