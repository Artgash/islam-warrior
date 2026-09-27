/**
 * Purchase rules, stat comparison and the gear-upgrade preview.
 */

import type {
  ConsumableItem,
  EquippedMap,
  GearAggregate,
  GearItem,
  InventoryEntry,
} from '@/types';
import { aggregateEquipped, getConsumable, getGear, isConsumable } from './gearStats';

export type PurchaseBlock =
  | 'ok'
  | 'insufficient_funds'
  | 'rank_too_low'
  | 'already_owned'
  | 'award_only'
  | 'unknown_item';

export interface PurchaseCheck {
  allowed: boolean;
  reason: PurchaseBlock;
  message: string;
  price: number;
}

export function checkPurchase(
  itemId: string,
  coins: number,
  rankTier: number,
  inventory: InventoryEntry[],
): PurchaseCheck {
  const gear = getGear(itemId);
  const consumable = getConsumable(itemId);
  const item: GearItem | ConsumableItem | undefined = gear ?? consumable;

  if (!item) {
    return { allowed: false, reason: 'unknown_item', message: 'No such item.', price: 0 };
  }

  if (gear?.is_award_only) {
    return {
      allowed: false,
      reason: 'award_only',
      message: 'This relic is awarded, never sold.',
      price: 0,
    };
  }

  if (rankTier < item.required_rank) {
    return {
      allowed: false,
      reason: 'rank_too_low',
      message: `Requires rank tier ${item.required_rank}.`,
      price: item.price,
    };
  }

  // Gear is unique; consumables stack.
  if (gear && inventory.some((e) => e.item_id === itemId)) {
    return {
      allowed: false,
      reason: 'already_owned',
      message: 'Already in your armoury.',
      price: item.price,
    };
  }

  if (coins < item.price) {
    return {
      allowed: false,
      reason: 'insufficient_funds',
      message: `You need ${(item.price - coins).toLocaleString()} more coins.`,
      price: item.price,
    };
  }

  return { allowed: true, reason: 'ok', message: 'Purchase', price: item.price };
}

export function priceOf(itemId: string): number {
  return getGear(itemId)?.price ?? getConsumable(itemId)?.price ?? 0;
}

/* ------------------------------------------------------------------ */
/* Comparison                                                          */
/* ------------------------------------------------------------------ */

export interface StatDelta {
  label: string;
  from: number;
  to: number;
  delta: number;
  /** Fractional values render as percentages. */
  percent: boolean;
}

const AGGREGATE_LABELS: { key: keyof GearAggregate; label: string; percent: boolean }[] = [
  { key: 'attack', label: 'Attack', percent: false },
  { key: 'defense', label: 'Defense', percent: false },
  { key: 'hp', label: 'Max HP', percent: false },
  { key: 'crit_chance', label: 'Crit chance', percent: true },
  { key: 'crit_multiplier', label: 'Crit damage', percent: false },
  { key: 'dodge', label: 'Dodge', percent: true },
  { key: 'xp_bonus', label: 'XP bonus', percent: true },
  { key: 'coin_bonus', label: 'Coin bonus', percent: true },
  { key: 'all_stats', label: 'All stats', percent: false },
];

/** What changes if this item replaces whatever occupies its slot. */
export function compareEquip(equipped: EquippedMap, candidateId: string): StatDelta[] {
  const candidate = getGear(candidateId);
  if (!candidate) return [];

  const before = aggregateEquipped(equipped);
  const after = aggregateEquipped({ ...equipped, [candidate.slot]: candidateId });

  return AGGREGATE_LABELS.map(({ key, label, percent }) => ({
    label,
    from: before[key],
    to: after[key],
    delta: after[key] - before[key],
    percent,
  })).filter((d) => d.delta !== 0 || d.from !== 0);
}

/** Is the candidate a straight upgrade over what is equipped? */
export function isUpgrade(equipped: EquippedMap, candidateId: string): boolean {
  const deltas = compareEquip(equipped, candidateId);
  return deltas.some((d) => d.delta > 0) && !deltas.some((d) => d.delta < 0);
}

/* ------------------------------------------------------------------ */
/* Inventory helpers                                                   */
/* ------------------------------------------------------------------ */

export function ownsItem(inventory: InventoryEntry[], itemId: string): boolean {
  return inventory.some((e) => e.item_id === itemId && e.quantity > 0);
}

export function quantityOf(inventory: InventoryEntry[], itemId: string): number {
  return inventory.find((e) => e.item_id === itemId)?.quantity ?? 0;
}

export function addToInventory(
  inventory: InventoryEntry[],
  itemId: string,
  quantity = 1,
  awardedLabel?: string,
): InventoryEntry[] {
  const existing = inventory.find((e) => e.item_id === itemId);

  if (existing && isConsumable(itemId)) {
    return inventory.map((e) =>
      e.item_id === itemId ? { ...e, quantity: e.quantity + quantity } : e,
    );
  }

  if (existing) return inventory;

  return [
    ...inventory,
    {
      item_id: itemId,
      quantity,
      acquired_at: new Date().toISOString(),
      ...(awardedLabel ? { awarded_label: awardedLabel } : {}),
    },
  ];
}

export function consumeFromInventory(
  inventory: InventoryEntry[],
  itemId: string,
  quantity = 1,
): InventoryEntry[] {
  return inventory
    .map((e) => (e.item_id === itemId ? { ...e, quantity: e.quantity - quantity } : e))
    .filter((e) => e.quantity > 0);
}

/** Total coin value of everything owned — shown on the profile. */
export function armouryValue(inventory: InventoryEntry[]): number {
  return inventory.reduce((sum, e) => sum + priceOf(e.item_id) * e.quantity, 0);
}
