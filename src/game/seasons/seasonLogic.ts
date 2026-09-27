/**
 * Seasons: 6-8 week cycles with a soft rank reset and a 50-tier pass.
 * Zone progress never resets — only standing does.
 */

import type { ISODate, Season, SeasonProgress, SeasonTier } from '@/types';
import { dayDiff, toISODate } from '@/game/habits/streaks';
import { MAX_TIER, rankStateForXp, getRankDef, tierCeiling } from '@/game/ranks/rankLogic';

export const SEASON_LENGTH_DAYS = 49; // seven weeks
export const SEASON_TIERS = 50;

export const SEASONS: Season[] = [
  {
    id: 'season_1',
    number: 1,
    name: 'Season of Sabr',
    theme: 'Patience under weight. The first road is the longest.',
    start_date: '2026-09-07',
    end_date: '2026-10-26',
  },
  {
    id: 'season_2',
    number: 2,
    name: 'Season of Yaqin',
    theme: 'Certainty. The whispers get louder the closer you get.',
    start_date: '2026-10-26',
    end_date: '2026-12-14',
  },
  {
    id: 'season_3',
    number: 3,
    name: 'Season of Ihsan',
    theme: 'Excellence when nobody is watching.',
    start_date: '2026-12-14',
    end_date: '2027-02-01',
  },
];

/** XP required to reach a pass tier. The curve steepens gently. */
export function seasonTierXp(tier: number): number {
  return Math.round(500 * tier * (1 + tier / 100));
}

const FREE_REWARDS = [
  '250 coins',
  'Health Potion',
  '500 coins',
  'Morale Scroll',
  'Reroll Monster',
  '1,000 coins',
  'XP Boost 2x',
  'Streak Freeze',
  '2,000 coins',
  'Combo Charm',
];

const PREMIUM_REWARDS = [
  'Seasonal avatar frame',
  'Ember trail cosmetic',
  'Seasonal banner',
  'Gold-foil profile frame',
  'Seasonal aura',
  'Boss skin variant',
  'Seasonal weapon skin',
  'Animated rank badge',
  'Seasonal cloak',
  'Season emblem',
];

/** The full 50-tier pass for a season. */
export function buildSeasonPass(): SeasonTier[] {
  return Array.from({ length: SEASON_TIERS }, (_, i) => {
    const tier = i + 1;
    return {
      tier,
      free_reward:
        tier === SEASON_TIERS
          ? 'Season badge (permanent)'
          : FREE_REWARDS[i % FREE_REWARDS.length],
      premium_reward:
        tier === SEASON_TIERS
          ? 'Legendary seasonal set'
          : PREMIUM_REWARDS[i % PREMIUM_REWARDS.length],
      xp_required: seasonTierXp(tier),
    };
  });
}

export const SEASON_PASS = buildSeasonPass();

/* ------------------------------------------------------------------ */
/* Season state                                                        */
/* ------------------------------------------------------------------ */

export function currentSeason(today: ISODate = toISODate(new Date())): Season | undefined {
  return SEASONS.find((s) => dayDiff(s.start_date, today) >= 0 && dayDiff(today, s.end_date) >= 0);
}

export function daysRemaining(season: Season, today: ISODate = toISODate(new Date())): number {
  return Math.max(0, dayDiff(today, season.end_date));
}

/** 0-1 progress through the season calendar. */
export function seasonProgress(season: Season, today: ISODate = toISODate(new Date())): number {
  const total = dayDiff(season.start_date, season.end_date);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, dayDiff(season.start_date, today) / total));
}

/** Pass tier reached for an amount of season XP. */
export function tierForSeasonXp(seasonXp: number): number {
  let tier = 0;
  for (const t of SEASON_PASS) {
    if (seasonXp >= t.xp_required) tier = t.tier;
  }
  return tier;
}

/** Progress toward the next pass tier, 0-1. */
export function passTierProgress(seasonXp: number): number {
  const tier = tierForSeasonXp(seasonXp);
  if (tier >= SEASON_TIERS) return 1;

  const floor = tier === 0 ? 0 : seasonTierXp(tier);
  const ceiling = seasonTierXp(tier + 1);
  const span = ceiling - floor;
  return span <= 0 ? 1 : Math.min(1, (seasonXp - floor) / span);
}

export function unclaimedFree(progress: SeasonProgress): number[] {
  const reached = tierForSeasonXp(progress.season_xp);
  return SEASON_PASS.filter((t) => t.tier <= reached && !progress.claimed_free.includes(t.tier)).map(
    (t) => t.tier,
  );
}

export function unclaimedPremium(progress: SeasonProgress): number[] {
  if (!progress.premium) return [];
  const reached = tierForSeasonXp(progress.season_xp);
  return SEASON_PASS.filter(
    (t) => t.tier <= reached && !progress.claimed_premium.includes(t.tier),
  ).map((t) => t.tier);
}

/* ------------------------------------------------------------------ */
/* Soft reset                                                          */
/* ------------------------------------------------------------------ */

export interface SoftResetResult {
  rank_xp_before: number;
  rank_xp_after: number;
  tier_before: number;
  tier_after: number;
  tiers_dropped: number;
}

/**
 * Season rollover drops the player one tier (two from tier 8 and above,
 * where the climb is longest) and places them at the entry XP of that tier.
 * Nobody ever falls below Muhajir.
 */
export function applySoftReset(rankXp: number): SoftResetResult {
  const before = rankStateForXp(rankXp);
  const drop = before.tier >= 8 ? 2 : 1;
  const targetTier = Math.max(1, before.tier - drop);

  // Land in division III of the target tier — two thirds of the way is
  // too generous, the floor is too harsh.
  const floor = getRankDef(targetTier).xp_required;
  const ceiling = tierCeiling(targetTier);
  const span = Number.isFinite(ceiling) ? ceiling - floor : 0;
  const after = Math.round(floor + span / 6);

  return {
    rank_xp_before: rankXp,
    rank_xp_after: Math.min(rankXp, after),
    tier_before: before.tier,
    tier_after: rankStateForXp(Math.min(rankXp, after)).tier,
    tiers_dropped: Math.min(drop, before.tier - 1),
  };
}

/** End-of-season reward bracket for a final leaderboard position. */
export function seasonRewardFor(
  position: number,
  activeDays: number,
): { tier: string; reward: string } {
  if (position <= 3) {
    return { tier: 'Top 3', reward: 'Legendary gear + Hall of Legends entry' };
  }
  if (position <= 100) {
    return { tier: 'Top 100', reward: 'Epic cosmetic' };
  }
  if (activeDays >= 30) {
    return { tier: 'Veteran', reward: 'Rare cosmetic' };
  }
  return { tier: 'Participant', reward: 'Season badge' };
}

/** Seasonal boss skin name for a zone — same fight, new face. */
export function seasonalBossSkin(season: Season, bossName: string): string {
  const prefix = season.name.replace('Season of ', '');
  return `${bossName} of ${prefix}`;
}

export function isMaxTier(tier: number): boolean {
  return tier >= MAX_TIER;
}
