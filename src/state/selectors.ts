/**
 * Derived reads over the store.
 *
 * IMPORTANT - why this file is split the way it is:
 *
 * Zustand v5 subscribes through `useSyncExternalStore`, which requires a
 * selector to return a REFERENTIALLY STABLE value for unchanged state. A
 * selector that builds a fresh object or array on every call (`{...}`,
 * `.map()`, `.filter()`) returns a new reference each time React reads the
 * snapshot, so React never settles and throws "Maximum update depth exceeded".
 *
 * So:
 *   - `select*` functions below return PRIMITIVES ONLY (or a reference into
 *     static game data). They are safe to pass straight to `useGameStore(...)`.
 *   - Anything that builds an object or array is a plain `compute*` function
 *     taking explicit arguments. Components reach these through the memoised
 *     hooks in `@/hooks/useGame`, which subscribe to stable slices and derive
 *     with `useMemo`.
 *
 * Never pass a `compute*` function to `useGameStore`. The selector-stability
 * suite in `src/state/__tests__/loop.test.ts` enforces this automatically for
 * every exported `select*`.
 */

import type { GameStore } from './types';
import type {
  ActiveEffect,
  Character,
  EquippedMap,
  GearAggregate,
  Habit,
  HabitLog,
  Monster,
  RankState,
  Stats,
  TauntLog,
} from '@/types';
import { getMonster } from '@/game/zones/monsters';
import { getZone } from '@/game/zones/zones';
import { aggregateEquipped } from '@/game/shop/gearStats';
import { withAllStatsBonus } from '@/game/character/stats';
import {
  effectiveAttack,
  effectiveDefense,
  effectiveMaxHp,
  totalCritChance,
} from '@/game/battle/formulas';
import { snapshotOf, moraleMultiplier, xpBoostMultiplier } from '@/game/battle/combat';
import { rankStateForXp, rankMaxHabits } from '@/game/ranks/rankLogic';
import { levelProgress, xpToNextLevel } from '@/game/character/leveling';
import {
  comboCountFor,
  isScheduledOn,
  wasCompletedOn,
  hasMetWeeklyTarget,
} from '@/game/habits/streaks';
import { today as todayISO, isThisWeek } from '@/lib/date';

/* ================================================================== */
/* PRIMITIVE SELECTORS - safe to pass to useGameStore                  */
/* ================================================================== */

export function selectLevelProgress(state: GameStore): number {
  const character = state.character;
  if (!character) return 0;
  return levelProgress(character.level, character.xp);
}

export function selectXpToNext(state: GameStore): number {
  const character = state.character;
  if (!character) return 0;
  return xpToNextLevel(character.level);
}

export function selectComboToday(state: GameStore): number {
  return comboCountFor(state.logs, todayISO());
}

export function selectIsFallen(state: GameStore): boolean {
  return Boolean(state.character?.fallen_at);
}

/** XP earned since the last Monday 00:00 UTC reset. */
export function selectWeeklyXp(state: GameStore): number {
  let total = 0;
  for (const log of state.logs) {
    if (isThisWeek(log.created_at)) total += log.xp_gained;
  }
  return total;
}

export function selectWeeklyHabits(state: GameStore): number {
  let count = 0;
  for (const log of state.logs) {
    if (isThisWeek(log.created_at)) count += 1;
  }
  return count;
}

export function selectUnreadNotifications(state: GameStore): number {
  let count = 0;
  for (const n of state.notifications) {
    if (!n.read) count += 1;
  }
  return count;
}

export function selectHasStreakFreeze(state: GameStore): boolean {
  return state.activeEffects.some((e) => e.effect === 'streak_freeze' && (e.charges ?? 0) > 0);
}

export function selectAnsweredTauntCount(state: GameStore): number {
  let count = 0;
  for (const t of state.taunts) {
    if (t.replied_at !== null) count += 1;
  }
  return count;
}

export function selectUnansweredTauntCount(state: GameStore): number {
  let count = 0;
  for (const t of state.taunts) {
    if (t.replied_at === null) count += 1;
  }
  return count;
}

export function selectCompletedTodayCount(state: GameStore): number {
  const date = todayISO();
  let count = 0;
  for (const habit of state.habits) {
    if (!habit.is_active || !isScheduledOn(habit, date)) continue;
    if (wasCompletedOn(state.logs, habit.id, date)) count += 1;
  }
  return count;
}

/**
 * The current zone. Safe as a selector because `getZone` returns a reference
 * into the static ZONES array rather than constructing anything.
 */
export function selectCurrentZone(state: GameStore) {
  const character = state.character;
  if (!character) return null;
  return getZone(character.current_zone);
}

/* ================================================================== */
/* COMPUTE FUNCTIONS - NOT selectors. Use the hooks in @/hooks/useGame */
/* ================================================================== */

export function computeGear(equipped: EquippedMap): GearAggregate {
  return aggregateEquipped(equipped);
}

const ZERO_STATS: Stats = {
  strength: 0,
  defense_stat: 0,
  intelligence: 0,
  endurance: 0,
  faith: 0,
  charisma: 0,
};

/** Base stats plus any `all_stats` bonus from rings. */
export function computeEffectiveStats(
  character: Character | null,
  gear: GearAggregate,
): Stats {
  if (!character) return ZERO_STATS;
  return withAllStatsBonus(character.stats, gear.all_stats);
}

export interface CombatTotals {
  attack: number;
  defense: number;
  max_hp: number;
  crit_chance: number;
  morale: number;
  xp_boost: number;
}

export function computeCombatTotals(
  character: Character | null,
  gear: GearAggregate,
  stats: Stats,
  effects: ActiveEffect[],
): CombatTotals | null {
  if (!character) return null;

  const snapshot = { ...snapshotOf(character, gear), stats };

  return {
    attack: effectiveAttack(snapshot),
    defense: effectiveDefense(snapshot),
    max_hp: effectiveMaxHp(character.max_hp, gear, stats),
    crit_chance: totalCritChance(snapshot),
    morale: moraleMultiplier(character),
    xp_boost: xpBoostMultiplier(effects),
  };
}

/** The monster on screen, honouring an active Reroll substitution. */
export function computeCurrentMonster(
  zone: number | null,
  monsterIndex: number | null,
  override: number | null,
): Monster | null {
  if (zone === null || monsterIndex === null) return null;
  return getMonster(zone, override ?? monsterIndex);
}

export function computeRankState(rankXp: number | null): RankState | null {
  if (rankXp === null) return null;
  return rankStateForXp(rankXp);
}

export interface HabitSlots {
  used: number;
  max: number;
}

export function computeHabitSlots(habits: Habit[], rankTier: number | null): HabitSlots {
  const used = habits.reduce((count, h) => (h.is_active ? count + 1 : count), 0);
  return { used, max: rankTier === null ? 3 : rankMaxHabits(rankTier) };
}

export interface TodayHabit {
  habit: Habit;
  completed: boolean;
  /** Flexible habits that have already hit their weekly target. */
  target_met: boolean;
}

/** Habits scheduled for today, with their completion state. */
export function computeTodayHabits(habits: Habit[], logs: HabitLog[]): TodayHabit[] {
  const date = todayISO();
  return habits
    .filter((h) => h.is_active && isScheduledOn(h, date))
    .map((habit) => ({
      habit,
      completed: wasCompletedOn(logs, habit.id, date),
      target_met: hasMetWeeklyTarget(habit, logs, date),
    }));
}

/** Habits usable as moves right now: scheduled, not yet done today. */
export function computeAvailableMoves(todayHabits: TodayHabit[]): Habit[] {
  return todayHabits.filter((t) => !t.completed).map((t) => t.habit);
}

export function computeUnansweredTaunts(taunts: TauntLog[]): TauntLog[] {
  return taunts.filter((t) => t.replied_at === null);
}
