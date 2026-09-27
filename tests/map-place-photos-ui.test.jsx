// @vitest-environment jsdom
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PlacePhotos from '../src/GooglePlacePhotos';
import { loadPlacePhotos } from '../src/placePhotos';

vi.mock('../src/placePhotos', () => ({ loadPlacePhotos: vi.fn() }));

afterEach(() => {
  delete window.google;
  vi.resetAllMocks();
});

it('keeps the map card compact when a place has no Google photos', async () => {
  window.google = { maps: {} };
  loadPlacePhotos.mockResolvedValue([]);
  const item = { id: 'place', title: '場所', placeId: 'google-place' };
  const { container } = render(<PlacePhotos item={item} />);

  await waitFor(() => expect(loadPlacePhotos).toHaveBeenCalled());
  await waitFor(() => expect(container.querySelector('.map-place-photos')).toBeNull());
});
