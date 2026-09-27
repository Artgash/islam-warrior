/**
 * The loot roll. Bosses are guaranteed rare-or-better plus a fragment,
 * and the Loot Luck Charm rolls the table twice.
 */

import type { LootResult, Monster, Rarity } from '@/types';
import { FRAGMENTS_PER_LEGENDARY, LOOT_WEIGHTS } from './constants';
import { CONSUMABLES, lootPoolForZone } from './shop/gearStats';
import type { Rng } from './battle/damage';
import { defaultRng } from './battle/damage';

/** Loot rolled from the common table, weighted per the design doc. */
function rollKind(rng: Rng): keyof typeof LOOT_WEIGHTS {
  const roll = rng();
  let cursor = 0;

  for (const [kind, weight] of Object.entries(LOOT_WEIGHTS) as [
    keyof typeof LOOT_WEIGHTS,
    number,
  ][]) {
    cursor += weight;
    if (roll < cursor) return kind;
  }

  return 'coins';
}

function pick<T>(items: T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

function gearDrop(zoneId: number, rarity: Rarity, rng: Rng): LootResult {
  const pool = lootPoolForZone(zoneId, rarity);
  const item = pick(pool, rng);

  if (!item) {
    // No gear of that rarity is appropriate this shallow — pay coins instead.
    const coins = Math.round(50 * zoneId);
    return {
      kind: 'coins',
      coins,
      message: `The body yields ${coins.toLocaleString()} coins.`,
    };
  }

  return {
    kind: rarity === 'common' ? 'gear' : 'rare_gear',
    coins: 0,
    item_id: item.id,
    item_name: item.name,
    rarity: item.rarity,
    message: `${item.name} recovered from the ash.`,
  };
}

export interface LootInput {
  monster: Monster;
  /** Coins already awarded for the kill; loot coins stack on top. */
  baseCoins: number;
  luckCharm?: boolean;
  rng?: Rng;
}

/** Roll the table once. */
function rollOnce(monster: Monster, baseCoins: number, rng: Rng): LootResult {
  const kind = rollKind(rng);

  switch (kind) {
    case 'coins': {
      const coins = Math.max(1, Math.round(baseCoins * (0.4 + rng() * 0.6)));
      return {
        kind: 'coins',
        coins,
        message: `${coins.toLocaleString()} coins scattered in the dust.`,
      };
    }

    case 'consumable': {
      const item = pick(CONSUMABLES.filter((c) => c.price <= 1200), rng);
      if (!item) return { kind: 'coins', coins: baseCoins, message: 'Coins only.' };
      return {
        kind: 'consumable',
        coins: 0,
        item_id: item.id,
        item_name: item.name,
        message: `${item.name} found among the remains.`,
      };
    }

    case 'gear':
      return gearDrop(monster.zone_id, 'common', rng);

    case 'rare_gear':
      return gearDrop(monster.zone_id, rng() < 0.5 ? 'rare' : 'epic', rng);

    case 'legendary_fragment':
      return {
        kind: 'legendary_fragment',
        coins: 0,
        fragments: 1,
        message: `A legendary fragment. ${FRAGMENTS_PER_LEGENDARY} of these forge a relic.`,
      };
  }
}

/**
 * Full loot resolution for a kill.
 * Bosses drop guaranteed rare+ gear, a fragment, and triple coins.
 */
export function rollLoot(input: LootInput): LootResult[] {
  const rng = input.rng ?? defaultRng;
  const { monster, baseCoins } = input;
  const results: LootResult[] = [];

  if (monster.is_boss) {
    results.push(gearDrop(monster.zone_id, rng() < 0.6 ? 'rare' : 'epic', rng));
    results.push({
      kind: 'legendary_fragment',
      coins: 0,
      fragments: 1,
      message: 'The boss yields a legendary fragment.',
    });
    results.push({
      kind: 'coins',
      coins: baseCoins * 3,
      message: `${(baseCoins * 3).toLocaleString()} coins claimed from the keeper.`,
    });
    return results;
  }

  const rolls = input.luckCharm ? 2 : 1;
  for (let i = 0; i < rolls; i += 1) {
    results.push(rollOnce(monster, baseCoins, rng));
  }

  return results;
}

/** Total coins across a loot batch. */
export function lootCoins(results: LootResult[]): number {
  return results.reduce((sum, r) => sum + r.coins, 0);
}

/** Total legendary fragments across a loot batch. */
export function lootFragments(results: LootResult[]): number {
  return results.reduce((sum, r) => sum + (r.fragments ?? 0), 0);
}

/** Item ids granted by a loot batch. */
export function lootItemIds(results: LootResult[]): string[] {
  return results.map((r) => r.item_id).filter((id): id is string => Boolean(id));
}

/** How many complete legendaries a fragment count can forge. */
export function legendariesFromFragments(fragments: number): number {
  return Math.floor(fragments / FRAGMENTS_PER_LEGENDARY);
}
