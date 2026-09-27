// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

it('navigates full-screen place photos with arrows, keyboard and swipe while updating credits', async () => {
  window.google = { maps: {} };
  const photos = [1, 2, 3].map((number) => ({
    url: `https://example.com/thumb-${number}.jpg`,
    fullUrl: `https://example.com/full-${number}.jpg`,
    googleMapsURI: `https://maps.google.com/photo-${number}`,
    authors: [{ name: `Photographer ${number}`, uri: `https://maps.google.com/author-${number}` }],
  }));
  loadPlacePhotos.mockResolvedValue(photos);
  render(<PlacePhotos item={{ id: 'place', title: '滝', placeId: 'google-place' }} />);

  fireEvent.click(await screen.findByRole('button', { name: '滝の写真 1を拡大' }));
  const viewer = screen.getByRole('dialog', { name: '写真を拡大表示' });
  expect(viewer.querySelector('img').src).toBe(photos[0].fullUrl);
  expect(viewer.querySelector('.image-viewer-count').textContent).toBe('1 / 3');

  fireEvent.click(screen.getByRole('button', { name: '次の写真' }));
  expect(viewer.querySelector('img').src).toBe(photos[1].fullUrl);
  expect(viewer.querySelector('.image-viewer-footer').textContent).toContain('Photographer 2');
  fireEvent.keyDown(screen.getByRole('button', { name: '写真を閉じる' }), { key: 'ArrowLeft' });
  expect(viewer.querySelector('img').src).toBe(photos[0].fullUrl);

  fireEvent.touchStart(viewer, { touches: [{ clientX: 250, clientY: 200 }] });
  fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 100, clientY: 200 }] });
  expect(viewer.querySelector('img').src).toBe(photos[1].fullUrl);
  fireEvent.click(screen.getByRole('button', { name: '前の写真' }));
  fireEvent.click(screen.getByRole('button', { name: '前の写真' }));
  expect(viewer.querySelector('img').src).toBe(photos[2].fullUrl);
  expect(viewer.querySelector('.image-viewer-footer').textContent).toContain('Photographer 3');
});
