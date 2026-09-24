import { expect, it } from 'vitest';
import { guides } from '../scripts/guide-content.mjs';
import { appendReviewTrends, reviewTrends } from '../scripts/review-trend-enrichment.mjs';

it('targets existing guides and keeps every review trend source linkable', () => {
  expect(Object.keys(reviewTrends)).toHaveLength(39);
  for (const [id, additions] of Object.entries(reviewTrends)) {
    expect(guides[id], id).toBeTruthy();
    for (const addition of additions) {
      expect(addition.text.length).toBeGreaterThan(60);
      expect(addition.sources.length).toBeGreaterThan(0);
      for (const source of addition.sources) expect(new URL(source.url).protocol).toBe('https:');
    }
  }
});

it('adds review trends before the source heading and is idempotent', () => {
  const document = {
    activity_id: 'iceland-blue-lagoon',
    blocks: [{ id: 'intro', type: 'text', text: '既存のガイド' }, { id: 'sources', type: 'heading', text: '出典・最新情報' }],
  };
  const next = appendReviewTrends(document, reviewTrends['iceland-blue-lagoon']);
  expect(next.blocks[0]).toEqual(document.blocks[0]);
  expect(next.blocks.at(-1).type).toBe('link');
  expect(next.blocks.some((block) => block.text === 'レビューで多い傾向（2026-09-24確認）')).toBe(true);
  expect(appendReviewTrends(next, reviewTrends['iceland-blue-lagoon'])).toEqual(next);
});
