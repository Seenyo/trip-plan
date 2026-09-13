// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PlaceSearch from '../src/PlaceSearch';
const fetchSuggestions = vi.fn();
const place = (name, address = name) => ({
  placeId: name,
  text: { toString: () => address },
  mainText: { toString: () => name },
  secondaryText: address === name ? null : { toString: () => address },
  toPlace: () => ({
    displayName: name,
    formattedAddress: address,
    location: { lat: () => 64, lng: () => -21 },
    fetchFields: vi.fn().mockResolvedValue(undefined),
  }),
});
const mapsApi = () => ({ maps: { importLibrary: vi.fn().mockResolvedValue({
  AutocompleteSessionToken: class {},
  AutocompleteSuggestion: { fetchAutocompleteSuggestions: fetchSuggestions },
}) } });
beforeEach(() => { vi.useFakeTimers(); fetchSuggestions.mockReset(); window.google = mapsApi(); });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.google; });
it('offers all results and only sets coordinates after the user selects one', async () => {
  fetchSuggestions.mockResolvedValue({ suggestions: [place('Reykjavík'), place('Reykjanes')].map((placePrediction) => ({ placePrediction })) });
  const onSelect = vi.fn();
  render(<PlaceSearch value="Reyk" onChange={() => {}} onSelect={onSelect} apiKey="test" />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '場所を検索' })));
  expect(fetchSuggestions).toHaveBeenCalledWith(expect.objectContaining({
    input: 'Reyk',
    language: expect.any(String),
    sessionToken: expect.any(Object),
  }));
  expect(fetchSuggestions.mock.calls[0][0]).not.toHaveProperty('includedRegionCodes');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reykjanes' })));
  expect(onSelect).toHaveBeenCalledWith({ title: 'Reykjanes', location: 'Reykjanes', coords: { lat: 64, lng: -21 } });
  expect(screen.queryByRole('list')).toBeNull();
});
it('ignores old responses when the query changes', async () => {
  let resolveOld;
  fetchSuggestions.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  const props = { onChange: () => {}, onSelect: vi.fn(), apiKey: 'test' };
  const view = render(<PlaceSearch {...props} value="Old" />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '場所を検索' })));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New' } });
  view.rerender(<PlaceSearch {...props} value="New" />);
  await act(async () => resolveOld({ suggestions: [{ placePrediction: place('Old result') }] }));
  expect(screen.queryByText('Old result')).toBeNull();
  fetchSuggestions.mockResolvedValue({ suggestions: [{ placePrediction: place('New result') }] });
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(screen.getByRole('button', { name: 'New result' })).toBeTruthy();
});
it('handles failed searches without submitting the enclosing activity form', async () => {
  fetchSuggestions.mockRejectedValue(new Error('offline'));
  const submit = vi.fn();
  render(<form onSubmit={submit}><PlaceSearch value="Test" onChange={() => {}} onSelect={() => {}} apiKey="test" /></form>);
  await act(async () => fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
});
it('waits for Maps to load without opening key settings, then searches the latest query', async () => {
  const maps = window.google;
  delete window.google;
  const onRequestKey = vi.fn();
  const props = { onChange: () => {}, onSelect: vi.fn(), apiKey: 'test', onRequestKey };
  const view = render(<PlaceSearch {...props} value="" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reyk' } });
  view.rerender(<PlaceSearch {...props} value="Reyk" />);
  await act(() => vi.advanceTimersByTimeAsync(800));
  expect(onRequestKey).not.toHaveBeenCalled();
  expect(fetchSuggestions).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).toBeNull();
  fetchSuggestions.mockResolvedValue({ suggestions: [{ placePrediction: place('Reykjavík') }] });
  act(() => { window.google = maps; window.dispatchEvent(new Event('roam-maps-ready')); });
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(fetchSuggestions).toHaveBeenCalledWith(expect.objectContaining({ input: 'Reyk' }));
  expect(screen.getByRole('button', { name: 'Reykjavík' })).toBeTruthy();
});
it('only opens missing-key settings for an explicit search', async () => {
  delete window.google;
  const onRequestKey = vi.fn();
  const props = { onChange: () => {}, onSelect: vi.fn(), apiKey: '', onRequestKey };
  const view = render(<PlaceSearch {...props} value="" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reyk' } });
  view.rerender(<PlaceSearch {...props} value="Reyk" />);
  await act(() => vi.advanceTimersByTimeAsync(800));
  expect(onRequestKey).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '場所を検索' }));
  expect(onRequestKey).toHaveBeenCalledTimes(1);
});
