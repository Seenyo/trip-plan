import { expect, it, vi } from 'vitest';
import { loadPlacePhotos } from '../src/placePhotos';

it('never imports Maps or requests photos, including saved and legacy places', async () => {
  const maps = { importLibrary: vi.fn(() => { throw new Error('API must not be called'); }) };
  for (const item of [{ title: '滝', placeId: 'saved-id' }, { title: '滝', coords: { lat: 64, lng: -21 } }]) {
    expect(await loadPlacePhotos(maps, item, 12)).toEqual([]);
  }
  expect(maps.importLibrary).not.toHaveBeenCalled();
});
