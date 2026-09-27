import type { BattleSlice, SliceCreator } from './types';
import { makeEvent } from '@/game/battle/combat';
import { getMonster } from '@/game/zones/monsters';
import { MONSTERS_PER_ZONE } from '@/game/constants';

export const createBattleSlice: SliceCreator<BattleSlice> = (set, get) => ({
  combatLog: [],
  encounterOverride: null,
  shaking: false,
  lastDamage: null,
  pendingLoot: null,
  pendingLevelUp: null,
  pendingRankUp: false,
  pendingZoneClear: null,

  pushCombatEvent: (event) =>
    set((state) => ({ combatLog: [event, ...state.combatLog].slice(0, 60) })),

  clearCombatLog: () => set({ combatLog: [] }),

  triggerShake: () => {
    set({ shaking: true });
    setTimeout(() => set({ shaking: false }), 220);
  },

  dismissLoot: () => set({ pendingLoot: null }),
  dismissLevelUp: () => set({ pendingLevelUp: null }),
  dismissRankUp: () => set({ pendingRankUp: false }),
  dismissZoneClear: () => set({ pendingZoneClear: null }),

  /**
   * Swap the current encounter for a different monster at the same position.
   * Consumes a Reroll Monster item; the replacement starts at full HP.
   */
  rerollMonster: () => {
    const character = get().character;
    if (!character) return;

    const current = get().encounterOverride ?? character.current_monster_index;

    // Bosses cannot be rerolled — the keeper of a zone is the keeper.
    if (current >= MONSTERS_PER_ZONE - 1) {
      get().pushCombatEvent(
        makeEvent('system', 'The keeper of this zone cannot be avoided.'),
      );
      return;
    }

    // Substitute a different regular monster from the same zone. The real
    // position is untouched, so killing the replacement still advances by one.
    const alternatives = Array.from({ length: MONSTERS_PER_ZONE - 1 }, (_, i) => i).filter(
      (i) => i !== current,
    );
    const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
    const replacement = getMonster(character.current_zone, pick);

    set({ encounterOverride: pick });
    get().updateCharacter({ current_monster_hp: replacement.max_hp });
    get().pushCombatEvent(
      makeEvent('system', `The air shifts. ${replacement.name} takes its place.`),
    );
  },
});
