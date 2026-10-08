'use client';

// Contesti scelti negli strumenti (ateneo/corso monitorati), salvati su Supabase per l'utente registrato.
import { getSupabaseBrowserClient } from '../supabase/client';

export type ContextKind = 'deadlines' | 'community' | 'books' | 'bureaucracy';

export interface ToolContext {
  universityId: string;
  courseName: string;
  savedAt?: string;
}

export async function loadContext(kind: ContextKind): Promise<ToolContext | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('user_contexts')
    .select('university_id, course_name, saved_at')
    .eq('kind', kind)
    .maybeSingle();
  return data ? { universityId: data.university_id, courseName: data.course_name || '', savedAt: data.saved_at } : null;
}

export async function saveContext(userId: string, kind: ContextKind, context: ToolContext): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.from('user_contexts').upsert({
    user_id: userId,
    kind,
    university_id: context.universityId,
    course_name: context.courseName || '',
    saved_at: new Date().toISOString()
  });
  return !error;
}

export async function clearContext(kind: ContextKind): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from('user_contexts').delete().eq('kind', kind);
}
