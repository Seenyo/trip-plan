import { supabase } from './supabase';

const cacheKey = (tripId) => `roam.documents.v1.${tripId}`;
export const ATTACHMENT_URL_TTL_SECONDS = 3600;
export const guideId = (tripId, activityId) => `guide:${tripId}:${activityId}`;
export const notebookId = (tripId) => `notebook:${tripId}`;
export const emptyDocument = (id, tripId, title, activityId = null, parentId = null) => ({
  id, trip_id: tripId, activity_id: activityId, parent_id: parentId, title, blocks: [], revision: 0,
});
export function cachedDocuments(tripId) {
  try { return JSON.parse(localStorage.getItem(cacheKey(tripId)) || '[]'); } catch { return []; }
}
export function cacheDocuments(tripId, docs) {
  try { localStorage.setItem(cacheKey(tripId), JSON.stringify(docs)); return true; } catch { return false; }
}
export async function loadDocuments(tripId) {
  if (!supabase || !navigator.onLine) throw new Error('保存済みの情報を表示しています。');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const { data, error } = await supabase.from('travel_documents').select('*').eq('trip_id', tripId).abortSignal(controller.signal);
    if (error) throw error;
    return data;
  } finally { clearTimeout(timer); }
}
export async function saveDocument(doc) {
  if (!supabase || !navigator.onLine) throw new Error('オンラインになってから保存してください。下書きはこの端末に残ります。');
  const row = { ...doc, revision: doc.revision + 1, updated_at: new Date().toISOString() };
  const query = doc.revision === 0
    ? supabase.from('travel_documents').insert(row)
    : supabase.from('travel_documents').update(row).eq('id', doc.id).eq('revision', doc.revision);
  const { data, error } = await query.select().maybeSingle();
  if (error?.code === '23505' || (!error && !data)) throw new Error('別の端末で更新されています。下書きをコピーしてから、ページを開き直してください。');
  if (error) throw error;
  return data;
}
export function safeLink(value) {
  try { const url = new URL(value); return ['https:', 'http:', 'tel:', 'mailto:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function newBlock(type) {
  return { id: crypto.randomUUID(), type, text: '', ...(type === 'checklist' ? { items: [{ text: '', checked: false }] } : {}),
    ...(type === 'table' ? { rows: [['項目', '内容'], ['', '']] } : {}) };
}
export async function uploadAttachment(tripId, file) {
  const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!types.includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('画像（JPEG・PNG・WebP・GIF）かPDFを選んでください。上限は10MBです。');
  if (!supabase || !navigator.onLine) throw new Error('添付にはインターネット接続が必要です。');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' }[file.type];
  const path = `${tripId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('travel-attachments').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { ...newBlock(file.type === 'application/pdf' ? 'file' : 'image'), path, text: file.name };
}
export async function attachmentUrl(path) {
  if (!supabase || !navigator.onLine) return null;
  const { data, error } = await supabase.storage.from('travel-attachments').createSignedUrl(path, ATTACHMENT_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
export function documentText(doc) {
  return [doc.title, ...doc.blocks.map((block) => {
    if (block.type === 'checklist') return (block.items || []).map((item) => `${item.checked ? '☑' : '☐'} ${item.text}`).join('\n');
    if (block.type === 'table') return (block.rows || []).map((row) => row.join(' | ')).join('\n');
    return [block.text, block.type === 'link' ? block.url : ''].filter(Boolean).join('\n');
  })].join('\n\n');
}
