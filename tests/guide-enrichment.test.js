import { expect, it } from 'vitest';
import { appendEnrichment, enrichments } from '../scripts/guide-enrichment.mjs';
import { guides } from '../scripts/guide-content.mjs';
it('preserves existing edits, checklist state and source order while adding research', () => {
  const doc = { activity_id: 'stop', title: 'ユーザーのタイトル', revision: 4, blocks: [
    { id: 'personal', type: 'text', text: '私のメモ' },
    { id: 'check', type: 'checklist', items: [{ text: '予約済み', checked: true }] },
    { id: 'sources', type: 'heading', text: '出典・最新情報' },
    { id: 'source', type: 'link', url: 'https://example.com/', text: '既存の出典' },
  ] };
  const additions = [{ title: '歴史', text: '調査内容', sourceTitle: '公式出典', url: 'https://example.com/' }];
  const next = appendEnrichment(doc, additions);
  expect(next.blocks.slice(0, 2)).toEqual(doc.blocks.slice(0, 2));
  expect(next.blocks.map((b) => b.text)).toEqual(['私のメモ', undefined, '歴史', '調査内容', '出典・最新情報', '既存の出典']);
  expect(next.title).toBe(doc.title);
  expect(doc.blocks).toHaveLength(4);
  expect(appendEnrichment(next, additions)).toEqual(next);
});
it('adds sources and appends safely when the user removed the source heading', () => {
  const doc = { activity_id: 'stop', blocks: [{ id: 'personal', type: 'text', text: 'メモ' }] };
  const next = appendEnrichment(doc, [{ title: '歴史', text: '調査内容', sourceTitle: '公式', url: 'https://example.com/' }]);
  expect(next.blocks.at(-1)).toMatchObject({ type: 'link', url: 'https://example.com/' });
  expect(next.blocks[0]).toEqual(doc.blocks[0]);
});
it.each(['heading', 'text'])('preserves block edits after the generated %s is deleted', (deletedType) => {
  const additions = [{ title: '歴史', text: '調査内容', sourceTitle: '公式', url: 'https://example.com/' }];
  const applied = appendEnrichment({ activity_id: 'stop', blocks: [] }, additions);
  const edited = { ...applied, blocks: applied.blocks.filter((b) => b.type !== deletedType)
    .map((b) => b.type === 'link' ? b : { ...b, text: 'ユーザーによる編集' }) };
  expect(appendEnrichment(edited, additions)).toEqual(edited);
  expect(edited.blocks.filter((b) => b.type !== 'link')).toHaveLength(1);
});
it('targets existing guides and gives every researched addition an HTTPS source', () => {
  expect(Object.keys(enrichments)).toHaveLength(12);
  for (const [id, additions] of Object.entries(enrichments)) {
    expect(guides[id], id).toBeTruthy();
    for (const addition of additions) {
      expect(addition.title).toBeTruthy();
      expect(addition.text.length).toBeGreaterThan(70);
      expect(new URL(addition.url).protocol).toBe('https:');
    }
  }
});
