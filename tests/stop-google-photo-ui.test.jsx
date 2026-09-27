// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import StopGooglePhoto from '../src/StopGooglePhoto';
import { loadPlacePhotos } from '../src/placePhotos';

vi.mock('../src/placePhotos', () => ({ loadPlacePhotos: vi.fn() }));

afterEach(() => {
  delete window.google;
  vi.resetAllMocks();
});

it('shows only the photo in an itinerary thumbnail and credits it when enlarged', async () => {
  window.google = { maps: {} };
  const photo = {
    url: 'https://example.com/thumb.jpg',
    fullUrl: 'https://example.com/full.jpg',
    googleMapsURI: 'https://maps.google.com/photo',
    authors: [{ name: 'Photographer', uri: 'https://maps.google.com/author' }],
  };
  loadPlacePhotos.mockResolvedValue([photo]);

  const { container } = render(<StopGooglePhoto item={{ id: 'stop', title: '滝', placeId: 'place' }} photoQuery="滝" />);
  await waitFor(() => expect(screen.getByRole('button', { name: '滝のGoogle マップの写真を拡大' })).toBeTruthy());
  expect(container.querySelector('.map-place-photo-credit')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: '滝のGoogle マップの写真を拡大' }));
  const viewer = screen.getByRole('dialog', { name: '写真を拡大表示' });
  expect(viewer.querySelector('.map-place-photo-credit').textContent).toContain('Photographer');
  expect(viewer.querySelector('.map-place-photo-source').href).toBe(photo.googleMapsURI);
});
