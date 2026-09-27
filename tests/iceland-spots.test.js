import { describe, expect, it } from 'vitest';
import { icelandSpotMeta } from '../src/icelandSpots';

describe('Iceland spot display metadata', () => {
  it('distinguishes two different canyon stops with the same saved title', () => {
    expect(icelandSpotMeta({ id: 'f1293f22-9bac-4206-b0f4-cc93d4fdd23e', title: '渓谷' }, 'iceland-ring-road-2026')?.localName).toBe('Múlagljúfur');
    expect(icelandSpotMeta({ id: '7db3f26d-bc64-4027-950a-63a9b443dac7', title: '渓谷' }, 'iceland-ring-road-2026')?.localName).toBe('Stuðlagil');
  });

  it('does not attach an old name or photo query after a traveller edits a stop', () => {
    expect(icelandSpotMeta({ id: 'e3adce14-46b8-477c-bd7d-f6185fcb9934', title: '別の滝' }, 'iceland-ring-road-2026')).toBeNull();
    expect(icelandSpotMeta({ id: 'e3adce14-46b8-477c-bd7d-f6185fcb9934', title: 'Brúarfoss' }, 'oki-2026')).toBeNull();
  });
});
