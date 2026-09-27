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

export async function pushCharacter(character: Character): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('characters').upsert({
    ...character,
    ...character.stats,
    stats: undefined,
  });
}

export async function pushHabits(habits: Habit[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || habits.length === 0) return;
  await supabase.from('habits').upsert(habits);
}

export async function deleteHabitRemote(habitId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('habits').delete().eq('id', habitId);
}

export async function pushHabitLog(log: HabitLog): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('habit_logs').insert(log);
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
    character: (characters.data as Character) ?? null,
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
