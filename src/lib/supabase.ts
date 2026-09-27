/**
 * Supabase client.
 *
 * The app is offline-first: when no credentials are configured it runs
 * entirely against the local storage adapter, and `isSupabaseConfigured`
 * is how every call site decides which path to take. That keeps the game
 * playable on first clone, before any backend exists.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
  : null;

/** Throws a clear error rather than a null-dereference deep in a query. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    );
  }
  return supabase;
}

/** Invoke an edge function, returning typed data or throwing. */
export async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  monsterArt: 'monster-art',
  gearArt: 'gear-art',
  badgeArt: 'badge-art',
} as const;

/** Public URL for an asset in one of the game's buckets. */
export function assetUrl(bucket: keyof typeof STORAGE_BUCKETS, path: string): string | null {
  if (!supabase) return null;
  const { data } = supabase.storage.from(STORAGE_BUCKETS[bucket]).getPublicUrl(path);
  return data.publicUrl;
}
