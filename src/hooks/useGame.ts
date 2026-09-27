/**
 * The hooks screens actually use.
 *
 * Each derived object or array is built with `useMemo` over stable store
 * slices, never inside a Zustand selector. See the header of
 * `@/state/selectors` for why that distinction matters — getting it wrong
 * puts React into an infinite render loop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/state';
import {
  computeAvailableMoves,
  computeCombatTotals,
  computeCurrentMonster,
  computeEffectiveStats,
  computeGear,
  computeHabitSlots,
  computeRankState,
  computeTodayHabits,
  computeUnansweredTaunts,
  selectComboToday,
  selectCurrentZone,
  selectIsFallen,
  selectLevelProgress,
  selectWeeklyXp,
  selectXpToNext,
} from '@/state/selectors';
import { snapshotOf } from '@/game/battle/combat';
import { estimateStrikesRemaining } from '@/game/battle/damage';
import { previewHabitReward } from '@/game/habits/xp';
import { today as todayISO, msUntilWeeklyReset } from '@/lib/date';
import type { Habit } from '@/types';

/* ------------------------------------------------------------------ */
/* Primitive building blocks                                           */
/* ------------------------------------------------------------------ */

/** Equipped gear totals. Recomputed only when the equipped map changes. */
export function useGear() {
  const equipped = useGameStore((s) => s.equipped);
  return useMemo(() => computeGear(equipped), [equipped]);
}

export function useEffectiveStats() {
  const character = useGameStore((s) => s.character);
  const gear = useGear();
  return useMemo(() => computeEffectiveStats(character, gear), [character, gear]);
}

export function useCombatTotals() {
  const character = useGameStore((s) => s.character);
  const effects = useGameStore((s) => s.activeEffects);
  const gear = useGear();
  const stats = useEffectiveStats();

  return useMemo(
    () => computeCombatTotals(character, gear, stats, effects),
    [character, gear, stats, effects],
  );
}

export function useRankState() {
  const rankXp = useGameStore((s) => s.character?.rank_xp ?? null);
  return useMemo(() => computeRankState(rankXp), [rankXp]);
}

export function useCurrentMonster() {
  // Subscribing to primitives keeps this stable between real position changes.
  const zone = useGameStore((s) => s.character?.current_zone ?? null);
  const index = useGameStore((s) => s.character?.current_monster_index ?? null);
  const override = useGameStore((s) => s.encounterOverride);

  return useMemo(() => computeCurrentMonster(zone, index, override), [zone, index, override]);
}

export function useTodayHabits() {
  const habits = useGameStore((s) => s.habits);
  const logs = useGameStore((s) => s.logs);
  return useMemo(() => computeTodayHabits(habits, logs), [habits, logs]);
}

export function useUnansweredTaunts() {
  const taunts = useGameStore((s) => s.taunts);
  return useMemo(() => computeUnansweredTaunts(taunts), [taunts]);
}

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

export function useCharacter() {
  const character = useGameStore((s) => s.character);
  const levelProgress = useGameStore(selectLevelProgress);
  const xpToNext = useGameStore(selectXpToNext);

  const totals = useCombatTotals();
  const stats = useEffectiveStats();
  const gear = useGear();
  const rank = useRankState();

  return { character, totals, stats, gear, rank, levelProgress, xpToNext };
}

/* ------------------------------------------------------------------ */
/* Battle                                                              */
/* ------------------------------------------------------------------ */

export function useBattle() {
  const character = useGameStore((s) => s.character);
  const combatLog = useGameStore((s) => s.combatLog);
  const lastDamage = useGameStore((s) => s.lastDamage);
  const zone = useGameStore(selectCurrentZone);
  const fallen = useGameStore(selectIsFallen);
  const combo = useGameStore(selectComboToday);

  const monster = useCurrentMonster();
  const gear = useGear();
  const stats = useEffectiveStats();

  const snapshot = useMemo(
    () => (character ? { ...snapshotOf(character, gear), stats } : null),
    [character, gear, stats],
  );

  const monsterHp = character?.current_monster_hp ?? 0;

  /** Conservative "moves to kill" estimate at medium intensity. */
  const strikesRemaining = useMemo(() => {
    if (!snapshot || !monster) return 0;
    return estimateStrikesRemaining(snapshot, monster, monsterHp, 3, combo);
  }, [snapshot, monster, monsterHp, combo]);

  /** Preview a habit's damage without rolling a crit. */
  const previewDamage = useCallback(
    (habit: Habit): number => {
      if (!snapshot || !monster) return 0;
      return previewHabitReward({
        habit,
        snapshot,
        habitsDoneToday: combo,
        monster,
        monsterHp,
      }).damage;
    },
    [snapshot, monster, monsterHp, combo],
  );

  return {
    character,
    monster,
    zone,
    combatLog,
    lastDamage,
    fallen,
    combo,
    snapshot,
    strikesRemaining,
    previewDamage,
  };
}

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export function useHabits() {
  const habits = useGameStore((s) => s.habits);
  const logs = useGameStore((s) => s.logs);
  const rankTier = useGameStore((s) => s.character?.rank_tier ?? null);

  const addHabit = useGameStore((s) => s.addHabit);
  const updateHabit = useGameStore((s) => s.updateHabit);
  const deleteHabit = useGameStore((s) => s.deleteHabit);
  const toggleHabitActive = useGameStore((s) => s.toggleHabitActive);
  const completeHabit = useGameStore((s) => s.completeHabit);

  const todayHabits = useTodayHabits();
  const availableMoves = useMemo(() => computeAvailableMoves(todayHabits), [todayHabits]);
  const slots = useMemo(() => computeHabitSlots(habits, rankTier), [habits, rankTier]);

  return {
    habits,
    logs,
    todayHabits,
    availableMoves,
    slots,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitActive,
    completeHabit,
  };
}

/* ------------------------------------------------------------------ */
/* Iblis                                                               */
/* ------------------------------------------------------------------ */

export function useIblis() {
  const taunts = useGameStore((s) => s.taunts);
  const activeTaunt = useGameStore((s) => s.activeTaunt);
  const replyToTaunt = useGameStore((s) => s.replyToTaunt);
  const dismissTaunt = useGameStore((s) => s.dismissTaunt);
  const maybeFireTaunt = useGameStore((s) => s.maybeFireTaunt);
  const moraleExpires = useGameStore((s) => s.character?.morale_buff_expires ?? null);

  const moraleActive = Boolean(
    moraleExpires && new Date(moraleExpires).getTime() > Date.now(),
  );

  return { taunts, activeTaunt, replyToTaunt, dismissTaunt, maybeFireTaunt, moraleActive };
}

/* ------------------------------------------------------------------ */
/* Daily rollover                                                      */
/* ------------------------------------------------------------------ */

/**
 * Runs day-rollover housekeeping once per calendar day, and again if the tab
 * is left open across midnight.
 */
export function useDailyRollover() {
  const runDailyRollover = useGameStore((s) => s.runDailyRollover);
  const expireEffects = useGameStore((s) => s.expireEffects);
  const hydrated = useGameStore((s) => s.hydrated);
  const hasCharacter = useGameStore((s) => s.character !== null);
  const lastRun = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !hasCharacter) return;

    const run = () => {
      const date = todayISO();
      if (lastRun.current === date) return;
      lastRun.current = date;
      runDailyRollover(date);
      expireEffects();
    };

    run();

    // Check every five minutes so a tab left open overnight still rolls over.
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hydrated, hasCharacter, runDailyRollover, expireEffects]);
}

/* ------------------------------------------------------------------ */
/* Weekly reset clock                                                  */
/* ------------------------------------------------------------------ */

export function useWeeklyResetCountdown() {
  const [remaining, setRemaining] = useState(() => msUntilWeeklyReset());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(msUntilWeeklyReset()), 1000);
    return () => clearInterval(interval);
  }, []);

  return remaining;
}

export function useWeeklyXp() {
  return useGameStore(selectWeeklyXp);
}
