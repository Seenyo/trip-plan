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
    .select('trips, revision, updated_at')
    .eq('id', 'shared')
    .single();
  if (error) throw error;
  return data;
}

export async function saveSharedWorkspace({ trips, revision }) {
  if (!supabase) return null;
  const nextRevision = revision + 1;
  const { data, error } = await supabase
    .from('app_state')
    .update({
      trips,
      revision: nextRevision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'shared')
    .select('revision, updated_at')
    .single();
  if (error) throw error;
  return data;
}

