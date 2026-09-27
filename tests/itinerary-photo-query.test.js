import { describe, expect, it } from 'vitest';
import { itineraryPhotoQuery } from '../src/itineraryPhotoQuery';

describe('itinerary photo matching', () => {
  it('uses a verified Icelandic name for a descriptive stop', () => {
    expect(itineraryPhotoQuery({
      id: '9636cb4c-7d52-4e73-9e09-d908215815ef', title: 'かわいい赤い教会', coords: { lat: 63.42, lng: -19 },
    }, 'iceland-ring-road-2026')).toBe('Víkurkirkja');
  });

  it('includes named Oki places but skips vague plans', () => {
    expect(itineraryPhotoQuery({ title: '白兎神社', coords: { lat: 35.55, lng: 134.2 } }, 'silver-week-oki-chugoku-2026')).toBe('白兎神社');
    expect(itineraryPhotoQuery({ title: 'どこか観光（TBD）', coords: { lat: 35.55, lng: 134.2 } }, 'silver-week-oki-chugoku-2026')).toBeNull();
  });

  it('uses the saved Google place ID for newly selected places', () => {
    expect(itineraryPhotoQuery({ title: '新しいカフェ', placeId: 'google-place-id' }, 'new-trip')).toBe('新しいカフェ');
  });
});
