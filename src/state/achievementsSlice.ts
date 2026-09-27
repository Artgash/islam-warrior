import type { AchievementContext } from '@/types';
import type { AchievementsSlice, SliceCreator } from './types';
import { checkNewUnlocks } from '@/game/achievements/checkers';
import {
  countPerfectMonths,
  countPerfectWeeks,
  resistanceStreak,
} from '@/game/habits/streaks';
import { today as todayISO, nowTimestamp } from '@/lib/date';
import { play } from '@/platform/sound';
import { pushAchievements } from '@/api/sync';

export const createAchievementsSlice: SliceCreator<AchievementsSlice> = (set, get) => ({
  achievements: [],
  pendingAchievements: [],

  /**
   * Re-evaluates the whole catalogue and grants anything newly earned.
   * Cheap enough to call after every habit completion.
   */
  evaluateAchievements: () => {
    const state = get();
    const character = state.character;
    if (!character) return [];

    const date = todayISO();

    const context: AchievementContext = {
      character,
      perfect_weeks: countPerfectWeeks(state.habits, state.logs, date),
      perfect_months: countPerfectMonths(state.habits, state.logs, date),
      resistance_streak: resistanceStreak(state.logs, date),
      guild_contribution: state.members.find((m) => m.user_id === character.user_id)?.total_xp ?? 0,
      iblis_replies: state.taunts.filter((t) => t.replied_at !== null).length,
    };

    const { unlocked, coins } = checkNewUnlocks(context, state.achievements);
    if (unlocked.length === 0) return [];

    const entries = unlocked.map((a) => ({
      achievement_id: a.id,
      unlocked_at: nowTimestamp(),
    }));

    set((s) => ({
      achievements: [...s.achievements, ...entries],
      pendingAchievements: [...s.pendingAchievements, ...unlocked],
    }));

    if (coins > 0) {
      get().grantCoins(coins, 'achievement', `${unlocked.length} achievement(s) unlocked`);
    }

    unlocked.forEach((a) => {
      get().pushNotification({
        type: 'reward',
        title: `Achievement: ${a.name}`,
        body: `${a.description} +${a.reward_coins.toLocaleString()} coins.`,
      });
    });

    play('rank_up', 0.4);
    void pushAchievements(character.user_id, entries);

    return unlocked;
  },

  dismissAchievement: (id) =>
    set((state) => ({
      pendingAchievements: state.pendingAchievements.filter((a) => a.id !== id),
    })),
});
