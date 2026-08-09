import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

export async function loadSharedWorkspace() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_state')
    .select('trips, plan_document, plan_markdown, revision, updated_at')
    .eq('id', 'shared')
    .single();
  if (error) throw error;
  return data;
}

export async function saveSharedWorkspace({ trips, planDocument, planMarkdown, revision }) {
  if (!supabase) return null;
  const nextRevision = revision + 1;
  const { data, error } = await supabase
    .from('app_state')
    .update({
      trips,
      plan_document: planDocument,
      plan_markdown: planMarkdown,
      revision: nextRevision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'shared')
    .select('revision, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadPlanImage(file) {
  if (!supabase) throw new Error('Supabase が設定されていません。');
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください。');
  if (file.size > 10 * 1024 * 1024) throw new Error('画像は10MB以下にしてください。');

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const fileName = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extension}`;
  const path = `notebook/${fileName}`;
  const { error } = await supabase.storage
    .from('trip-plan-images')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  return supabase.storage.from('trip-plan-images').getPublicUrl(path).data.publicUrl;
}

