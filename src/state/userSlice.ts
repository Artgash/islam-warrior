import type { Settings } from '@/types';
import type { SliceCreator, UserSlice } from './types';
import { uuid } from '@/lib/utils';
import { nowTimestamp } from '@/lib/date';
import { isSupabaseConfigured } from '@/lib/supabase';
import { pullSnapshot, pushCharacter, pushHabits } from '@/api/sync';

export const DEFAULT_SETTINGS: Settings = {
  sound_enabled: true,
  music_enabled: false,
  language: 'en',
  reduce_motion: false,
  confirm_before_move: true,
  notifications: {
    habit_reminder: true,
    iblis_taunt: true,
    rank_change: true,
    guild: true,
    season: true,
    reward: true,
    system: true,
  },
};

export const createUserSlice: SliceCreator<UserSlice> = (set, get) => ({
  user: null,
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  notifications: [],

  setUser: (user) => set({ user }),

  setHydrated: (value) => set({ hydrated: value }),

  /**
   * Reconcile local state with the cloud after sign-in.
   *
   * Whichever side has more lifetime XP wins, because that is the closest
   * thing to "which save is further along" and it cannot go backwards. A
   * player who played offline then signed in keeps their progress; a player
   * signing in on a new device pulls their account down.
   */
  hydrateFromCloud: async (userId) => {
    if (!isSupabaseConfigured) return 'offline';

    try {
      const remote = await pullSnapshot(userId);
      if (!remote) return 'offline';

      const local = get().character;

      // Nothing in the cloud yet: this account's first sync. Push up.
      if (!remote.character) {
        if (local) {
          await pushCharacter({ ...local, user_id: userId });
          await pushHabits(get().habits.map((h) => ({ ...h, user_id: userId })));
        }
        return 'pushed';
      }

      const remoteXp = remote.character.total_xp_earned ?? 0;
      const localXp = local?.total_xp_earned ?? -1;

      if (remoteXp >= localXp) {
        set({
          character: remote.character,
          habits: remote.habits,
          logs: remote.logs,
          inventory: remote.inventory,
          equipped: remote.equipped,
          achievements: remote.achievements,
          taunts: remote.taunts,
        });
        return 'pulled';
      }

      // Local is further along - keep it and overwrite the cloud.
      if (local) {
        await pushCharacter({ ...local, user_id: userId });
        await pushHabits(get().habits.map((h) => ({ ...h, user_id: userId })));
      }
      return 'pushed';
    } catch {
      // Never block sign-in on a sync failure; the player keeps playing local.
      return 'failed';
    }
  },

  updateSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
        notifications: { ...state.settings.notifications, ...(patch.notifications ?? {}) },
      },
    })),

  pushNotification: (notification) => {
    const { user, settings } = get();
    if (!settings.notifications[notification.type]) return;

    set((state) => ({
      notifications: [
        {
          id: uuid(),
          user_id: user?.id ?? 'local',
          read: false,
          created_at: nowTimestamp(),
          ...notification,
        },
        ...state.notifications,
      ].slice(0, 100),
    }));
  },

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  clearNotifications: () => set({ notifications: [] }),

  signOutLocal: () => set({ user: null }),
});
