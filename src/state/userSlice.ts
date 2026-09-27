import type { Settings } from '@/types';
import type { SliceCreator, UserSlice } from './types';
import { uid } from '@/lib/utils';
import { nowTimestamp } from '@/lib/date';

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
          id: uid('ntf_'),
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
