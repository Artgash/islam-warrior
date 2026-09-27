import type { Monster } from '@/types';
import {
  BOSS_ATK_MULTIPLIER,
  BOSS_COIN_MULTIPLIER,
  BOSS_DEF_MULTIPLIER,
  BOSS_HP_MULTIPLIER,
  BOSS_INDEX,
  BOSS_XP_MULTIPLIER,
  IBLIS_HP,
  IBLIS_HP_EXACT,
  MONSTERS_PER_ZONE,
  MONSTER_ATK_BASE,
  MONSTER_ATK_GROWTH,
  MONSTER_COIN_BASE,
  MONSTER_COIN_GROWTH,
  MONSTER_DEF_BASE,
  MONSTER_DEF_GROWTH,
  MONSTER_XP_BASE,
  MONSTER_XP_GROWTH,
  TOTAL_ZONES,
} from '@/game/constants';
import { ZONES, getZone } from './zones';
import { NAME_BANKS, ZONE_1_AUTHORED } from './nameBanks';

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

/**
 * Compose the name of the monster at `index` (0-14) in `zoneId`.
 * The adjective walks the 5-entry bank while the noun walks the 8-entry bank
 * with an extra +1 every full adjective cycle, so all 15 pairs are unique.
 */
export function composeMonsterName(zoneId: number, index: number): string {
  if (zoneId === 1) {
    const authored = ZONE_1_AUTHORED[index];
    if (authored) return authored;
  }

  const bank = NAME_BANKS[zoneId];
  if (!bank) throw new Error(`No name bank for zone ${zoneId}`);

  const adjCount = bank.adjectives.length; // 5
  const nounCount = bank.nouns.length; // 8

  const adjective = bank.adjectives[index % adjCount];
  const noun = bank.nouns[(index + Math.floor(index / adjCount)) % nounCount];

  return `${adjective} ${noun}`;
}

/* ------------------------------------------------------------------ */
/* Scaling                                                             */
/* ------------------------------------------------------------------ */

/** Regular monsters ramp 4% per index across the zone. */
const INTRA_ZONE_HP_STEP = 0.04;
const INTRA_ZONE_ATK_STEP = 0.02;

export function monsterHp(zoneId: number, index: number): number {
  const zone = getZone(zoneId);

  if (zoneId === TOTAL_ZONES && index === BOSS_INDEX) return IBLIS_HP;

  // Zone 66's authored base_hp is Iblis himself; its lesser servants scale
  // from zone 65's curve instead so the approach stays playable.
  const base = zoneId === TOTAL_ZONES ? getZone(TOTAL_ZONES - 1).base_hp * 1.15 : zone.base_hp;

  const scaled = base * (1 + index * INTRA_ZONE_HP_STEP);
  return Math.round(index === BOSS_INDEX ? scaled * BOSS_HP_MULTIPLIER : scaled);
}

export function monsterAttack(zoneId: number, index: number): number {
  const base = MONSTER_ATK_BASE * Math.pow(MONSTER_ATK_GROWTH, zoneId - 1);
  const scaled = base * (1 + index * INTRA_ZONE_ATK_STEP);
  return Math.max(1, Math.round(index === BOSS_INDEX ? scaled * BOSS_ATK_MULTIPLIER : scaled));
}

export function monsterDefense(zoneId: number, index: number): number {
  const base = MONSTER_DEF_BASE * Math.pow(MONSTER_DEF_GROWTH, zoneId - 1);
  return Math.max(0, Math.round(index === BOSS_INDEX ? base * BOSS_DEF_MULTIPLIER : base));
}

export function monsterXpReward(zoneId: number, index: number): number {
  const base = MONSTER_XP_BASE * Math.pow(MONSTER_XP_GROWTH, zoneId - 1);
  return Math.max(1, Math.round(index === BOSS_INDEX ? base * BOSS_XP_MULTIPLIER : base));
}

export function monsterCoinReward(zoneId: number, index: number): number {
  const base = MONSTER_COIN_BASE * Math.pow(MONSTER_COIN_GROWTH, zoneId - 1);
  return Math.max(1, Math.round(index === BOSS_INDEX ? base * BOSS_COIN_MULTIPLIER : base));
}

/* ------------------------------------------------------------------ */
/* Flavour                                                             */
/* ------------------------------------------------------------------ */

function describeMonster(zoneId: number, index: number, name: string): string {
  const zone = getZone(zoneId);
  if (index === BOSS_INDEX) {
    return `${name}, keeper of ${zone.name}. ${zone.lore}`;
  }
  return `${name} — a servant of ${zone.boss_name}, born from ${zone.theme.toLowerCase()}. It has been waiting in ${zone.name} for someone exactly like you.`;
}

function imagePromptFor(zoneId: number, index: number, name: string): string {
  const zone = getZone(zoneId);
  const scale = index === BOSS_INDEX ? 'towering boss-scale' : 'human-scale';
  return [
    `dark fantasy ${scale} creature named "${name}"`,
    `theme: ${zone.theme}`,
    `setting: ${zone.name}`,
    'semi-realistic painterly rendering, Diablo and Blasphemous reference',
    'shadowy silhouette, smoke and ember particles, muted palette with deep gold rim light',
    'no text, no anime styling, no cartoon proportions, solemn and grim',
  ].join(', ');
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function buildMonster(zoneId: number, index: number): Monster {
  const zone = getZone(zoneId);
  const isBoss = index === BOSS_INDEX;
  const name = isBoss ? zone.boss_name : composeMonsterName(zoneId, index);
  const hp = monsterHp(zoneId, index);

  return {
    id: `z${zoneId}_m${index}`,
    zone_id: zoneId,
    index,
    name,
    description: describeMonster(zoneId, index, name),
    image_prompt: imagePromptFor(zoneId, index, name),
    max_hp: hp,
    // Only Iblis breaks float precision; everyone else is exact already.
    ...(zoneId === TOTAL_ZONES && isBoss ? { max_hp_exact: IBLIS_HP_EXACT } : {}),
    attack: monsterAttack(zoneId, index),
    defense: monsterDefense(zoneId, index),
    xp_reward: monsterXpReward(zoneId, index),
    coin_reward: monsterCoinReward(zoneId, index),
    is_boss: isBoss,
  };
}

/** All 16 monsters of a zone: indices 0-14 plus the boss at 15. */
export function buildZoneMonsters(zoneId: number): Monster[] {
  return Array.from({ length: MONSTERS_PER_ZONE }, (_, i) => buildMonster(zoneId, i));
}

/**
 * The full bestiary: 66 zones x 16 = 1,056 monsters.
 * Built once on first access and cached, because the road never changes.
 */
let bestiaryCache: Monster[] | null = null;

export function getBestiary(): Monster[] {
  if (!bestiaryCache) {
    bestiaryCache = ZONES.flatMap((z) => buildZoneMonsters(z.id));
  }
  return bestiaryCache;
}

export function getMonster(zoneId: number, index: number): Monster {
  if (zoneId < 1 || zoneId > TOTAL_ZONES) throw new Error(`Zone out of range: ${zoneId}`);
  if (index < 0 || index >= MONSTERS_PER_ZONE) throw new Error(`Monster index out of range: ${index}`);
  return buildMonster(zoneId, index);
}

/** Total monsters between the start of the road and a given position. */
export function monstersClearedBefore(zoneId: number, index: number): number {
  return (zoneId - 1) * MONSTERS_PER_ZONE + index;
}

export const TOTAL_MONSTERS = TOTAL_ZONES * MONSTERS_PER_ZONE;
