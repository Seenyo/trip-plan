import { describe, expect, it } from 'vitest';
import { routeLegsForDisplay, splitOverlappingRouteLegs } from '../src/routePresentation';

describe('route presentation', () => {
  it('marks only shared sections and assigns alternating dash positions', () => {
    const sharedStart = { lat: 64, lng: -21 };
    const sharedEnd = { lat: 64.001, lng: -21.001 };
    const chunks = splitOverlappingRouteLegs([
      { id: 'first', color: '#one', path: [{ lat: 63.999, lng: -20.999 }, sharedStart, sharedEnd] },
      { id: 'second', color: '#two', path: [sharedEnd, sharedStart, { lat: 64.002, lng: -20.999 }] },
    ]);
    const shared = chunks.filter((chunk) => chunk.shared);
    const solo = chunks.filter((chunk) => !chunk.shared);

    expect(shared.map((chunk) => [chunk.id, chunk.sharedCount, chunk.sharedIndex])).toEqual([
      ['first', 2, 0], ['second', 2, 1],
    ]);
    expect(solo.map((chunk) => chunk.id)).toEqual(['first', 'second']);
  });

  it('uses the aggregate route when an individual leg has no path', () => {
    const aggregatePath = [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }];
    const legs = routeLegsForDisplay(
      [{ id: 'start', activityIndex: 0 }, { id: 'middle', activityIndex: 1 }, { id: 'end', activityIndex: 2 }],
      [{ path: aggregatePath, legs: [{ path: aggregatePath }, { path: [] }] }],
      [],
      (index) => `color-${index}`,
    );

    expect(legs).toEqual([expect.objectContaining({ path: aggregatePath, destinationIndex: 1 })]);
  });
});
