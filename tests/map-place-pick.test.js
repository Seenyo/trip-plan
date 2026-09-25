import { expect, it, vi } from 'vitest';
import { namedPlaceFromMapClick } from '../src/mapPlacePick';

it('ignores blank map taps without loading place details', async () => {
  const maps = { importLibrary: vi.fn() };
  const stop = vi.fn();
  expect(await namedPlaceFromMapClick(maps, { stop, latLng: {}, placeId: undefined })).toBeNull();
  expect(stop).toHaveBeenCalledOnce();
  expect(maps.importLibrary).not.toHaveBeenCalled();
});

it('uses the selected named place and its actual location', async () => {
  const fetchFields = vi.fn(async function fetchFields() {
    this.displayName = 'Dettifoss';
    this.formattedAddress = 'Dettifoss, Iceland';
    this.location = { lat: () => 65.81, lng: () => -16.38 };
  });
  class Place { constructor({ id }) { this.id = id; this.fetchFields = fetchFields; } }
  const maps = { importLibrary: vi.fn().mockResolvedValue({ Place }) };
  expect(await namedPlaceFromMapClick(maps, { placeId: 'named-place', stop: vi.fn() })).toEqual({
    title: 'Dettifoss', location: 'Dettifoss, Iceland', coords: { lat: 65.81, lng: -16.38 },
  });
  expect(fetchFields).toHaveBeenCalledWith({ fields: ['displayName', 'formattedAddress', 'location'] });
});
