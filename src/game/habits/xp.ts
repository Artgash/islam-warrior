/**
 * Turning one completed habit into XP, coins and damage.
 * This is the single place where "a real-world action" becomes "a game move".
 */

import type {
  CombatantSnapshot,
  Habit,
  HabitCategory,
  HabitIntensity,
  Monster,
} from '@/types';
import { resolveStrike, type Rng } from '@/game/battle/damage';
import { finalCoins, finalXp } from '@/game/battle/formulas';
import { baseCoinsFor, baseXpFor } from './intensity';

export interface HabitRewardInput {
  habit: Pick<Habit, 'name' | 'category' | 'intensity'>;
  snapshot: CombatantSnapshot;
  habitsDoneToday: number;
  monster: Monster;
  monsterHp: number;
  xpBoost?: number;
  pierceDefense?: boolean;
  rng?: Rng;
}

export interface HabitReward {
  xp: number;
  coins: number;
  damage: number;
  was_crit: boolean;
  monster_hp_after: number;
  monster_killed: boolean;
  combo: number;
}

/** Resolve a habit completion into its full reward package. */
export function resolveHabitCompletion(input: HabitRewardInput): HabitReward {
  const { habit, snapshot, habitsDoneToday, monster, monsterHp } = input;

  const strike = resolveStrike({
    snapshot,
    intensity: habit.intensity,
    habitsDoneToday,
    monster,
    monsterHp,
    pierceDefense: input.pierceDefense,
    rng: input.rng,
  });

  const xp = finalXp(baseXpFor(habit.intensity, habit.category), snapshot, input.xpBoost ?? 1);
  const coins = finalCoins(baseCoinsFor(habit.intensity, habit.category), snapshot);

  return {
    xp,
    coins,
    damage: strike.damage,
    was_crit: strike.was_crit,
    monster_hp_after: strike.monster_hp_after,
    monster_killed: strike.monster_killed,
    combo: habitsDoneToday,
  };
}

/** Preview the reward without rolling a crit — used by move-button tooltips. */
export function previewHabitReward(
  input: Omit<HabitRewardInput, 'rng'>,
): HabitReward {
  return resolveHabitCompletion({ ...input, rng: () => 1 });
}

/** XP awarded for killing a monster, after every multiplier. */
export function monsterKillXp(
  monster: Monster,
  snapshot: CombatantSnapshot,
  xpBoost = 1,
): number {
  return finalXp(monster.xp_reward, snapshot, xpBoost);
}

export function monsterKillCoins(monster: Monster, snapshot: CombatantSnapshot): number {
  return finalCoins(monster.coin_reward, snapshot);
}

/** Human-readable summary line for the combat log. */
export function describeReward(reward: HabitReward, category: HabitCategory): string {
  const verb = category === 'bad_habit' ? 'Resisted' : 'Completed';
  return `${verb}: +${reward.xp} XP, +${reward.coins} coins, ${reward.damage.toLocaleString()} damage`;
}

export function isBadHabit(category: HabitCategory): boolean {
  return category === 'bad_habit';
}

export function intensityOf(habit: Pick<Habit, 'intensity'>): HabitIntensity {
  return habit.intensity;
}
