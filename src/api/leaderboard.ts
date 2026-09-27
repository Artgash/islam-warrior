/**
 * Leaderboards.
 *
 * With Supabase configured these read the real tables. Without it, the app
 * generates a deterministic local ladder so every board is functional and
 * the UI is never empty — the Leaderboards screen labels this clearly as a
 * local ladder rather than passing it off as real players.
 */

import type { Character, LeaderboardEntry, LeaderboardType } from '@/types';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { currentWeekKey } from '@/lib/date';
import { AVATARS } from '@/game/constants';
import { MONSTERS_PER_ZONE } from '@/game/constants';

/* ------------------------------------------------------------------ */
/* Local ladder                                                        */
/* ------------------------------------------------------------------ */

const RIVAL_NAMES = [
  'Abu Bakr', 'Bilal', 'Hamza', 'Khalid', 'Salman', 'Zayd', 'Musab', 'Talha',
  'Anas', 'Muadh', 'Ubayy', 'Suhayb', 'Miqdad', 'Ammar', 'Abbas', 'Jafar',
  'Uqba', 'Rafi', 'Sahl', 'Qatada', 'Asim', 'Nuaym', 'Hudhayfa', 'Ubada',
  'Thabit', 'Rabi', 'Iyas', 'Jundub', 'Kaab', 'Layth', 'Marwan', 'Nadir',
  'Qays', 'Rashid', 'Sabit', 'Tariq', 'Umair', 'Wahb', 'Yasir', 'Zubayr',
  'Adham', 'Basim', 'Dawud', 'Faris', 'Ghassan', 'Harith', 'Idris', 'Jabir',
  'Kamil', 'Luqman', 'Mahmud', 'Nabil', 'Omar', 'Qasim', 'Rayyan', 'Sami',
  'Tamim', 'Umar', 'Waleed', 'Yahya', 'Zakariya', 'Amir', 'Bashir', 'Dhia',
  'Fadil', 'Ghalib', 'Hakim', 'Ilyas', 'Junayd', 'Karim', 'Labib', 'Mukhtar',
  'Nasir', 'Rida', 'Sadiq', 'Taha', 'Uthman', 'Wasim', 'Yusuf', 'Ziyad',
];

/**
 * A stable pseudo-random generator so the local ladder does not reshuffle
 * on every render — the same seed always yields the same warrior.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

interface Rival {
  user_id: string;
  name: string;
  avatar_id: string;
  rank_tier: number;
  rank_division: 1 | 2 | 3;
  level: number;
  weekly_xp: number;
  total_xp: number;
  kills: number;
  zone: number;
  monster_index: number;
}

function buildRivals(count: number, weekKey: string): Rival[] {
  // Seed from the week so the ladder rolls over with the weekly reset.
  const weekSeed = weekKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  return Array.from({ length: count }, (_, i) => {
    const rng = seeded(weekSeed * 7919 + i * 104729);
    const level = Math.max(1, Math.round(rng() * 60) + 1);
    const totalXp = Math.round(level * level * 120 * (0.6 + rng()));
    const rankTier = Math.min(10, Math.max(1, Math.ceil(level / 7)));
    const zone = Math.min(66, Math.max(1, Math.ceil(level / 1.4)));

    return {
      user_id: `rival_${i}`,
      name: RIVAL_NAMES[i % RIVAL_NAMES.length] ?? `Warrior ${i}`,
      avatar_id: AVATARS[i % AVATARS.length].id,
      rank_tier: rankTier,
      rank_division: ((Math.floor(rng() * 3) + 1) as 1 | 2 | 3),
      level,
      weekly_xp: Math.round(rng() * 9000) + 200,
      total_xp: totalXp,
      kills: Math.round(rng() * 1800) + level * 4,
      zone,
      monster_index: Math.floor(rng() * MONSTERS_PER_ZONE),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Board assembly                                                      */
/* ------------------------------------------------------------------ */

export interface BoardInput {
  type: LeaderboardType;
  character: Character;
  /** Weekly XP the player has earned this reset week. */
  weeklyXp: number;
  /** Ids of followed players, used by the Friends board. */
  friendIds?: string[];
  guildMemberIds?: string[];
}

function valueFor(type: LeaderboardType, rival: Rival): number {
  switch (type) {
    case 'weekly':
    case 'friends':
    case 'guild':
    case 'rank_tier':
      return rival.weekly_xp;
    case 'global':
      return rival.total_xp;
    case 'slayers':
      return rival.kills;
    case 'deep_road':
      return rival.zone * MONSTERS_PER_ZONE + rival.monster_index;
  }
}

function selfValue(type: LeaderboardType, character: Character, weeklyXp: number): number {
  switch (type) {
    case 'weekly':
    case 'friends':
    case 'guild':
    case 'rank_tier':
      return weeklyXp;
    case 'global':
      return character.total_xp_earned;
    case 'slayers':
      return character.total_monsters_killed;
    case 'deep_road':
      return character.current_zone * MONSTERS_PER_ZONE + character.current_monster_index;
  }
}

function detailFor(type: LeaderboardType, zone: number, index: number): string | undefined {
  if (type !== 'deep_road') return undefined;
  return `Zone ${zone} · Monster ${index + 1}`;
}

/** Build a board locally from the rival pool plus the player. */
export function buildLocalBoard(input: BoardInput): LeaderboardEntry[] {
  const { type, character, weeklyXp } = input;
  const week = currentWeekKey();

  let pool = buildRivals(120, week);

  if (type === 'friends') {
    const ids = new Set(input.friendIds ?? []);
    pool = pool.filter((r) => ids.has(r.user_id)).slice(0, 50);
  }

  if (type === 'guild') {
    const ids = new Set(input.guildMemberIds ?? []);
    pool = pool.filter((r) => ids.has(r.user_id));
  }

  if (type === 'rank_tier') {
    pool = pool.filter(
      (r) => r.rank_tier === character.rank_tier && r.rank_division === character.rank_division,
    );
  }

  const rows: Omit<LeaderboardEntry, 'position'>[] = pool.map((r) => ({
    user_id: r.user_id,
    name: r.name,
    avatar_id: r.avatar_id,
    rank_tier: r.rank_tier,
    rank_division: r.rank_division,
    level: r.level,
    value: valueFor(type, r),
    detail: detailFor(type, r.zone, r.monster_index),
    is_self: false,
  }));

  rows.push({
    user_id: character.user_id,
    name: character.name,
    avatar_id: character.avatar_id,
    rank_tier: character.rank_tier,
    rank_division: character.rank_division,
    level: character.level,
    value: selfValue(type, character, weeklyXp),
    detail: detailFor(type, character.current_zone, character.current_monster_index),
    is_self: true,
  });

  return rows
    .sort((a, b) => b.value - a.value)
    .map((row, i) => ({ ...row, position: i + 1 }))
    .slice(0, 100);
}

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

const TABLE_FOR: Record<LeaderboardType, string> = {
  friends: 'leaderboard_weekly',
  guild: 'leaderboard_weekly',
  weekly: 'leaderboard_weekly',
  rank_tier: 'leaderboard_weekly',
  global: 'leaderboard_global',
  slayers: 'leaderboard_slayers',
  deep_road: 'leaderboard_deep_road',
};

export async function fetchLeaderboard(input: BoardInput): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured) {
    return buildLocalBoard(input);
  }

  const client = requireSupabase();
  const view = TABLE_FOR[input.type];

  let query = client.from(view).select('*').limit(100);

  if (input.type === 'rank_tier') {
    query = query
      .eq('rank_tier', input.character.rank_tier)
      .eq('rank_division', input.character.rank_division);
  }

  if (input.type === 'friends' && input.friendIds?.length) {
    query = query.in('user_id', input.friendIds);
  }

  if (input.type === 'guild' && input.guildMemberIds?.length) {
    query = query.in('user_id', input.guildMemberIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>, i: number) => ({
    position: i + 1,
    user_id: String(row.user_id),
    name: String(row.name ?? 'Warrior'),
    avatar_id: String(row.avatar_id ?? AVATARS[0].id),
    rank_tier: Number(row.rank_tier ?? 1),
    rank_division: (Number(row.rank_division ?? 3) as 1 | 2 | 3),
    level: Number(row.level ?? 1),
    value: Number(row.value ?? 0),
    detail:
      input.type === 'deep_road'
        ? `Zone ${row.current_zone ?? 1} · Monster ${Number(row.current_monster_index ?? 0) + 1}`
        : undefined,
    is_self: String(row.user_id) === input.character.user_id,
  }));
}

/** The player's own row, for the sticky footer when outside the top 100. */
export function selfEntry(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries.find((e) => e.is_self);
}

export const BOARD_LABELS: Record<LeaderboardType, string> = {
  friends: 'Friends',
  guild: 'Guild',
  weekly: 'Weekly',
  rank_tier: 'My Rank',
  global: 'Global',
  slayers: 'Slayers',
  deep_road: 'Deep Road',
};

export const BOARD_DESCRIPTIONS: Record<LeaderboardType, string> = {
  friends: 'Warriors you follow, by XP earned this week.',
  guild: 'Your guild, by XP earned this week.',
  weekly: 'Everyone, by XP earned this week. Resets Monday 00:00 UTC.',
  rank_tier: 'Only warriors at your exact rank and division.',
  global: 'Lifetime XP, since the first day.',
  slayers: 'Total monsters put down, all time.',
  deep_road: 'Furthest position on the road to the Throne.',
};

export const BOARD_UNITS: Record<LeaderboardType, string> = {
  friends: 'XP',
  guild: 'XP',
  weekly: 'XP',
  rank_tier: 'XP',
  global: 'XP',
  slayers: 'kills',
  deep_road: '',
};
