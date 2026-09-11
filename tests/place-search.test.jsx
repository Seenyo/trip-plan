// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PlaceSearch from '../src/PlaceSearch';
const geocode = vi.fn();
const place = (name) => ({ place_id: name, formatted_address: name, geometry: { location: { lat: () => 64, lng: () => -21 } } });
beforeEach(() => { vi.useFakeTimers(); geocode.mockReset(); window.google = { maps: { Geocoder: class { geocode = geocode; } } }; });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.google; });
it('offers all results and only sets coordinates after the user selects one', async () => {
  geocode.mockResolvedValue({ results: [place('Reykjavík'), place('Reykjanes')] });
  const onSelect = vi.fn();
  render(<PlaceSearch value="Reyk" onChange={() => {}} onSelect={onSelect} apiKey="test" />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '場所を検索' })));
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reykjanes' }));
  expect(onSelect).toHaveBeenCalledWith({ location: 'Reykjanes', coords: { lat: 64, lng: -21 } });
  expect(screen.queryByRole('list')).toBeNull();
});
it('ignores old responses when the query changes', async () => {
  let resolveOld;
  geocode.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  const props = { onChange: () => {}, onSelect: vi.fn(), apiKey: 'test' };
  const view = render(<PlaceSearch {...props} value="Old" />);
  fireEvent.click(screen.getByRole('button', { name: '場所を検索' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New' } });
  view.rerender(<PlaceSearch {...props} value="New" />);
  await act(async () => resolveOld({ results: [place('Old result')] }));
  expect(screen.queryByText('Old result')).toBeNull();
  geocode.mockResolvedValue({ results: [place('New result')] });
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(screen.getByRole('button', { name: 'New result' })).toBeTruthy();
});
it('handles failed searches without submitting the enclosing activity form', async () => {
  geocode.mockRejectedValue(new Error('offline'));
  const submit = vi.fn();
  render(<form onSubmit={submit}><PlaceSearch value="Test" onChange={() => {}} onSelect={() => {}} apiKey="test" /></form>);
  await act(async () => fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
});
