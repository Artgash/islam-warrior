import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameStore } from './types';
import { zustandStorage } from '@/platform/storage';
import { createUserSlice } from './userSlice';
import { createCharacterSlice } from './characterSlice';
import { createHabitsSlice } from './habitsSlice';
import { createBattleSlice } from './battleSlice';
import { createShopSlice } from './shopSlice';
import { createIblisSlice } from './iblisSlice';
import { createGuildSlice } from './guildSlice';
import { createAchievementsSlice } from './achievementsSlice';
import { createUiSlice } from './uiSlice';
import { PERSIST_VERSION, migratePersisted } from './migrations';

export const useGameStore = create<GameStore>()(
  persist(
    (...args) => ({
      ...createUserSlice(...args),
      ...createCharacterSlice(...args),
      ...createHabitsSlice(...args),
      ...createBattleSlice(...args),
      ...createShopSlice(...args),
      ...createIblisSlice(...args),
      ...createGuildSlice(...args),
      ...createAchievementsSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: 'game-state',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => zustandStorage),

      /**
       * Repairs saves written before ids were UUIDs. Without this, anyone who
       * played before the fix would still fail their first cloud sync.
       */
      migrate: migratePersisted,

      /**
       * Only durable game state is persisted. Transient battle flags,
       * animation triggers and realtime guild data are deliberately excluded
       * so a refresh never restores a half-finished overlay.
       */
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        notifications: state.notifications,
        character: state.character,
        habits: state.habits,
        logs: state.logs,
        combatLog: state.combatLog,
        inventory: state.inventory,
        equipped: state.equipped,
        activeEffects: state.activeEffects,
        legendaryFragments: state.legendaryFragments,
        coinLog: state.coinLog,
        taunts: state.taunts,
        guildId: state.guildId,
        achievements: state.achievements,
      }),

      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        // Clear anything time-based that expired while the app was closed.
        state?.expireEffects();
      },
    },
  ),
);

export * from './types';
export { DEFAULT_SETTINGS } from './userSlice';
