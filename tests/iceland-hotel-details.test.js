import { describe, expect, it } from 'vitest';
import { appendHotelDetails, hotelResearchDate, icelandHotelDetails } from '../scripts/iceland-hotel-details.mjs';

describe('Iceland hotel details', () => {
  it('covers all ten hotel timeline entries with the requested practical fields', () => {
    expect(Object.keys(icelandHotelDetails)).toHaveLength(10);
    for (const details of Object.values(icelandHotelDetails)) {
      const labels = details.rows.map(([label]) => label);
      expect(labels).toEqual(expect.arrayContaining(['部屋・ベッド', 'お風呂・トイレ', '朝食', 'キッチン', 'ランドリー']));
      expect(details.sections.some(([title]) => title === 'EV充電')).toBe(true);
      expect(details.sources.length).toBeGreaterThan(0);
    }
  });

  it('keeps sensitive booking credentials out of the shared guide data', () => {
    const content = JSON.stringify(icelandHotelDetails);
    expect(content).not.toMatch(/[\w.+-]+@gmail\.com/i);
    expect(content).not.toMatch(/予約番号[:：]|暗証番号[:：]|lockbox is:/i);
  });

  it('replaces its own blocks cleanly when reapplied', () => {
    const activityId = 'iceland-efra-sel';
    const document = {
      activity_id: activityId,
      title: 'old',
      blocks: [
        { id: 'intro', type: 'text', text: 'intro' },
        { id: 'sources', type: 'heading', text: '出典・最新情報' },
      ],
    };
    const once = appendHotelDetails(document, icelandHotelDetails[activityId]);
    const twice = appendHotelDetails(once, icelandHotelDetails[activityId]);
    expect(twice).toEqual(once);
    expect(twice.blocks.filter((block) => block.id === `hotel.${hotelResearchDate}.${activityId}.summary`)).toHaveLength(1);
  });
});
