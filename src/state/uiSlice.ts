import type { SliceCreator, UiSlice } from './types';
import { DEFAULT_SETTINGS } from './userSlice';

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  navOpen: false,
  activeShopTab: 'sword',
  confirmingHabitId: null,
  tutorialStep: 0,

  setNavOpen: (open) => set({ navOpen: open }),
  setActiveShopTab: (tab) => set({ activeShopTab: tab }),
  setConfirmingHabit: (id) => set({ confirmingHabitId: id }),
  setTutorialStep: (step) => set({ tutorialStep: step }),

  /** Full wipe, used by "delete account" and the dev reset. */
  resetAll: () =>
    set({
      user: null,
      settings: DEFAULT_SETTINGS,
      notifications: [],
      character: null,
      habits: [],
      logs: [],
      combatLog: [],
      encounterOverride: null,
      shaking: false,
      lastDamage: null,
      pendingLoot: null,
      pendingLevelUp: null,
      pendingRankUp: false,
      pendingZoneClear: null,
      inventory: [],
      equipped: {},
      activeEffects: [],
      legendaryFragments: 0,
      coinLog: [],
      taunts: [],
      activeTaunt: null,
      guildId: null,
      guild: null,
      members: [],
      messages: [],
      achievements: [],
      pendingAchievements: [],
      navOpen: false,
      activeShopTab: 'sword',
      confirmingHabitId: null,
      tutorialStep: 0,
    }),
});
