import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DOMESTIC_TRIP_ID, swapDomesticActivities } from './swap-domestic-days.mjs';

const env = loadEnv('development', '.', '');
const client = createClient(process.env.SUPABASE_URL || env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: workspace, error } = await client.from('app_state').select('trips,revision').eq('id', 'shared').single();
if (error) throw error;
const target = workspace.trips.find((trip) => trip.id === DOMESTIC_TRIP_ID);
if (!target) throw new Error('隠岐・中国地方の旅行が見つかりません。');
const swapped = swapDomesticActivities(target);
if (swapped === target) { console.log('9月20日と21日の指定地点はすでに入れ替え済みです。'); process.exit(0); }
const nextTrips = workspace.trips.map((trip) => trip.id === target.id ? swapped : trip);
console.log('9月20日: 道の駅ほうじょう → 鳥取砂丘 → 浦富海岸');
console.log('9月21日: 稲佐の浜 → 出雲大社 → 日御碕灯台');
if (!process.argv.includes('--write')) process.exit(0);
const backup = join(tmpdir(), `trip-workspace-before-day-swap-${Date.now()}.json`);
await writeFile(backup, JSON.stringify(workspace, null, 2), { mode: 0o600 });
console.log(`更新前の控え: ${backup}`);
const { data: saved, error: saveError } = await client.from('app_state')
  .update({ trips: nextTrips, revision: workspace.revision + 1, updated_at: new Date().toISOString() })
  .eq('id', 'shared').eq('revision', workspace.revision).select('trips,revision').maybeSingle();
if (saveError) throw saveError;
if (!saved) throw new Error('別の端末で旅程が更新されました。もう一度実行してください。');
const savedTrip = saved.trips.find((trip) => trip.id === DOMESTIC_TRIP_ID);
if (swapDomesticActivities(savedTrip) !== savedTrip) throw new Error('保存後の検証に失敗しました。');
console.log(`保存・検証完了。旅程revision ${workspace.revision} → ${saved.revision}`);
