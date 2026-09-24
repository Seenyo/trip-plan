import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { appendHotelDetails, hotelResearchDate, icelandHotelDetails } from './iceland-hotel-details.mjs';

const ICELAND_TRIP_ID = 'iceland-ring-road-2026';
const env = loadEnv('development', '.', '');
const client = createClient(
  process.env.SUPABASE_URL || env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const { data: workspace, error: workspaceError } = await client.from('app_state').select('trips,revision').eq('id', 'shared').single();
if (workspaceError) throw workspaceError;
const trip = workspace.trips.find((item) => item.id === ICELAND_TRIP_ID);
if (!trip) throw new Error('アイスランド旅行が見つかりません。');

const ids = Object.keys(icelandHotelDetails);
const activities = trip.days.flatMap((day) => day.activities);
const missingActivities = ids.filter((id) => !activities.some((activity) => activity.id === id));
if (missingActivities.length) throw new Error(`宿泊予定が見つかりません: ${missingActivities.join(', ')}`);

const { data: documents, error: documentError } = await client.from('travel_documents').select('*').in('activity_id', ids);
if (documentError) throw documentError;
const missingDocuments = ids.filter((id) => !documents.some((document) => document.activity_id === id));
if (missingDocuments.length) throw new Error(`宿泊ガイドが見つかりません: ${missingDocuments.join(', ')}`);

const updatedTrip = {
  ...trip,
  days: trip.days.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      const details = icelandHotelDetails[activity.id];
      return details ? { ...activity, title: details.title, notes: details.timelineNotes } : activity;
    }),
  })),
};
const nextTrips = workspace.trips.map((item) => item.id === ICELAND_TRIP_ID ? updatedTrip : item);
const workspaceChanged = !isDeepStrictEqual(trip, updatedTrip);
const documentUpdates = documents.map((before) => ({ before, after: appendHotelDetails(before, icelandHotelDetails[before.activity_id]) }))
  .filter(({ before, after }) => before.title !== after.title || !isDeepStrictEqual(before.blocks, after.blocks));

console.log(`旅程revision ${workspace.revision}。宿泊予定10件、旅程更新${workspaceChanged ? 1 : 0}件、ガイド更新${documentUpdates.length}件。`);
for (const id of ids) {
  const activity = updatedTrip.days.flatMap((day) => day.activities).find((item) => item.id === id);
  console.log(`・${activity.time} ${activity.title}`);
}
if (!workspaceChanged && documentUpdates.length === 0) {
  console.log('ホテル情報はすでに反映済みです。');
  process.exit(0);
}
if (!process.argv.includes('--write')) process.exit(0);

const backup = join(tmpdir(), `trip-iceland-hotels-before-${Date.now()}.json`);
await writeFile(backup, JSON.stringify({ workspace, documents }, null, 2), { mode: 0o600 });
console.log(`更新前の控え: ${backup}`);

let savedWorkspace = workspace;
if (workspaceChanged) {
  const { data, error } = await client.from('app_state')
    .update({ trips: nextTrips, revision: workspace.revision + 1, updated_at: new Date().toISOString() })
    .eq('id', 'shared').eq('revision', workspace.revision).select('trips,revision').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('別の端末で旅程が更新されました。最新状態で再実行してください。');
  savedWorkspace = data;
}

for (const { before, after } of documentUpdates) {
  const { data: saved, error: saveError } = await client.from('travel_documents')
    .update({ title: after.title, blocks: after.blocks, checked_at: hotelResearchDate, revision: before.revision + 1, updated_at: new Date().toISOString() })
    .eq('id', before.id).eq('revision', before.revision).select('*').maybeSingle();
  if (saveError) throw saveError;
  if (!saved) throw new Error(`別の端末でガイドが更新されました: ${before.title}`);
  if (saved.title !== after.title || !isDeepStrictEqual(saved.blocks, after.blocks)) throw new Error(`保存内容の検証に失敗: ${after.title}`);
}

const savedTrip = savedWorkspace.trips.find((item) => item.id === ICELAND_TRIP_ID);
for (const [id, details] of Object.entries(icelandHotelDetails)) {
  const activity = savedTrip.days.flatMap((day) => day.activities).find((item) => item.id === id);
  if (activity?.title !== details.title || activity?.notes !== details.timelineNotes) throw new Error(`旅程の保存検証に失敗: ${id}`);
}
console.log(`保存・検証完了。旅程revision ${workspace.revision} → ${savedWorkspace.revision}、ガイド${documentUpdates.length}件。`);
