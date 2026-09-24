import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { guides, notebooks, checkedAt } from './guide-content.mjs';
import { appendEnrichment, enrichments } from './guide-enrichment.mjs';
import { appendHotelDetails, hotelResearchDate, icelandHotelDetails } from './iceland-hotel-details.mjs';
const env = loadEnv('development', '.', '');
const client = createClient(process.env.SUPABASE_URL || env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: workspace, error } = await client.from('app_state').select('trips,revision').eq('id', 'shared').single();
if (error) throw error;
const block = (type, text, extra = {}) => ({ id: crypto.randomUUID(), type, text, ...extra });
function blocks(content) {
  return [block('text', content.intro), ...content.sections.flatMap(([title, text]) => [block('heading', title), block('text', text)]),
    ...(content.checklist ? [block('heading', '出発前のチェック'), block('checklist', '', { items: content.checklist.map((text) => ({ text, checked: false })) })] : []),
    block('heading', '出典・最新情報'), ...content.sources.map(([title, url]) => block('link', title, { url }))];
}
const rows = [];
const missing = [];
for (const trip of workspace.trips.filter((t) => notebooks[t.id])) {
  const rootId = `notebook:${trip.id}`;
  rows.push({ id: rootId, trip_id: trip.id, title: '旅行ノート', blocks: blocks(notebooks[trip.id]), checked_at: checkedAt });
  rows.push({ id: `reservations:${trip.id}`, trip_id: trip.id, parent_id: rootId, title: '予約・連絡先', blocks: [block('text', '航空券、船、レンタカー、宿、ツアーの予約PDFや連絡先をここに追加してください。予約番号・集合場所・受付時刻も一緒に残すと便利です。'), block('table', '', { rows: [['予約', '連絡先・受付・メモ'], ['宿泊', ''], ['交通', ''], ['ツアー', '']] })] });
  for (const activity of trip.days.flatMap((d) => d.activities)) {
    if (!guides[activity.id]) { missing.push(activity.title); continue; }
    let row = { id: `guide:${trip.id}:${activity.id}`, trip_id: trip.id, activity_id: activity.id, title: activity.title, blocks: blocks(guides[activity.id]), checked_at: checkedAt };
    if (enrichments[activity.id]) row = appendEnrichment(row, enrichments[activity.id]);
    if (icelandHotelDetails[activity.id]) row = { ...appendHotelDetails(row, icelandHotelDetails[activity.id]), checked_at: hotelResearchDate };
    rows.push(row);
  }
}
if (missing.length) throw new Error(`調査ガイドのない予定: ${missing.join('、')}`);
if (!process.argv.includes('--write')) { console.log(`確認: ${rows.filter((r) => r.activity_id).length}件の地点ガイド、${rows.filter((r) => !r.activity_id).length}件のノートページ。旅程revision ${workspace.revision}。保存は --write を指定。`); process.exit(0); }
// Never overwrite any guide or notebook someone has already edited.
const { error: insertError } = await client.from('travel_documents').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
if (insertError) throw insertError;
const { data: after, error: afterError } = await client.from('app_state').select('revision').eq('id', 'shared').single();
if (afterError) throw afterError;
console.log(`保存完了: ${rows.length}件（既存ページは保持）。旅程revision ${workspace.revision} → ${after.revision}。`);
