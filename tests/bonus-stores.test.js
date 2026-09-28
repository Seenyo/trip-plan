import { expect, it } from 'vitest';
import { icelandBonusStores } from '../src/bonusStores';

it('includes all 33 official Bónus branches across Iceland with distinct map positions', () => {
  expect(icelandBonusStores).toHaveLength(33);
  expect(new Set(icelandBonusStores.map((store) => store.id)).size).toBe(33);
  expect(new Set(icelandBonusStores.map((store) => `${store.coords.lat},${store.coords.lng}`)).size).toBe(33);
  expect(icelandBonusStores.map((store) => store.title)).toEqual(expect.arrayContaining([
    'Bónus Fitjar', 'Bónus Larsenstræti', 'Bónus Miðvangur', 'Bónus Skeiði', 'Bónus Miðstræti 20',
  ]));
  for (const store of icelandBonusStores) {
    expect(store.coords.lat).toBeGreaterThan(63);
    expect(store.coords.lat).toBeLessThan(67);
    expect(store.coords.lng).toBeGreaterThan(-25);
    expect(store.coords.lng).toBeLessThan(-13);
    expect(store.googleMapsURI).toContain('https://www.google.com/maps/search/?api=1&query=');
  }
});
