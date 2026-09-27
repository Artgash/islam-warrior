/**
 * The strike itself.
 *
 * Randomness enters through an injected `rng` so tests can pin crits and
 * dodges, and so the server can replay a move deterministically.
 */

import type {
  AttackResult,
  CombatantSnapshot,
  CounterAttackResult,
  DamageBreakdown,
  HabitIntensity,
  Monster,
} from '@/types';
import { INTENSITY_TABLE } from '@/game/constants';
import {
  comboMultiplier,
  effectiveAttack,
  mitigatedMonsterDamage,
  rankMultiplier,
  strengthAttackBonus,
  totalCritChance,
  totalCritMultiplier,
  totalDodgeChance,
} from './formulas';

export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

export interface StrikeInput {
  snapshot: CombatantSnapshot;
  intensity: HabitIntensity;
  habitsDoneToday: number;
  monster: Monster;
  monsterHp: number;
  /** Ignores the monster's defense - used by the Combo Charm. */
  pierceDefense?: boolean;
  rng?: Rng;
}

/**
 * damage = (base_atk + gear_atk + strength_bonus)
 *          x intensity x combo x crit x morale x rank
 * then reduced by the monster's defense, floored at 1.
 */
export function resolveStrike(input: StrikeInput): AttackResult {
  const { snapshot, intensity, habitsDoneToday, monster, monsterHp } = input;
  const rng = input.rng ?? defaultRng;

  const baseAttack = snapshot.base_attack;
  const gearAttack = snapshot.gear.attack;
  const strengthBonus = strengthAttackBonus(snapshot.stats);

  const intensityMult = INTENSITY_TABLE[intensity].damage_multiplier;
  const combo = comboMultiplier(habitsDoneToday);
  const morale = snapshot.morale_multiplier;
  const rank = rankMultiplier(snapshot.rank_tier);

  const wasCrit = rng() < totalCritChance(snapshot);
  const critMult = wasCrit ? totalCritMultiplier(snapshot) : 1;

  const raw =
    effectiveAttack(snapshot) * intensityMult * combo * critMult * morale * rank;

  const afterDefense = input.pierceDefense ? raw : raw - monster.defense;
  const damage = Math.max(1, Math.round(afterDefense));

  const hpAfter = Math.max(0, monsterHp - damage);

  const breakdown: DamageBreakdown = {
    base_attack: baseAttack,
    gear_attack: gearAttack,
    strength_bonus: strengthBonus,
    intensity: intensityMult,
    combo_multiplier: combo,
    crit_multiplier: critMult,
    morale_multiplier: morale,
    rank_multiplier: rank,
    total: damage,
  };

  return {
    damage,
    was_crit: wasCrit,
    combo: habitsDoneToday,
    monster_hp_after: hpAfter,
    monster_killed: hpAfter <= 0,
    breakdown,
  };
}

export interface CounterInput {
  snapshot: CombatantSnapshot;
  monster: Monster;
  playerHp: number;
  rng?: Rng;
}

/** The monster answers. Boots can turn the blow aside entirely. */
export function resolveCounterAttack(input: CounterInput): CounterAttackResult {
  const { snapshot, monster, playerHp } = input;
  const rng = input.rng ?? defaultRng;

  if (rng() < totalDodgeChance(snapshot.gear)) {
    return {
      damage: 0,
      dodged: true,
      player_hp_after: playerHp,
      player_fallen: false,
    };
  }

  const damage = mitigatedMonsterDamage(monster.attack, snapshot);
  const hpAfter = Math.max(0, playerHp - damage);

  return {
    damage,
    dodged: false,
    player_hp_after: hpAfter,
    player_fallen: hpAfter <= 0,
  };
}

/**
 * How many strikes of a given intensity remain before this monster dies.
 * Drives the "X moves to kill" hint on the battle screen.
 */
export function estimateStrikesRemaining(
  snapshot: CombatantSnapshot,
  monster: Monster,
  monsterHp: number,
  intensity: HabitIntensity,
  habitsDoneToday: number,
): number {
  const perStrike = resolveStrike({
    snapshot,
    intensity,
    habitsDoneToday,
    monster,
    monsterHp,
    rng: () => 1, // never crit, so the estimate is conservative
  }).damage;

  if (perStrike <= 0) return Infinity;
  return Math.ceil(monsterHp / perStrike);
}
