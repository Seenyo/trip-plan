import { supabase } from './supabase';
import { prepareImage } from './imageCompression';
import { cacheAttachmentBlob } from './attachmentMedia';

const cacheKey = (tripId) => `roam.documents.v1.${tripId}`;
export const ATTACHMENT_URL_TTL_SECONDS = 3600;
const signedUrls = new Map();
const signing = new Map();
export const attachmentUrlExpiresAt = (path) => signedUrls.get(path)?.expiresAt || 0;
export const attachmentUrlValidUntil = (path) => signedUrls.get(path)?.validUntil || 0;
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
  const prepared = file.type.startsWith('image/') ? await prepareImage(file) : { full: file };
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
  const id = crypto.randomUUID();
  const path = `${tripId}/${id}.${extensions[prepared.full.type]}`;
  const store = supabase.storage.from('travel-attachments');
  const upload = async (target, blob) => {
    const { error } = await store.upload(target, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    await cacheAttachmentBlob(target, blob);
  };
  await upload(path, prepared.full);
  const thumbnailPath = prepared.thumbnail && prepared.thumbnail !== prepared.full
    ? `${tripId}/${id}-thumb.${extensions[prepared.thumbnail.type]}` : undefined;
  if (thumbnailPath) await upload(thumbnailPath, prepared.thumbnail);
  return { ...newBlock(file.type === 'application/pdf' ? 'file' : 'image'), path, ...(thumbnailPath ? { thumbnailPath } : {}), text: file.name };
}
export async function uploadPlanImage(tripId, file) {
  if (!file.type.startsWith('image/')) throw new Error('予定には画像ファイルを追加してください。');
  const block = await uploadAttachment(tripId, file);
  return { id: block.id, path: block.path, ...(block.thumbnailPath ? { thumbnailPath: block.thumbnailPath } : {}), alt: file.name };
}
export async function attachmentUrl(path) {
  if (!supabase || !navigator.onLine) return null;
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (signing.has(path)) return signing.get(path);
  const request = (async () => {
    const { data, error } = await supabase.storage.from('travel-attachments').createSignedUrl(path, ATTACHMENT_URL_TTL_SECONDS);
    if (error) throw error;
    const validUntil = Date.now() + ATTACHMENT_URL_TTL_SECONDS * 1000;
    signedUrls.set(path, { url: data.signedUrl, expiresAt: validUntil - 300 * 1000, validUntil });
    return data.signedUrl;
  })().finally(() => signing.delete(path));
  signing.set(path, request);
  return request;
}
export function documentText(doc) {
  return [doc.title, ...doc.blocks.map((block) => {
    if (block.type === 'checklist') return (block.items || []).map((item) => `${item.checked ? '☑' : '☐'} ${item.text}`).join('\n');
    if (block.type === 'table') return (block.rows || []).map((row) => row.join(' | ')).join('\n');
    return [block.text, block.type === 'link' ? block.url : ''].filter(Boolean).join('\n');
  })].join('\n\n');
}
