import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { appendReviewTrends, reviewTrendDate, reviewTrends } from './review-trend-enrichment.mjs';

const env = loadEnv('development', '.', '');
const client = createClient(
  process.env.SUPABASE_URL || env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const { data: workspace, error: workspaceError } = await client.from('app_state').select('revision').eq('id', 'shared').single();
if (workspaceError) throw workspaceError;
const { data: documents, error } = await client.from('travel_documents').select('*').in('activity_id', Object.keys(reviewTrends));
if (error) throw error;
const missing = Object.keys(reviewTrends).filter((id) => !documents.some((document) => document.activity_id === id));
if (missing.length) throw new Error(`ガイドが見つかりません: ${missing.join(', ')}`);

const updates = documents.map((document) => ({ before: document, after: appendReviewTrends(document, reviewTrends[document.activity_id]) }))
  .filter(({ before, after }) => JSON.stringify(before.blocks) !== JSON.stringify(after.blocks));
console.log(`レビュー傾向の追記対象: ${updates.length}件 / 調査済み${documents.length}件。`);
for (const { before } of updates) console.log(`・${before.title}`);
if (!process.argv.includes('--write')) process.exit(0);

const backup = join(tmpdir(), `trip-review-trend-backup-${Date.now()}.json`);
await writeFile(backup, JSON.stringify(updates.map(({ before }) => before), null, 2), { mode: 0o600 });
console.log(`更新前の控え: ${backup}`);
for (const { before, after } of updates) {
  const { data: saved, error: updateError } = await client.from('travel_documents')
    .update({ blocks: after.blocks, checked_at: reviewTrendDate, revision: before.revision + 1, updated_at: new Date().toISOString() })
    .eq('id', before.id).eq('revision', before.revision).select('*').maybeSingle();
  if (updateError) throw updateError;
  if (!saved) throw new Error(`別の端末で更新されました。再実行して最新内容に追記してください: ${before.title}`);
  if (!isDeepStrictEqual(saved.blocks, after.blocks)) throw new Error(`保存内容の検証に失敗: ${before.title}`);
}
const { data: afterWorkspace, error: afterError } = await client.from('app_state').select('revision').eq('id', 'shared').single();
if (afterError) throw afterError;
console.log(`レビュー傾向を保存・検証しました: ${updates.length}件。旅程revision ${workspace.revision} → ${afterWorkspace.revision}。`);
