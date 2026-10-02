// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Photos from '../src/GooglePlacePhotos';
import { loadPlacePhotos } from '../src/placePhotos';

vi.mock('../src/placePhotos', () => ({ loadPlacePhotos: vi.fn() }));
afterEach(() => { delete window.google; vi.resetAllMocks(); });
it('renders no Google images and never starts retrieval when Maps is ready', () => {
  window.google = { maps: {} };
  for (const variant of ['card', 'modal']) {
    const { container, unmount } = render(<Photos item={{ id: 'stop', title: '滝', placeId: 'place' }} photoQuery="滝" variant={variant} />);
    expect(container.innerHTML).toBe('');
    unmount();
  }
  expect(loadPlacePhotos).not.toHaveBeenCalled();
});
