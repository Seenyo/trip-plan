// Dry-run by default. --write uploads variants and replaces references using revision guards.
// Originals are retained. Requires Pillow via PYTHON_BIN (or python3).
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const env = loadEnv('development', '.', '');
const client = createClient(process.env.SUPABASE_URL || env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } });
const write = process.argv.includes('--write');
const directory = await mkdtemp(join(tmpdir(), 'trip-image-optimization-'));
const workspaceResult = await client.from('app_state').select('trips,revision').eq('id','shared').single();
if (workspaceResult.error) throw workspaceResult.error;
const documentsResult = await client.from('travel_documents').select('id,blocks,revision');
if (documentsResult.error) throw documentsResult.error;
await writeFile(join(directory,'before.json'),JSON.stringify({workspace:workspaceResult.data,documents:documentsResult.data}),{mode:0o600});
const imagesInTrip = (trip) => [...trip.days.flatMap(day => day.activities.flatMap(stop => stop.images || [])),
  ...(trip.bookmarks || []).flatMap(bookmark => bookmark.images || [])];
const references = [...workspaceResult.data.trips.flatMap(imagesInTrip),
  ...documentsResult.data.flatMap(doc => doc.blocks.filter(block => block.type === 'image'))];
const paths = [...new Set(references.filter(image => !image?.thumbnailPath)
  .map(image => typeof image === 'string' ? image : image.path).filter(Boolean))];
const variants = new Map();
let originalBytes=0, fullBytes=0, thumbnailBytes=0;
const storage = client.storage.from('travel-attachments');
for (const [index,path] of paths.entries()) {
  const source=join(directory,`${index}.source`), full=join(directory,`${index}.webp`), thumbnail=join(directory,`${index}-thumb.webp`);
  const {data,error} = await storage.download(path);
  if(error) throw error;
  await writeFile(source,Buffer.from(await data.arrayBuffer()),{mode:0o600});
  const sizes=JSON.parse(execFileSync(process.env.PYTHON_BIN || 'python3',
    [fileURLToPath(new URL('./compress-attachment.py',import.meta.url)),source,full,thumbnail],{encoding:'utf8'}));
  const id=crypto.randomUUID();
  const folder=path.slice(0,path.lastIndexOf('/'));
  const fullPath=sizes.full<sizes.original ? `${folder}/${id}.webp` : path;
  const thumbnailPath=sizes.thumbnail<Math.min(sizes.full,sizes.original) ? `${folder}/${id}-thumb.webp` : fullPath;
  if(write) {
    for(const [target,local] of [[fullPath,full],[thumbnailPath,thumbnail]]) {
      if(target===path || (target===fullPath && local===thumbnail)) continue;
      const upload=await storage.upload(target,await readFile(local),{contentType:'image/webp',cacheControl:'31536000',upsert:false});
      if(upload.error) throw upload.error;
    }
  }
  variants.set(path,{path:fullPath,thumbnailPath});
  originalBytes+=sizes.original; fullBytes+=Math.min(sizes.full,sizes.original);
  thumbnailBytes+=Math.min(sizes.thumbnail,sizes.full,sizes.original);
  console.log(`Image ${index+1}/${paths.length}: ${sizes.original} → full ${Math.min(sizes.full,sizes.original)}, thumbnail ${Math.min(sizes.thumbnail,sizes.full,sizes.original)} bytes`);
}
const updateImage = image => {
  const path=typeof image==='string'?image:image.path;
  if(!variants.has(path)) return image;
  return {...(typeof image==='string'?{}:image),...variants.get(path)};
};
await writeFile(join(directory,'variants.json'),JSON.stringify(Object.fromEntries(variants)),{mode:0o600});
// Re-read immediately before each guarded write so unrelated user edits are preserved.
if(write && variants.size) {
  const {data:current,error}=await client.from('app_state').select('trips,revision').eq('id','shared').single();
  if(error) throw error;
  const trips=current.trips.map(trip=>({...trip,
    days:trip.days.map(day=>({...day,activities:day.activities.map(stop=>({...stop,...(stop.images?{images:stop.images.map(updateImage)}:{})}))})),
    ...(trip.bookmarks?{bookmarks:trip.bookmarks.map(bookmark=>({...bookmark,...(bookmark.images?{images:bookmark.images.map(updateImage)}:{})}))}:{})}));
  if(JSON.stringify(trips)!==JSON.stringify(current.trips)) {
    await writeFile(join(directory,'workspace-before-write.json'),JSON.stringify(current),{mode:0o600});
    const saved=await client.from('app_state').update({trips,revision:current.revision+1,updated_at:new Date().toISOString()})
      .eq('id','shared').eq('revision',current.revision).select('trips,revision').maybeSingle();
    if(saved.error || !saved.data) throw saved.error || new Error('Concurrent workspace edit. Originals and the variant manifest are retained.');
    if(JSON.stringify(saved.data.trips)!==JSON.stringify(trips)) throw new Error('Workspace verification failed');
  }
  for(const doc of documentsResult.data.filter(doc=>doc.blocks.some(block=>block.type==='image'&&variants.has(block.path)))) {
    const read=await client.from('travel_documents').select('id,blocks,revision').eq('id',doc.id).single();
    if(read.error) throw read.error;
    const blocks=read.data.blocks.map(block=>block.type==='image'?updateImage(block):block);
    const saved=await client.from('travel_documents').update({blocks,revision:read.data.revision+1,updated_at:new Date().toISOString()})
      .eq('id',doc.id).eq('revision',read.data.revision).select('blocks').maybeSingle();
    if(saved.error || !saved.data) throw saved.error || new Error('Concurrent document edit');
    if(JSON.stringify(saved.data.blocks)!==JSON.stringify(blocks)) throw new Error('Document verification failed');
  }
}
await writeFile(join(directory,'variants.json'),JSON.stringify(Object.fromEntries(variants)),{mode:0o600});
console.log(JSON.stringify({write,images:variants.size,originalBytes,fullBytes,thumbnailBytes,backup:directory}));
