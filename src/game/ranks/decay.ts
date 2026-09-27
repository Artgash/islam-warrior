/**
 * Rank decay for absence, and the comeback bonus that rewards returning.
 *
 * Design rule from the brief: no shame mechanics. Decay never drops you below
 * the entry XP of your current division, and coming back within three days
 * pays more than the break cost.
 */

import type { ISODate } from '@/types';
import { COMEBACK_RANK_BONUS, COMEBACK_WINDOW_DAYS, DECAY_TIERS } from '@/game/constants';
import { divisionForXp, getRankDef, tierCeiling, tierForXp } from './rankLogic';

/** Whole days between two `yyyy-MM-dd` strings. */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** The decay percentage that applies after N days of inactivity. */
export function decayPercentForDays(days: number): number {
  for (const tier of DECAY_TIERS) {
    if (days >= tier.min_days && days <= tier.max_days) return tier.percent;
  }
  return 0;
}

/** The XP floor decay may not cross: the entry point of the current division. */
export function divisionFloor(rankXp: number): number {
  const tier = tierForXp(rankXp);
  const division = divisionForXp(rankXp);
  const floor = getRankDef(tier).xp_required;
  const ceiling = tierCeiling(tier);

  if (!Number.isFinite(ceiling)) return floor;

  const span = ceiling - floor;
  const divisionIndex = division === 3 ? 0 : division === 2 ? 1 : 2;
  return floor + (span * divisionIndex) / 3;
}

export interface DecayResult {
  applied: boolean;
  days_inactive: number;
  percent: number;
  xp_lost: number;
  rank_xp_after: number;
}

/** Apply decay for a stretch of inactivity, respecting the division floor. */
export function applyDecay(
  rankXp: number,
  lastActive: ISODate | null,
  today: ISODate,
): DecayResult {
  if (!lastActive) {
    return { applied: false, days_inactive: 0, percent: 0, xp_lost: 0, rank_xp_after: rankXp };
  }

  const days = daysBetween(lastActive, today);
  const percent = decayPercentForDays(days);

  if (percent === 0) {
    return { applied: false, days_inactive: days, percent: 0, xp_lost: 0, rank_xp_after: rankXp };
  }

  const floor = divisionFloor(rankXp);
  const proposed = rankXp * (1 - percent);
  const after = Math.max(floor, Math.round(proposed));

  return {
    applied: after < rankXp,
    days_inactive: days,
    percent,
    xp_lost: rankXp - after,
    rank_xp_after: after,
  };
}

export interface ComebackResult {
  eligible: boolean;
  days_away: number;
  bonus_percent: number;
  bonus_xp: number;
}

/**
 * Returning within three days of breaking a streak pays a 15% rank-XP bonus.
 * The bonus is computed off current rank XP, so it scales with the player.
 */
export function evaluateComeback(
  rankXp: number,
  lastActive: ISODate | null,
  today: ISODate,
): ComebackResult {
  if (!lastActive) {
    return { eligible: false, days_away: 0, bonus_percent: 0, bonus_xp: 0 };
  }

  const days = daysBetween(lastActive, today);
  const eligible = days >= 2 && days <= COMEBACK_WINDOW_DAYS + 1;

  if (!eligible) {
    return { eligible: false, days_away: days, bonus_percent: 0, bonus_xp: 0 };
  }

  return {
    eligible: true,
    days_away: days,
    bonus_percent: COMEBACK_RANK_BONUS,
    bonus_xp: Math.round(rankXp * COMEBACK_RANK_BONUS),
  };
}

/** Days of inactivity before the next decay tier bites — drives the UI warning. */
export function daysUntilDecay(lastActive: ISODate | null, today: ISODate): number | null {
  if (!lastActive) return null;
  const days = daysBetween(lastActive, today);
  if (days >= 3) return 0;
  return 3 - days;
}
