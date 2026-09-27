/**
 * The ten-tier ladder from Muhajir to Khalifa, each split into three divisions.
 */

import type { RankDef, RankState } from '@/types';

/**
 * Habits are UNLIMITED at every rank.
 *
 * They were originally gated (3 slots at Muhajir, rising to 10 at Qa'id), but
 * capping them punished exactly the behaviour the game exists to encourage:
 * someone motivated enough to track twelve habits on day one should not be
 * told to come back later. Rank now buys multipliers and features, never
 * permission to build a habit.
 *
 * The field is kept on RankDef so the database column and existing rows stay
 * valid; it is simply the same value everywhere now.
 */
export const UNLIMITED_HABITS = 999;

export const RANKS: RankDef[] = [
  {
    tier: 1,
    name: 'Muhajir',
    arabic: 'المهاجر',
    english: 'The Migrant',
    color: '#6B7280',
    xp_required: 0,
    multiplier: 1.0,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['The road begins', 'Unlimited habits, from day one'],
  },
  {
    tier: 2,
    name: 'Talib',
    arabic: 'الطالب',
    english: 'The Seeker',
    color: '#92400E',
    xp_required: 500,
    multiplier: 1.05,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Shop access', 'Consumables unlocked'],
  },
  {
    tier: 3,
    name: 'Mujahid',
    arabic: 'المجاهد',
    english: 'The Striver',
    color: '#9CA3AF',
    xp_required: 2000,
    multiplier: 1.1,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Guilds unlocked', 'Combo Charm and Loot Luck'],
  },
  {
    tier: 4,
    name: 'Sabir',
    arabic: 'الصابر',
    english: 'The Patient',
    color: '#10B981',
    xp_required: 6000,
    multiplier: 1.15,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Streak Freeze unlocked'],
  },
  {
    tier: 5,
    name: 'Muqatil',
    arabic: 'المقاتل',
    english: 'The Fighter',
    color: '#3B82F6',
    xp_required: 15000,
    multiplier: 1.2,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['1v1 duels'],
  },
  {
    tier: 6,
    name: 'Farsan',
    arabic: 'الفارس',
    english: 'The Knight',
    color: '#D4AF37',
    xp_required: 35000,
    multiplier: 1.3,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Tournaments'],
  },
  {
    tier: 7,
    name: "Qa'id",
    arabic: 'القائد',
    english: 'The Commander',
    color: '#E5E7EB',
    xp_required: 75000,
    multiplier: 1.4,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Create a guild'],
  },
  {
    tier: 8,
    name: 'Sultan al-Nafs',
    arabic: 'سلطان النفس',
    english: 'King of the Self',
    color: '#1F2937',
    accent: '#D4AF37',
    xp_required: 150000,
    multiplier: 1.55,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Custom title'],
  },
  {
    tier: 9,
    name: 'Wali',
    arabic: 'الولي',
    english: 'The Saint',
    color: '#F9FAFB',
    accent: '#D4AF37',
    xp_required: 300000,
    multiplier: 1.7,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Legendary shop tier'],
  },
  {
    tier: 10,
    name: 'Khalifa',
    arabic: 'الخليفة',
    english: 'The Successor',
    color: '#FBBF24',
    accent: '#FBBF24',
    xp_required: 600000,
    multiplier: 2.0,
    max_habits: UNLIMITED_HABITS,
    unlocks: ['Hall of Legends'],
  },
];

const RANK_BY_TIER = new Map<number, RankDef>(RANKS.map((r) => [r.tier, r]));

export const MAX_TIER = RANKS.length;

export function getRankDef(tier: number): RankDef {
  const clamped = Math.min(MAX_TIER, Math.max(1, Math.floor(tier)));
  const def = RANK_BY_TIER.get(clamped);
  if (!def) throw new Error(`Unknown rank tier: ${tier}`);
  return def;
}

/** XP at which a tier ends (i.e. where the next tier begins). */
export function tierCeiling(tier: number): number {
  if (tier >= MAX_TIER) return Number.POSITIVE_INFINITY;
  return getRankDef(tier + 1).xp_required;
}

/** The tier a given lifetime rank-XP total sits in. */
export function tierForXp(rankXp: number): number {
  let tier = 1;
  for (const rank of RANKS) {
    if (rankXp >= rank.xp_required) tier = rank.tier;
  }
  return tier;
}

/**
 * Divisions split a tier's XP band into thirds and count downward:
 * III is the entry division, I means "ready for the next tier".
 */
export function divisionForXp(rankXp: number): 1 | 2 | 3 {
  const tier = tierForXp(rankXp);
  if (tier >= MAX_TIER) return 1;

  const floor = getRankDef(tier).xp_required;
  const ceiling = tierCeiling(tier);
  const span = ceiling - floor;
  if (span <= 0) return 1;

  const progress = (rankXp - floor) / span;
  if (progress < 1 / 3) return 3;
  if (progress < 2 / 3) return 2;
  return 1;
}

export function divisionLabel(division: 1 | 2 | 3): string {
  return division === 3 ? 'III' : division === 2 ? 'II' : 'I';
}

/** Full derived rank state for a lifetime rank-XP total. */
export function rankStateForXp(rankXp: number): RankState {
  const safeXp = Math.max(0, rankXp);
  const tier = tierForXp(safeXp);
  const division = divisionForXp(safeXp);
  const def = getRankDef(tier);

  const floor = def.xp_required;
  const ceiling = tierCeiling(tier);
  const span = Number.isFinite(ceiling) ? ceiling - floor : 0;

  const xpIntoTier = safeXp - floor;
  const tierProgress = span > 0 ? xpIntoTier / span : 1;

  // Progress within the current third of the tier.
  const divisionIndex = division === 3 ? 0 : division === 2 ? 1 : 2;
  const divisionProgress =
    span > 0 ? Math.min(1, Math.max(0, tierProgress * 3 - divisionIndex)) : 1;

  return {
    tier,
    division,
    rank_xp: safeXp,
    division_progress: divisionProgress,
    xp_into_tier: xpIntoTier,
    xp_for_tier: span,
    def,
  };
}

/** XP still required to reach the next tier, or null at Khalifa. */
export function xpToNextTier(rankXp: number): number | null {
  const tier = tierForXp(rankXp);
  if (tier >= MAX_TIER) return null;
  return Math.max(0, tierCeiling(tier) - rankXp);
}

export function rankMaxHabits(tier: number): number {
  return getRankDef(tier).max_habits;
}

export function hasShopAccess(tier: number): boolean {
  return tier >= 2;
}

export function hasGuildAccess(tier: number): boolean {
  return tier >= 3;
}

export function hasStreakFreeze(tier: number): boolean {
  return tier >= 4;
}

export function canCreateGuild(tier: number): boolean {
  return tier >= 7;
}

export function hasLegendaryShop(tier: number): boolean {
  return tier >= 9;
}

export function hasCustomTitle(tier: number): boolean {
  return tier >= 8;
}

/** Did a rank change occur between two XP totals? */
export function detectRankChange(
  beforeXp: number,
  afterXp: number,
): { changed: boolean; direction: 'up' | 'down'; from: RankState; to: RankState } {
  const from = rankStateForXp(beforeXp);
  const to = rankStateForXp(afterXp);
  const changed = from.tier !== to.tier || from.division !== to.division;
  const direction: 'up' | 'down' =
    to.tier > from.tier || (to.tier === from.tier && to.division < from.division) ? 'up' : 'down';
  return { changed, direction, from, to };
}
