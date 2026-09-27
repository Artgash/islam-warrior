/**
 * The level curve and everything a level-up grants.
 */

import {
  ATTACK_PER_LEVEL,
  BASE_MOVE_SLOTS,
  COINS_PER_LEVEL,
  DEFENSE_PER_LEVEL,
  HP_PER_LEVEL,
  LEVELS_PER_MOVE_SLOT,
  MAX_MOVE_SLOTS,
  STARTING_ATTACK,
  STARTING_DEFENSE,
  STARTING_HP,
} from '@/game/constants';

/**
 * XP required to advance FROM level `n` to level `n + 1`.
 *   1-10   -> 100 x N
 *   11-30  -> 150 x N
 *   31-60  -> 250 x N
 *   61-100 -> 400 x N
 *   100+   -> 600 x N
 */
export function xpToNextLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  if (n <= 10) return 100 * n;
  if (n <= 30) return 150 * n;
  if (n <= 60) return 250 * n;
  if (n <= 100) return 400 * n;
  return 600 * n;
}

/** Cumulative XP needed to reach a level from a fresh character. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n += 1) total += xpToNextLevel(n);
  return total;
}

export interface LevelUpGains {
  levels_gained: number;
  hp_gained: number;
  attack_gained: number;
  defense_gained: number;
  coins_gained: number;
  move_slots_gained: number;
  new_level: number;
  /** Remaining XP carried into the new level. */
  xp_remainder: number;
}

/**
 * Apply XP and roll forward through every level it crosses.
 * Handles multi-level jumps from a single large reward.
 */
export function applyXp(currentLevel: number, currentXp: number, gainedXp: number): LevelUpGains {
  let level = currentLevel;
  let xp = currentXp + gainedXp;

  let hp = 0;
  let attack = 0;
  let defense = 0;
  let coins = 0;
  let slots = 0;

  const startingSlots = moveSlotsForLevel(currentLevel);

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;

    hp += HP_PER_LEVEL;
    attack += ATTACK_PER_LEVEL;
    defense += DEFENSE_PER_LEVEL;
    coins += COINS_PER_LEVEL * level;
  }

  slots = moveSlotsForLevel(level) - startingSlots;

  return {
    levels_gained: level - currentLevel,
    hp_gained: hp,
    attack_gained: attack,
    defense_gained: defense,
    coins_gained: coins,
    move_slots_gained: slots,
    new_level: level,
    xp_remainder: xp,
  };
}

/** Move slots unlock every 3 levels, from 3 up to a hard cap of 10. */
export function moveSlotsForLevel(level: number): number {
  const earned = BASE_MOVE_SLOTS + Math.floor((level - 1) / LEVELS_PER_MOVE_SLOT);
  return Math.min(MAX_MOVE_SLOTS, earned);
}

/** Base (pre-gear, pre-Endurance) max HP for a level. */
export function baseMaxHpForLevel(level: number): number {
  return STARTING_HP + (level - 1) * HP_PER_LEVEL;
}

export function baseAttackForLevel(level: number): number {
  return STARTING_ATTACK + (level - 1) * ATTACK_PER_LEVEL;
}

export function baseDefenseForLevel(level: number): number {
  return STARTING_DEFENSE + (level - 1) * DEFENSE_PER_LEVEL;
}

/** 0-1 progress through the current level. */
export function levelProgress(level: number, xp: number): number {
  const needed = xpToNextLevel(level);
  if (needed <= 0) return 0;
  return Math.min(1, xp / needed);
}
