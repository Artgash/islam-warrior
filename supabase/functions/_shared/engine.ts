/**
 * Server-side combat and reward maths.
 *
 * WHY THIS EXISTS SEPARATELY FROM src/game:
 * Deno edge functions cannot resolve the app's `@/` path alias or its
 * extensionless imports, so the handful of formulas the server must own are
 * mirrored here. They are deliberately the *authoritative* copy — the client
 * computes the same numbers for instant feedback, but the server decides what
 * is actually written.
 *
 * KEEPING THEM IN SYNC:
 * The numbers below come from src/game/constants.ts, src/game/battle/
 * formulas.ts and src/game/ranks/rankLogic.ts. Change one, change the other.
 * The unit tests in src/game/__tests__ pin the canonical values.
 */

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export const INTENSITY = {
  1: { damage: 1, xp: 10, coins: 5 },
  2: { damage: 1.5, xp: 15, coins: 7 },
  3: { damage: 2, xp: 25, coins: 12 },
  4: { damage: 3, xp: 40, coins: 20 },
  5: { damage: 5, xp: 70, coins: 35 },
} as const;

export const BAD_HABIT_MULTIPLIER = 3;

/** tier -> damage/XP multiplier. */
export const RANK_MULTIPLIERS: Record<number, number> = {
  1: 1.0, 2: 1.05, 3: 1.1, 4: 1.15, 5: 1.2,
  6: 1.3, 7: 1.4, 8: 1.55, 9: 1.7, 10: 2.0,
};

export const RANK_THRESHOLDS = [
  0, 500, 2000, 6000, 15000, 35000, 75000, 150000, 300000, 600000,
];

export const COMBO_STEP = 0.1;
export const COMBO_MAX = 3.0;
export const MONSTERS_PER_ZONE = 16;
export const BOSS_INDEX = 15;
export const TOTAL_ZONES = 66;

export type Intensity = 1 | 2 | 3 | 4 | 5;

export interface CharacterRow {
  user_id: string;
  base_attack: number;
  base_defense: number;
  crit_chance: number;
  crit_multiplier: number;
  rank_tier: number;
  rank_xp: number;
  strength: number;
  defense_stat: number;
  intelligence: number;
  endurance: number;
  faith: number;
  charisma: number;
  morale_buff_percent: number;
  morale_buff_expires: string | null;
  hp: number;
  max_hp: number;
  current_zone: number;
  current_monster_index: number;
  current_monster_hp: string | number;
}

export interface GearTotals {
  attack: number;
  defense: number;
  hp: number;
  crit_chance: number;
  crit_multiplier: number;
  dodge: number;
  xp_bonus: number;
  coin_bonus: number;
  all_stats: number;
}

export const NO_GEAR: GearTotals = {
  attack: 0, defense: 0, hp: 0, crit_chance: 0, crit_multiplier: 0,
  dodge: 0, xp_bonus: 0, coin_bonus: 0, all_stats: 0,
};

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export function rankMultiplier(tier: number): number {
  return RANK_MULTIPLIERS[Math.min(10, Math.max(1, tier))] ?? 1;
}

export function tierForXp(rankXp: number): number {
  let tier = 1;
  RANK_THRESHOLDS.forEach((threshold, i) => {
    if (rankXp >= threshold) tier = i + 1;
  });
  return tier;
}

export function divisionForXp(rankXp: number): number {
  const tier = tierForXp(rankXp);
  if (tier >= 10) return 1;

  const floor = RANK_THRESHOLDS[tier - 1];
  const ceiling = RANK_THRESHOLDS[tier];
  const span = ceiling - floor;
  if (span <= 0) return 1;

  const ratio = (rankXp - floor) / span;
  if (ratio < 1 / 3) return 3;
  if (ratio < 2 / 3) return 2;
  return 1;
}

export function comboMultiplier(habitsToday: number): number {
  return Math.min(COMBO_MAX, 1 + COMBO_STEP * Math.max(0, habitsToday));
}

export function moraleMultiplier(character: CharacterRow): number {
  if (!character.morale_buff_expires) return 1;
  if (new Date(character.morale_buff_expires).getTime() <= Date.now()) return 1;
  return 1 + character.morale_buff_percent;
}

export function gearFrom(equipped: Record<string, unknown> | null, catalogue: Map<string, GearTotals>): GearTotals {
  const total = { ...NO_GEAR };
  if (!equipped) return total;

  for (const slot of ['sword', 'shield', 'armor', 'helmet', 'ring', 'boots']) {
    const id = equipped[slot];
    if (typeof id !== 'string') continue;
    const stats = catalogue.get(id);
    if (!stats) continue;

    total.attack += stats.attack;
    total.defense += stats.defense;
    total.hp += stats.hp;
    total.crit_chance += stats.crit_chance;
    total.crit_multiplier += stats.crit_multiplier;
    total.dodge += stats.dodge;
    total.xp_bonus += stats.xp_bonus;
    total.coin_bonus += stats.coin_bonus;
    total.all_stats += stats.all_stats;
  }

  return total;
}

/* ------------------------------------------------------------------ */
/* The strike                                                          */
/* ------------------------------------------------------------------ */

export interface StrikeResult {
  damage: number;
  was_crit: boolean;
  xp: number;
  coins: number;
}

export function resolveStrike(
  character: CharacterRow,
  gear: GearTotals,
  intensity: Intensity,
  category: string,
  habitsToday: number,
  monsterDefense: number,
  rng: () => number = Math.random,
): StrikeResult {
  const table = INTENSITY[intensity];
  const strengthBonus = Math.floor(character.strength / 10);

  const critChance = Math.min(
    0.95,
    character.crit_chance + Math.floor(character.faith / 20) * 0.01 + gear.crit_chance,
  );
  const wasCrit = rng() < critChance;
  const critMult = wasCrit ? character.crit_multiplier + gear.crit_multiplier : 1;

  const attack = character.base_attack + gear.attack + strengthBonus;
  const raw =
    attack *
    table.damage *
    comboMultiplier(habitsToday) *
    critMult *
    moraleMultiplier(character) *
    rankMultiplier(character.rank_tier);

  const damage = Math.max(1, Math.round(raw - monsterDefense));

  const isBadHabit = category === 'bad_habit';
  const baseXp = table.xp * (isBadHabit ? BAD_HABIT_MULTIPLIER : 1);
  const baseCoins = table.coins * (isBadHabit ? BAD_HABIT_MULTIPLIER : 1);

  const xp = Math.max(
    1,
    Math.round(
      baseXp *
        (1 + Math.floor(character.intelligence / 10) * 0.01) *
        (1 + gear.xp_bonus) *
        rankMultiplier(character.rank_tier),
    ),
  );

  const coins = Math.max(
    1,
    Math.round(
      baseCoins * (1 + Math.floor(character.charisma / 10) * 0.01) * (1 + gear.coin_bonus),
    ),
  );

  return { damage, was_crit: wasCrit, xp, coins };
}

export function counterDamage(
  character: CharacterRow,
  gear: GearTotals,
  monsterAttack: number,
  rng: () => number = Math.random,
): { damage: number; dodged: boolean } {
  if (rng() < Math.min(0.45, gear.dodge)) {
    return { damage: 0, dodged: true };
  }

  const defense = character.base_defense + gear.defense + Math.floor(character.defense_stat / 10);
  const reduction = Math.floor(character.endurance / 20);

  return { damage: Math.max(1, Math.round(monsterAttack - defense - reduction)), dodged: false };
}

/* ------------------------------------------------------------------ */
/* Levelling                                                           */
/* ------------------------------------------------------------------ */

export function xpToNextLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  if (n <= 10) return 100 * n;
  if (n <= 30) return 150 * n;
  if (n <= 60) return 250 * n;
  if (n <= 100) return 400 * n;
  return 600 * n;
}

export interface LevelResult {
  level: number;
  xp: number;
  levels_gained: number;
  hp_gained: number;
  attack_gained: number;
  defense_gained: number;
  coins_gained: number;
}

export function applyXp(level: number, xp: number, gained: number): LevelResult {
  let newLevel = level;
  let newXp = xp + gained;
  let hp = 0;
  let attack = 0;
  let defense = 0;
  let coins = 0;

  while (newXp >= xpToNextLevel(newLevel)) {
    newXp -= xpToNextLevel(newLevel);
    newLevel += 1;
    hp += 20;
    attack += 3;
    defense += 2;
    coins += 50 * newLevel;
  }

  return {
    level: newLevel,
    xp: newXp,
    levels_gained: newLevel - level,
    hp_gained: hp,
    attack_gained: attack,
    defense_gained: defense,
    coins_gained: coins,
  };
}

/* ------------------------------------------------------------------ */
/* Road                                                                */
/* ------------------------------------------------------------------ */

export function advanceRoad(zone: number, index: number) {
  if (index < BOSS_INDEX) {
    return { zone, index: index + 1, zone_cleared: false, road_complete: false };
  }
  if (zone >= TOTAL_ZONES) {
    return { zone, index, zone_cleared: true, road_complete: true };
  }
  return { zone: zone + 1, index: 0, zone_cleared: true, road_complete: false };
}

/* ------------------------------------------------------------------ */
/* Loot                                                                */
/* ------------------------------------------------------------------ */

export interface LootDrop {
  kind: 'coins' | 'consumable' | 'gear' | 'rare_gear' | 'legendary_fragment';
  coins: number;
  item_id?: string;
  fragments?: number;
}

export function rollLootKind(rng: () => number = Math.random): LootDrop['kind'] {
  const roll = rng();
  if (roll < 0.6) return 'coins';
  if (roll < 0.85) return 'consumable';
  if (roll < 0.95) return 'gear';
  if (roll < 0.99) return 'rare_gear';
  return 'legendary_fragment';
}
