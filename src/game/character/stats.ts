/**
 * Which stat a habit feeds, and the daily cap that stops grinding.
 */

import type { HabitCategory, HabitLog, ISODate, StatKey, Stats } from '@/types';
import { EMPTY_STATS, STAT_DAILY_CAP, STAT_MAX } from '@/game/constants';

/** Each habit category trains exactly one stat. */
export const CATEGORY_TO_STAT: Record<HabitCategory, StatKey> = {
  faith: 'faith',
  intelligence: 'intelligence',
  strength: 'strength',
  charisma: 'charisma',
  discipline: 'endurance',
  bad_habit: 'defense_stat',
};

export function statForCategory(category: HabitCategory): StatKey {
  return CATEGORY_TO_STAT[category];
}

/**
 * How many points of a stat the player has already earned today.
 * Used to enforce the +5/day cap per stat.
 */
export function statGainedToday(logs: HabitLog[], stat: StatKey, date: ISODate): number {
  return logs.filter((log) => log.date === date && CATEGORY_TO_STAT[log.category] === stat).length;
}

/**
 * Award +1 to the stat a category trains, respecting the daily cap and the
 * absolute ceiling of 999. Returns the new stats plus whether a point landed.
 */
export function awardStatPoint(
  stats: Stats,
  category: HabitCategory,
  logs: HabitLog[],
  date: ISODate,
): { stats: Stats; gained: boolean; stat: StatKey } {
  const stat = statForCategory(category);
  const already = statGainedToday(logs, stat, date);

  if (already >= STAT_DAILY_CAP || stats[stat] >= STAT_MAX) {
    return { stats, gained: false, stat };
  }

  return {
    stats: { ...stats, [stat]: Math.min(STAT_MAX, stats[stat] + 1) },
    gained: true,
    stat,
  };
}

/** Sum of all six stats — the headline "power" number on the character sheet. */
export function totalStatPoints(stats: Stats): number {
  return (Object.keys(stats) as StatKey[]).reduce((sum, key) => sum + stats[key], 0);
}

/** Apply an archetype's starting bonus to a blank stat block. */
export function withArchetypeBonus(bonus: Partial<Stats>): Stats {
  const next: Stats = { ...EMPTY_STATS };
  (Object.keys(bonus) as StatKey[]).forEach((key) => {
    next[key] = Math.min(STAT_MAX, (bonus[key] ?? 0));
  });
  return next;
}

/** Add a flat bonus to every stat (Rings grant `all_stats`). */
export function withAllStatsBonus(stats: Stats, bonus: number): Stats {
  if (bonus <= 0) return stats;
  const next = { ...stats };
  (Object.keys(next) as StatKey[]).forEach((key) => {
    next[key] = Math.min(STAT_MAX, next[key] + bonus);
  });
  return next;
}

/** Normalised 0-1 values for the six-axis hexagon on the character screen. */
export function statsForHexagon(stats: Stats): { key: StatKey; value: number; normal: number }[] {
  const max = Math.max(10, ...(Object.keys(stats) as StatKey[]).map((k) => stats[k]));
  return (Object.keys(stats) as StatKey[]).map((key) => ({
    key,
    value: stats[key],
    normal: stats[key] / max,
  }));
}
