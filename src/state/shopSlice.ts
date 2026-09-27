import type { ActiveEffect, GearSlot } from '@/types';
import type { ShopSlice, SliceCreator } from './types';
import {
  addToInventory,
  checkPurchase,
  consumeFromInventory,
  ownsItem,
} from '@/game/shop/pricing';
import {
  aggregateEquipped,
  getConsumable,
  getGear,
  LEGENDARY_COSMETICS,
} from '@/game/shop/gearStats';
import { effectiveMaxHp } from '@/game/battle/formulas';
import { FRAGMENTS_PER_LEGENDARY, MORALE_BUFF_HOURS } from '@/game/constants';
import { uid } from '@/lib/utils';
import { play } from '@/platform/sound';
import { pushInventory } from '@/api/sync';

export const createShopSlice: SliceCreator<ShopSlice> = (set, get) => ({
  inventory: [],
  equipped: {},
  activeEffects: [],
  legendaryFragments: 0,
  coinLog: [],

  buyItem: (itemId) => {
    const state = get();
    const character = state.character;
    if (!character) return { ok: false, message: 'No character.' };

    const check = checkPurchase(itemId, character.coins, character.rank_tier, state.inventory);
    if (!check.allowed) {
      play('error');
      return { ok: false, message: check.message };
    }

    const item = getGear(itemId) ?? getConsumable(itemId);
    if (!item) return { ok: false, message: 'No such item.' };

    const paid = get().spendCoins(check.price, 'purchase', `Bought ${item.name}`);
    if (!paid) return { ok: false, message: 'Not enough coins.' };

    set((s) => ({ inventory: addToInventory(s.inventory, itemId) }));
    play('purchase');

    void pushInventory(character.user_id, get().inventory, get().equipped);
    return { ok: true, message: `${item.name} acquired.` };
  },

  equipItem: (itemId) => {
    const item = getGear(itemId);
    if (!item) return;
    if (!ownsItem(get().inventory, itemId)) return;

    set((state) => ({ equipped: { ...state.equipped, [item.slot]: itemId } }));

    // Gear can raise max HP; top the player up to the new ceiling rather
    // than leaving them at a stale value.
    const character = get().character;
    if (character) {
      const maxHp = effectiveMaxHp(
        character.max_hp,
        aggregateEquipped(get().equipped),
        character.stats,
      );
      if (character.hp > maxHp) get().updateCharacter({ hp: maxHp });
    }

    if (character) void pushInventory(character.user_id, get().inventory, get().equipped);
  },

  unequipSlot: (slot: GearSlot) => {
    set((state) => {
      const next = { ...state.equipped };
      delete next[slot];
      return { equipped: next };
    });

    const character = get().character;
    if (!character) return;

    const maxHp = effectiveMaxHp(
      character.max_hp,
      aggregateEquipped(get().equipped),
      character.stats,
    );
    if (character.hp > maxHp) get().updateCharacter({ hp: maxHp });

    void pushInventory(character.user_id, get().inventory, get().equipped);
  },

  useConsumable: (itemId) => {
    const consumable = getConsumable(itemId);
    if (!consumable) return { ok: false, message: 'Not a consumable.' };
    if (!ownsItem(get().inventory, itemId)) return { ok: false, message: 'You do not have one.' };

    const character = get().character;
    if (!character) return { ok: false, message: 'No character.' };

    const expiresAt =
      consumable.duration_hours > 0
        ? new Date(Date.now() + consumable.duration_hours * 3_600_000).toISOString()
        : null;

    switch (consumable.effect) {
      case 'heal_percent':
        get().healPercent(consumable.magnitude);
        break;

      case 'heal_full':
        get().fullHeal();
        break;

      case 'morale':
        get().updateCharacter({
          morale_buff_percent: consumable.magnitude,
          morale_buff_expires: new Date(
            Date.now() + MORALE_BUFF_HOURS * 3_600_000,
          ).toISOString(),
        });
        break;

      case 'reroll_monster':
        get().rerollMonster();
        break;

      case 'xp_boost':
      case 'streak_freeze':
      case 'combo_charm':
      case 'loot_luck': {
        const effect: ActiveEffect = {
          id: uid('fx_'),
          effect: consumable.effect,
          magnitude: consumable.magnitude,
          expires_at: expiresAt,
          charges:
            consumable.effect === 'combo_charm' || consumable.effect === 'loot_luck'
              ? consumable.magnitude
              : consumable.effect === 'streak_freeze'
                ? 1
                : null,
          source: consumable.name,
        };
        set((s) => ({ activeEffects: [...s.activeEffects, effect] }));
        break;
      }
    }

    set((s) => ({ inventory: consumeFromInventory(s.inventory, itemId, 1) }));
    void pushInventory(character.user_id, get().inventory, get().equipped);

    return { ok: true, message: `${consumable.name} used.` };
  },

  grantItem: (itemId, quantity = 1, awardedLabel) => {
    set((state) => ({
      inventory: addToInventory(state.inventory, itemId, quantity, awardedLabel),
    }));

    const character = get().character;
    if (character) void pushInventory(character.user_id, get().inventory, get().equipped);
  },

  addFragments: (count) => {
    set((state) => ({ legendaryFragments: state.legendaryFragments + count }));

    if (get().legendaryFragments >= FRAGMENTS_PER_LEGENDARY) {
      get().pushNotification({
        type: 'reward',
        title: 'Legendary fragments complete',
        body: `You hold ${get().legendaryFragments} fragments. Forge one at the shop.`,
      });
    }
  },

  forgeLegendary: () => {
    const fragments = get().legendaryFragments;
    if (fragments < FRAGMENTS_PER_LEGENDARY) {
      return {
        ok: false,
        message: `${FRAGMENTS_PER_LEGENDARY - fragments} more fragments needed.`,
      };
    }

    // Forge the first legendary the player does not already own.
    const owned = new Set(get().inventory.map((e) => e.item_id));
    const candidate = LEGENDARY_COSMETICS.find((item) => !owned.has(item.id));

    if (!candidate) {
      return { ok: false, message: 'You already hold every legendary relic.' };
    }

    set((state) => ({ legendaryFragments: state.legendaryFragments - FRAGMENTS_PER_LEGENDARY }));
    get().grantItem(candidate.id);
    play('rank_up');

    return { ok: true, message: `${candidate.name} forged.` };
  },

  expireEffects: () => {
    const now = Date.now();
    set((state) => ({
      activeEffects: state.activeEffects.filter((e) => {
        if (e.charges !== null && e.charges <= 0) return false;
        if (!e.expires_at) return true;
        return new Date(e.expires_at).getTime() > now;
      }),
    }));
  },
});
