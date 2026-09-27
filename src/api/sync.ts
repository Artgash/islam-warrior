/**
 * Server sync.
 *
 * The local store is authoritative for play; this module mirrors state to
 * Supabase when it is configured. Every function is a no-op without
 * credentials, so calling them unconditionally is safe.
 */

import type {
  Character,
  CoinTransaction,
  EquippedMap,
  Habit,
  HabitLog,
  InventoryEntry,
  TauntLog,
  UserAchievement,
} from '@/types';
import { isSupabaseConfigured, invokeFunction, supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/* Sync health                                                         */
/*                                                                     */
/* Sync used to fail silently, which is how a fatal bug survived: every */
/* row carried a prefixed id like `char_9f8e...` while every column is  */
/* `uuid`, so Postgres rejected all of it and nothing said a word.      */
/* Failures are now recorded and surfaced in the UI.                    */
/* ------------------------------------------------------------------ */

export interface SyncError {
  table: string;
  message: string;
  code?: string;
  at: string;
}

let lastError: SyncError | null = null;
let successCount = 0;
const listeners = new Set<(error: SyncError | null) => void>();

function reportSyncError(table: string, error: { message: string; code?: string }): void {
  lastError = {
    table,
    message: error.message,
    code: error.code,
    at: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.warn(`[sync] ${table} failed: ${error.message}`, error.code ?? '');
  }

  listeners.forEach((listener) => listener(lastError));
}

function reportSyncSuccess(): void {
  successCount += 1;
  if (lastError) {
    lastError = null;
    listeners.forEach((listener) => listener(null));
  }
}

export function onSyncError(listener: (error: SyncError | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncHealth(): { lastError: SyncError | null; successes: number } {
  return { lastError, successes: successCount };
}

/** Server-validated habit completion. Falls back to local resolution. */
export interface CompleteHabitPayload {
  habit_id: string;
  date: string;
}

export interface CompleteHabitResponse {
  accepted: boolean;
  xp: number;
  coins: number;
  damage: number;
  was_crit: boolean;
  monster_hp_after: number;
  monster_killed: boolean;
  reason?: string;
}

export async function completeHabitRemote(
  payload: CompleteHabitPayload,
): Promise<CompleteHabitResponse | null> {
  if (!isSupabaseConfigured) return null;
  try {
    return await invokeFunction<CompleteHabitResponse>('complete-habit', { ...payload });
  } catch {
    // A network failure must never block the player's day.
    return null;
  }
}

/**
 * The characters table stores the six stats as individual columns, not as a
 * JSON blob, so the nested `stats` object is flattened and removed. The
 * upsert conflicts on `user_id` (which is UNIQUE) rather than the primary
 * key, so a row written from a second device updates rather than duplicates.
 */
export async function pushCharacter(character: Character): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { stats, ...rest } = character;
  const row = { ...rest, ...stats };

  const { error } = await supabase
    .from('characters')
    .upsert(row, { onConflict: 'user_id' });

  if (error) reportSyncError('characters', error);
  else reportSyncSuccess();
}

export async function pushHabits(habits: Habit[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || habits.length === 0) return;

  const { error } = await supabase.from('habits').upsert(habits, { onConflict: 'id' });
  if (error) reportSyncError('habits', error);
}

export async function deleteHabitRemote(habitId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('habits').delete().eq('id', habitId);
}

export async function pushHabitLog(log: HabitLog): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from('habit_logs').insert(log);

  // 23505 is the unique (habit_id, date) guard doing its job, not a fault.
  if (error && error.code !== '23505') reportSyncError('habit_logs', error);
  else reportSyncSuccess();
}

export async function pushInventory(
  userId: string,
  inventory: InventoryEntry[],
  equipped: EquippedMap,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.from('inventory').upsert(
    inventory.map((entry) => ({ user_id: userId, ...entry })),
    { onConflict: 'user_id,item_id' },
  );

  await supabase
    .from('equipped_items')
    .upsert({ user_id: userId, ...equipped }, { onConflict: 'user_id' });
}

export async function pushCoinTransaction(tx: CoinTransaction): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('coins_transactions').insert(tx);
}

export async function pushTauntLog(log: TauntLog): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('taunt_logs').upsert(log);
}

export async function pushAchievements(
  userId: string,
  achievements: UserAchievement[],
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || achievements.length === 0) return;
  await supabase.from('user_achievements').upsert(
    achievements.map((a) => ({ user_id: userId, ...a })),
    { onConflict: 'user_id,achievement_id' },
  );
}

/* ------------------------------------------------------------------ */
/* Pull                                                                */
/* ------------------------------------------------------------------ */

export interface RemoteSnapshot {
  character: Character | null;
  habits: Habit[];
  logs: HabitLog[];
  inventory: InventoryEntry[];
  equipped: EquippedMap;
  achievements: UserAchievement[];
  taunts: TauntLog[];
}

/** Rebuild the nested `stats` object from the flat Postgres columns. */
function rowToCharacter(row: Record<string, unknown>): Character {
  const {
    strength, defense_stat, intelligence, endurance, faith, charisma, ...rest
  } = row as Record<string, number> & Record<string, unknown>;

  return {
    ...(rest as unknown as Omit<Character, 'stats'>),
    stats: {
      strength: Number(strength ?? 0),
      defense_stat: Number(defense_stat ?? 0),
      intelligence: Number(intelligence ?? 0),
      endurance: Number(endurance ?? 0),
      faith: Number(faith ?? 0),
      charisma: Number(charisma ?? 0),
    },
    // numeric(30,0) arrives as a string from postgrest.
    current_monster_hp: Number(rest.current_monster_hp ?? 0),
  };
}

/** Pull everything owned by the user. Returns null when offline. */
export async function pullSnapshot(userId: string): Promise<RemoteSnapshot | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const [characters, habits, logs, inventory, equipped, achievements, taunts] = await Promise.all([
    supabase.from('characters').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(2000),
    supabase.from('inventory').select('*').eq('user_id', userId),
    supabase.from('equipped_items').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
    supabase.from('taunt_logs').select('*').eq('user_id', userId).order('fired_at', { ascending: false }),
  ]);

  return {
    // The six stats are separate columns in Postgres; the app expects them
    // nested under `stats`, so the row is reassembled on the way back.
    character: characters.data ? rowToCharacter(characters.data) : null,
    habits: (habits.data ?? []) as Habit[],
    logs: (logs.data ?? []) as HabitLog[],
    inventory: (inventory.data ?? []) as InventoryEntry[],
    equipped: (equipped.data ?? {}) as EquippedMap,
    achievements: (achievements.data ?? []) as UserAchievement[],
    taunts: (taunts.data ?? []) as TauntLog[],
  };
}

/** True when the app is running without a backend. */
export function isOfflineMode(): boolean {
  return !isSupabaseConfigured;
}
