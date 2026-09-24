import { describe, expect, it, vi } from 'vitest';
import { isLodgingActivity, searchBonusStores, searchEvChargers, searchTripActivities } from '../src/planPlaces';

describe('plan place features', () => {
  it('searches only activities from the selected trip and ignores accents', () => {
    const selectedTrip = { days: [{ id: 'day-one', date: '2026-10-06', title: 'Golden Circle', activities: [
      { id: 'one', title: 'Þingvellir', location: 'アイスランド', notes: 'tectonic plates' },
      { id: 'two', title: 'Bónus', location: 'Selfoss', notes: 'food' },
    ] }] };
    const otherTrip = { days: [{ id: 'other', date: '2026-09-20', title: 'Other', activities: [
      { id: 'three', title: 'Bónus', location: 'not selected' },
    ] }] };

    expect(searchTripActivities(selectedTrip, 'bonus').map(({ activity }) => activity.id)).toEqual(['two']);
    expect(searchTripActivities(selectedTrip, 'tectonic plates').map(({ activity }) => activity.id)).toEqual(['one']);
    expect(searchTripActivities(otherTrip, 'bonus').map(({ activity }) => activity.id)).toEqual(['three']);
  });

  it('keeps nearby Bónus branches and excludes other supermarkets', async () => {
    const searchByText = vi.fn().mockResolvedValue({ places: [
      { id: 'bonus', displayName: 'Bónus Fitjar', formattedAddress: 'Keflavík', location: { lat: 64, lng: -22 }, googleMapsURI: 'https://maps.example/bonus' },
      { id: 'other', displayName: 'Krónan', formattedAddress: 'Keflavík', location: { lat: 64, lng: -22.01 } },
      { id: 'far', displayName: 'Bónus', formattedAddress: 'Far away', location: { lat: 66, lng: -18 } },
    ] });
    const maps = { importLibrary: vi.fn().mockResolvedValue({ Place: { searchByText } }) };

    const stores = await searchBonusStores(maps, [{ coords: { lat: 64, lng: -22 } }]);

    expect(stores).toEqual([{ id: 'bonus', title: 'Bónus Fitjar', location: 'Keflavík', coords: { lat: 64, lng: -22 }, googleMapsURI: 'https://maps.example/bonus' }]);
    expect(searchByText).toHaveBeenCalledWith(expect.objectContaining({ textQuery: 'Bónus supermarket', includedType: 'supermarket' }));
  });

  it('finds the three nearest EV chargers within 10 km of lodging stops', async () => {
    const searchNearby = vi.fn().mockResolvedValue({ places: [
      { id: 'near', displayName: 'ON Charging', formattedAddress: 'Höfn', location: { lat: 64.251, lng: -15.207 }, googleMapsURI: 'https://maps.example/charger' },
      { id: 'far', displayName: 'Too far', location: { lat: 65, lng: -15.2 } },
    ] });
    const maps = { importLibrary: vi.fn().mockResolvedValue({
      Place: { searchNearby }, SearchNearbyRankPreference: { DISTANCE: 'DISTANCE' },
    }) };
    const hotel = { id: 'iceland-hofn-stay', title: 'Central Stay Höfn', coords: { lat: 64.25, lng: -15.207 } };

    expect(isLodgingActivity(hotel)).toBe(true);
    expect(isLodgingActivity({ id: 'museum', title: 'Museum', coords: hotel.coords })).toBe(false);
    const chargers = await searchEvChargers(maps, [hotel, { id: 'museum', title: 'Museum', coords: hotel.coords }]);

    expect(chargers).toHaveLength(1);
    expect(chargers[0]).toMatchObject({ id: 'near', hotelId: hotel.id, hotelTitle: hotel.title });
    expect(searchNearby).toHaveBeenCalledWith(expect.objectContaining({
      includedPrimaryTypes: ['electric_vehicle_charging_station'],
      maxResultCount: 3,
      locationRestriction: { center: hotel.coords, radius: 10000 },
    }));
  });
});
