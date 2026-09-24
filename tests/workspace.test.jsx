// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSharedWorkspace } from '../src/useSharedWorkspace';
import { loadSharedWorkspace, saveSharedWorkspace } from '../src/supabase';
import { TO_SEPTEMBER_20, TO_SEPTEMBER_21 } from '../src/tripMigrations';

vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  loadSharedWorkspace: vi.fn(),
  saveSharedWorkspace: vi.fn(),
}));
const remote = { trips: [{ id: 'remote' }], revision: 4 };
const mount = async (options) => {
  let hook;
  await act(async () => { hook = renderHook(() => useSharedWorkspace([{ id: 'local' }]), options); });
  return hook;
};
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.resetAllMocks();
  loadSharedWorkspace.mockResolvedValue(remote);
  saveSharedWorkspace.mockResolvedValue({ revision: 5 });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('keeps failed loads local and does not try saving over unread cloud data', async () => {
  loadSharedWorkspace.mockRejectedValue(new Error('offline'));
  const { result } = await mount();
  act(() => result.current.setTrips([{ id: 'edited-locally' }]));
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(result.current.syncStatus).toBe('error');
  expect(JSON.parse(localStorage.getItem('roam.trips.v3'))).toEqual([{ id: 'edited-locally' }]);
  expect(saveSharedWorkspace).not.toHaveBeenCalled();
});

it('restores a separately saved trip when starting without a connection', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  localStorage.setItem('roam.trips.v3', JSON.stringify([{ id: 'local' }]));
  localStorage.setItem('roam.offlineTrip.v1.saved', JSON.stringify({ trip: { id: 'saved', days: [] }, savedAt: '2026-09-24T00:00:00Z' }));
  loadSharedWorkspace.mockRejectedValue(new Error('offline'));

  const { result } = await mount();

  expect(result.current.trips.map((trip) => trip.id)).toEqual(['local', 'saved']);
  expect(saveSharedWorkspace).not.toHaveBeenCalled();
});

it('migrates the corrected sightseeing days from v3 browser storage', async () => {
  loadSharedWorkspace.mockRejectedValue(new Error('offline'));
  const activity = (id) => ({ id, time: '10:00' });
  localStorage.setItem('roam.trips.v3', JSON.stringify([{ id: 'silver-week-oki-chugoku-2026', days: [
    { id: '20', date: '2026-09-20', activities: [...TO_SEPTEMBER_21.map(activity), activity('late-20')] },
    { id: '21', date: '2026-09-21', activities: [...TO_SEPTEMBER_20.map(activity), activity('domestic-car-return')] },
  ] }]));
  const { result } = await mount();
  expect(result.current.trips[0].days[0].activities.map((item) => item.id)).toEqual(['late-20', ...TO_SEPTEMBER_20]);
  expect(result.current.trips[0].days[1].activities.map((item) => item.id)).toEqual([...TO_SEPTEMBER_21, 'domestic-car-return']);
  expect(saveSharedWorkspace).not.toHaveBeenCalled();
});

it('does not write merely because a cloud workspace was loaded', async () => {
  const { result } = await mount();
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(result.current.trips).toEqual(remote.trips);
  expect(result.current.syncStatus).toBe('saved');
  expect(saveSharedWorkspace).not.toHaveBeenCalled();
});

it('reports completed saves after Strict Mode remounts effects', async () => {
  const { result } = await mount({ wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode> });
  act(() => result.current.setTrips([{ id: 'edited' }]));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(saveSharedWorkspace).toHaveBeenCalledTimes(1);
  expect(result.current.syncStatus).toBe('saved');
});

it('serializes overlapping saves and does not report an old save as current', async () => {
  let finishFirst;
  saveSharedWorkspace.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
  const { result } = await mount();
  act(() => result.current.setTrips([{ id: 'first-edit' }]));
  await act(() => vi.advanceTimersByTimeAsync(800));
  act(() => result.current.setTrips([{ id: 'second-edit' }]));
  await act(() => vi.advanceTimersByTimeAsync(800));
  expect(saveSharedWorkspace).toHaveBeenCalledTimes(1);
  expect(result.current.syncStatus).toBe('saving');
  await act(async () => finishFirst({ revision: 5 }));
  expect(saveSharedWorkspace).toHaveBeenCalledTimes(2);
  expect(saveSharedWorkspace.mock.calls[1][0]).toMatchObject({ trips: [{ id: 'second-edit' }], revision: 5 });
  expect(result.current.syncStatus).toBe('saved');
});

it('saves a revert even when an earlier edit is still being written', async () => {
  let finishFirst;
  saveSharedWorkspace.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
  const { result } = await mount();
  act(() => result.current.setTrips([{ id: 'temporary-edit' }]));
  await act(() => vi.advanceTimersByTimeAsync(800));
  act(() => result.current.setTrips(remote.trips));
  await act(() => vi.advanceTimersByTimeAsync(800));
  await act(async () => finishFirst({ revision: 5 }));
  expect(saveSharedWorkspace).toHaveBeenCalledTimes(2);
  expect(saveSharedWorkspace.mock.calls[1][0].trips).toEqual(remote.trips);
});

it('returns to saved when an edit is reverted before the debounce expires', async () => {
  const { result } = await mount();
  act(() => result.current.setTrips([{ id: 'temporary-edit' }]));
  act(() => result.current.setTrips(remote.trips));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(saveSharedWorkspace).not.toHaveBeenCalled();
  expect(result.current.syncStatus).toBe('saved');
});

it('persists local seed trips when the remote workspace has migration defaults', async () => {
  loadSharedWorkspace.mockResolvedValue({ ...remote, trips: [], revision: 1 });
  const { result } = await mount();
  expect(result.current.syncStatus).toBe('saving');
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(saveSharedWorkspace).toHaveBeenCalledTimes(1);
  expect(saveSharedWorkspace).toHaveBeenCalledWith({
    trips: [{ id: 'local' }], revision: 1,
  });
  expect(result.current.syncStatus).toBe('saved');
});
