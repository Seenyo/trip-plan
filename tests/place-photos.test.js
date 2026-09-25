import { describe, expect, it, vi } from 'vitest';
import { loadPlacePhotos } from '../src/placePhotos';

const photo = (name, uri = `https://maps.google.com/photo/${name}`) => ({
  googleMapsURI: uri,
  authorAttributions: [{ displayName: '撮影者', uri: 'https://maps.google.com/profile', photoURI: 'https://maps.google.com/avatar' }],
  getURI: vi.fn(() => `https://maps.google.com/image/${name}`),
});

describe('Google place photos', () => {
  it('loads only two attributable photos from a saved place ID', async () => {
    const photos = [photo('one'), photo('two'), photo('three')];
    const fetchFields = vi.fn(async function fetch() { this.photos = photos; });
    class Place { constructor({ id }) { this.id = id; this.fetchFields = fetchFields; } }
    const maps = { importLibrary: vi.fn(async () => ({ Place })) };
    const result = await loadPlacePhotos(maps, { title: '滝', placeId: 'google-id' });
    expect(fetchFields).toHaveBeenCalledWith({ fields: ['photos'] });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ googleMapsURI: photos[0].googleMapsURI, authors: [{ name: '撮影者' }] });
    expect(photos[0].getURI).toHaveBeenCalledWith({ maxWidth: 480 });
    expect(photos[2].getURI).not.toHaveBeenCalled();
  });

  it('searches legacy stops by name and coordinates, rejecting distant matches', async () => {
    const near = { location: { lat: () => 64.0, lng: () => -21.0 }, photos: [photo('near')], fetchFields: vi.fn() };
    const far = { location: { lat: () => 65.0, lng: () => -21.0 }, photos: [photo('far')], fetchFields: vi.fn() };
    class Place {}
    Place.searchByText = vi.fn(async () => ({ places: [far, near] }));
    const maps = { importLibrary: vi.fn(async () => ({ Place })) };
    expect(await loadPlacePhotos(maps, { title: '滝', coords: { lat: 64, lng: -21 } })).toHaveLength(1);
    expect(near.fetchFields).toHaveBeenCalledWith({ fields: ['photos'] });
    expect(far.fetchFields).not.toHaveBeenCalled();
    expect(Place.searchByText).toHaveBeenCalledWith(expect.objectContaining({ textQuery: '滝', maxResultCount: 3 }));

    Place.searchByText.mockResolvedValueOnce({ places: [far] });
    expect(await loadPlacePhotos(maps, { title: '滝', coords: { lat: 64, lng: -21 } })).toEqual([]);
  });

  it('does not display photos without a direct Google Maps source', async () => {
    const source = { photos: [photo('hidden', ''), photo('shown')], fetchFields: vi.fn() };
    class Place { constructor() { return source; } }
    const result = await loadPlacePhotos({ importLibrary: async () => ({ Place }) }, { title: '場所', placeId: 'id' });
    expect(result).toHaveLength(1);
    expect(result[0].googleMapsURI).toBe('https://maps.google.com/photo/shown');
  });

  it('reuses a matched place ID without keeping photo URLs', async () => {
    let photoNumber = 0;
    class Place {
      constructor({ id } = {}) { this.id = id; this.location = { lat: 60.2, lng: -19.4 }; }
      async fetchFields() { this.photos = [photo(`fresh-${++photoNumber}`)]; }
    }
    Place.searchByText = vi.fn(async () => ({ places: [new Place({ id: 'matched-id' })] }));
    const maps = { importLibrary: async () => ({ Place }) };
    const item = { title: 'Unique Lagoon', coords: { lat: 60.2, lng: -19.4 } };
    const first = await loadPlacePhotos(maps, item);
    const second = await loadPlacePhotos(maps, item);
    expect(Place.searchByText).toHaveBeenCalledTimes(1);
    expect(first[0].url).not.toBe(second[0].url);
  });
});
