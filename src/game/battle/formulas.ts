/**
 * Every derived battle number. Pure functions, no randomness, no I/O -
 * which makes the whole combat model unit-testable and portable.
 */

import type { CombatantSnapshot, GearAggregate, Stats } from '@/types';
import {
  CHARISMA_COIN_DIVISOR,
  COMBO_MAX_MULTIPLIER,
  COMBO_STEP,
  DEFENSE_STAT_DIVISOR,
  ENDURANCE_HP_DIVISOR,
  ENDURANCE_REDUCTION_DIVISOR,
  FAITH_CRIT_DIVISOR,
  INTELLIGENCE_XP_DIVISOR,
  MAX_DODGE_CHANCE,
  MIN_MONSTER_DAMAGE,
  STRENGTH_ATTACK_DIVISOR,
} from '@/game/constants';
import { getRankDef } from '@/game/ranks/rankLogic';

export const EMPTY_GEAR: GearAggregate = {
  attack: 0,
  defense: 0,
  hp: 0,
  crit_chance: 0,
  crit_multiplier: 0,
  dodge: 0,
  xp_bonus: 0,
  coin_bonus: 0,
  all_stats: 0,
};

/* ------------------------------------------------------------------ */
/* Stat-derived bonuses                                                */
/* ------------------------------------------------------------------ */

/** Flat attack granted by Strength: +1 per 10 points. */
export function strengthAttackBonus(stats: Stats): number {
  return Math.floor(stats.strength / STRENGTH_ATTACK_DIVISOR);
}

/** Flat defense granted by the Defense stat: +1 per 10 points. */
export function defenseStatBonus(stats: Stats): number {
  return Math.floor(stats.defense_stat / DEFENSE_STAT_DIVISOR);
}

/** Flat damage reduction granted by Endurance: -1 per 20 points. */
export function enduranceReduction(stats: Stats): number {
  return Math.floor(stats.endurance / ENDURANCE_REDUCTION_DIVISOR);
}

/** XP multiplier from Intelligence: +1% per 10 points. */
export function intelligenceXpMultiplier(stats: Stats): number {
  return 1 + Math.floor(stats.intelligence / INTELLIGENCE_XP_DIVISOR) * 0.01;
}

/** Max-HP multiplier from Endurance: +1% per 10 points. */
export function enduranceHpMultiplier(stats: Stats): number {
  return 1 + Math.floor(stats.endurance / ENDURANCE_HP_DIVISOR) * 0.01;
}

/** Bonus crit chance from Faith: +1% per 20 points. */
export function faithCritBonus(stats: Stats): number {
  return Math.floor(stats.faith / FAITH_CRIT_DIVISOR) * 0.01;
}

/** Coin multiplier from Charisma: +1% per 10 points. */
export function charismaCoinMultiplier(stats: Stats): number {
  return 1 + Math.floor(stats.charisma / CHARISMA_COIN_DIVISOR) * 0.01;
}

/* ------------------------------------------------------------------ */
/* Combat multipliers                                                  */
/* ------------------------------------------------------------------ */

/** Each habit completed today adds 10%, capped so late-day chains stay sane. */
export function comboMultiplier(habitsDoneToday: number): number {
  return Math.min(COMBO_MAX_MULTIPLIER, 1 + COMBO_STEP * Math.max(0, habitsDoneToday));
}

/** Rank tiers grant a flat damage and XP multiplier. */
export function rankMultiplier(rankTier: number): number {
  return getRankDef(rankTier).multiplier;
}

/** Total crit chance: base + faith + gear, clamped to a sane ceiling. */
export function totalCritChance(snapshot: CombatantSnapshot): number {
  const raw = snapshot.crit_chance + faithCritBonus(snapshot.stats) + snapshot.gear.crit_chance;
  return clamp(raw, 0, 0.95);
}

/** Total crit multiplier: base plus any gear bonus. */
export function totalCritMultiplier(snapshot: CombatantSnapshot): number {
  return snapshot.crit_multiplier + snapshot.gear.crit_multiplier;
}

/** Dodge chance from boots, clamped so the player can never be untouchable. */
export function totalDodgeChance(gear: GearAggregate): number {
  return clamp(gear.dodge, 0, MAX_DODGE_CHANCE);
}

/* ------------------------------------------------------------------ */
/* Effective totals                                                    */
/* ------------------------------------------------------------------ */

export function effectiveAttack(snapshot: CombatantSnapshot): number {
  return snapshot.base_attack + snapshot.gear.attack + strengthAttackBonus(snapshot.stats);
}

export function effectiveDefense(snapshot: CombatantSnapshot): number {
  return snapshot.base_defense + snapshot.gear.defense + defenseStatBonus(snapshot.stats);
}

/**
 * Max HP after gear and Endurance.
 * `baseMaxHp` is the level-derived value stored on the character.
 */
export function effectiveMaxHp(baseMaxHp: number, gear: GearAggregate, stats: Stats): number {
  return Math.round((baseMaxHp + gear.hp) * enduranceHpMultiplier(stats));
}

/** Damage the monster lands after all mitigation. Always at least 1. */
export function mitigatedMonsterDamage(
  monsterAttack: number,
  snapshot: CombatantSnapshot,
): number {
  const mitigated =
    monsterAttack - effectiveDefense(snapshot) - enduranceReduction(snapshot.stats);
  return Math.max(MIN_MONSTER_DAMAGE, Math.round(mitigated));
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export function finalXp(baseXp: number, snapshot: CombatantSnapshot, xpBoost = 1): number {
  const total =
    baseXp *
    intelligenceXpMultiplier(snapshot.stats) *
    (1 + snapshot.gear.xp_bonus) *
    rankMultiplier(snapshot.rank_tier) *
    xpBoost;
  return Math.max(1, Math.round(total));
}

export function finalCoins(baseCoins: number, snapshot: CombatantSnapshot): number {
  const total =
    baseCoins * charismaCoinMultiplier(snapshot.stats) * (1 + snapshot.gear.coin_bonus);
  return Math.max(1, Math.round(total));
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
