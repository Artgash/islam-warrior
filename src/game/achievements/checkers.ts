/**
 * The achievement catalogue and the pure checker that evaluates it.
 */

import type { Achievement, AchievementContext, UserAchievement } from '@/types';

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export const ACHIEVEMENTS: Achievement[] = [
  /* Streaks */
  { id: 'ach_streak_7', name: 'Seven Dawns', description: 'Hold a 7-day streak.', category: 'streak', rarity: 'common', secret: false, target: 7, reward_coins: 250 },
  { id: 'ach_streak_30', name: 'The Steadfast', description: 'Hold a 30-day streak.', category: 'streak', rarity: 'rare', secret: false, target: 30, reward_coins: 1500 },
  { id: 'ach_streak_100', name: 'The Unbroken', description: 'Hold a 100-day streak.', category: 'streak', rarity: 'epic', secret: false, target: 100, reward_coins: 7500 },
  { id: 'ach_streak_365', name: 'Year of Iron', description: 'Hold a 365-day streak.', category: 'streak', rarity: 'legendary', secret: false, target: 365, reward_coins: 50000 },

  /* Monster kills */
  { id: 'ach_kills_10', name: 'First Blood', description: 'Defeat 10 monsters.', category: 'kills', rarity: 'common', secret: false, target: 10, reward_coins: 150 },
  { id: 'ach_kills_100', name: 'Hundred Fallen', description: 'Defeat 100 monsters.', category: 'kills', rarity: 'rare', secret: false, target: 100, reward_coins: 1200 },
  { id: 'ach_kills_1000', name: 'Slayer of a Thousand', description: 'Defeat 1,000 monsters.', category: 'kills', rarity: 'epic', secret: false, target: 1000, reward_coins: 10000 },
  { id: 'ach_kills_10000', name: 'The Reaper of Zones', description: 'Defeat 10,000 monsters.', category: 'kills', rarity: 'mythic', secret: false, target: 10000, reward_coins: 100000 },

  /* Zones */
  { id: 'ach_zone_1', name: 'Out of the Slums', description: 'Clear Zone 1.', category: 'zones', rarity: 'common', secret: false, target: 1, reward_coins: 200 },
  { id: 'ach_zone_10', name: 'Past the Library', description: 'Clear Zone 10.', category: 'zones', rarity: 'rare', secret: false, target: 10, reward_coins: 2000 },
  { id: 'ach_zone_30', name: 'Walker of the Deep Road', description: 'Clear Zone 30.', category: 'zones', rarity: 'epic', secret: false, target: 30, reward_coins: 12000 },
  { id: 'ach_zone_50', name: 'Through the Fitnah', description: 'Clear Zone 50.', category: 'zones', rarity: 'legendary', secret: false, target: 50, reward_coins: 40000 },
  { id: 'ach_zone_66', name: 'He Who Stood at the Throne', description: 'Defeat Iblis.', category: 'zones', rarity: 'mythic', secret: false, target: 66, reward_coins: 250000 },

  /* Ranks */
  { id: 'ach_rank_2', name: 'The Seeker', description: 'Reach the rank of Talib.', category: 'rank', rarity: 'common', secret: false, target: 2, reward_coins: 200 },
  { id: 'ach_rank_3', name: 'The Striver', description: 'Reach the rank of Mujahid.', category: 'rank', rarity: 'common', secret: false, target: 3, reward_coins: 400 },
  { id: 'ach_rank_4', name: 'The Patient', description: 'Reach the rank of Sabir.', category: 'rank', rarity: 'rare', secret: false, target: 4, reward_coins: 800 },
  { id: 'ach_rank_5', name: 'The Fighter', description: 'Reach the rank of Muqatil.', category: 'rank', rarity: 'rare', secret: false, target: 5, reward_coins: 1600 },
  { id: 'ach_rank_6', name: 'The Knight', description: 'Reach the rank of Farsan.', category: 'rank', rarity: 'epic', secret: false, target: 6, reward_coins: 3200 },
  { id: 'ach_rank_7', name: 'The Commander', description: "Reach the rank of Qa'id.", category: 'rank', rarity: 'epic', secret: false, target: 7, reward_coins: 6400 },
  { id: 'ach_rank_8', name: 'King of the Self', description: 'Reach the rank of Sultan al-Nafs.', category: 'rank', rarity: 'legendary', secret: false, target: 8, reward_coins: 15000 },
  { id: 'ach_rank_9', name: 'The Saint', description: 'Reach the rank of Wali.', category: 'rank', rarity: 'legendary', secret: false, target: 9, reward_coins: 35000 },
  { id: 'ach_rank_10', name: 'The Successor', description: 'Reach the rank of Khalifa.', category: 'rank', rarity: 'mythic', secret: false, target: 10, reward_coins: 100000 },

  /* Coins */
  { id: 'ach_coins_1k', name: 'First Purse', description: 'Earn 1,000 coins in total.', category: 'coins', rarity: 'common', secret: false, target: 1000, reward_coins: 100 },
  { id: 'ach_coins_10k', name: 'Merchant of the Road', description: 'Earn 10,000 coins in total.', category: 'coins', rarity: 'rare', secret: false, target: 10000, reward_coins: 1000 },
  { id: 'ach_coins_100k', name: 'Treasury of One', description: 'Earn 100,000 coins in total.', category: 'coins', rarity: 'epic', secret: false, target: 100000, reward_coins: 10000 },
  { id: 'ach_coins_1m', name: 'The Unspent Fortune', description: 'Earn 1,000,000 coins in total.', category: 'coins', rarity: 'legendary', secret: false, target: 1000000, reward_coins: 75000 },

  /* Perfect weeks and months */
  { id: 'ach_perfect_week', name: 'A Week Without Gaps', description: 'Complete every scheduled habit for a full week.', category: 'perfect', rarity: 'rare', secret: false, target: 1, reward_coins: 1000 },
  { id: 'ach_perfect_week_4', name: 'Four Clean Weeks', description: 'Record four perfect weeks.', category: 'perfect', rarity: 'epic', secret: false, target: 4, reward_coins: 5000 },
  { id: 'ach_perfect_month', name: 'A Month Without Gaps', description: 'Complete every scheduled habit for a full month.', category: 'perfect', rarity: 'legendary', secret: false, target: 1, reward_coins: 20000 },

  /* Bad-habit resistance */
  { id: 'ach_resist_7', name: 'Shield of Purity', description: 'Resist a bad habit 7 days running.', category: 'resistance', rarity: 'common', secret: false, target: 7, reward_coins: 500 },
  { id: 'ach_resist_30', name: 'Chains Broken', description: 'Resist a bad habit 30 days running.', category: 'resistance', rarity: 'rare', secret: false, target: 30, reward_coins: 3000 },
  { id: 'ach_resist_90', name: 'The Purified', description: 'Resist a bad habit 90 days running.', category: 'resistance', rarity: 'epic', secret: false, target: 90, reward_coins: 15000 },
  { id: 'ach_resist_365', name: 'A Year of Restraint', description: 'Resist a bad habit 365 days running.', category: 'resistance', rarity: 'mythic', secret: false, target: 365, reward_coins: 120000 },

  /* Guild */
  { id: 'ach_guild_join', name: 'Brotherhood', description: 'Join a guild.', category: 'guild', rarity: 'common', secret: false, target: 1, reward_coins: 200 },
  { id: 'ach_guild_10k', name: 'Pillar of the Guild', description: 'Contribute 10,000 XP to your guild.', category: 'guild', rarity: 'rare', secret: false, target: 10000, reward_coins: 2500 },
  { id: 'ach_guild_100k', name: 'Backbone', description: 'Contribute 100,000 XP to your guild.', category: 'guild', rarity: 'epic', secret: false, target: 100000, reward_coins: 20000 },

  /* Iblis */
  { id: 'ach_iblis_1', name: 'First Words', description: 'Answer Iblis once.', category: 'iblis', rarity: 'common', secret: false, target: 1, reward_coins: 300 },
  { id: 'ach_iblis_10', name: 'Unshaken', description: 'Answer Iblis ten times.', category: 'iblis', rarity: 'rare', secret: false, target: 10, reward_coins: 3000 },
  { id: 'ach_iblis_50', name: 'The Defiant', description: 'Answer Iblis fifty times.', category: 'iblis', rarity: 'legendary', secret: false, target: 50, reward_coins: 30000 },

  /* Secret */
  { id: 'ach_secret_fajr_100', name: 'Before the Sun', description: 'You rose before Fajr one hundred times.', category: 'streak', rarity: 'epic', secret: true, target: 100, reward_coins: 10000 },
  { id: 'ach_secret_no_shop', name: 'The Ascetic', description: 'Reach Zone 10 having bought nothing.', category: 'zones', rarity: 'epic', secret: true, target: 10, reward_coins: 8000 },
  { id: 'ach_secret_comeback', name: 'He Came Back', description: 'Return and rebuild after breaking a 30-day streak.', category: 'streak', rarity: 'rare', secret: true, target: 30, reward_coins: 2500 },
];

const ACHIEVEMENT_BY_ID = new Map<string, Achievement>(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENT_BY_ID.get(id);
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

/** Current progress toward an achievement, in that achievement's own units. */
export function progressFor(achievement: Achievement, ctx: AchievementContext): number {
  const c = ctx.character;

  switch (achievement.category) {
    case 'streak':
      if (achievement.id === 'ach_secret_comeback') {
        return c.longest_streak >= 30 && c.streak > 0 ? 30 : 0;
      }
      if (achievement.id === 'ach_secret_fajr_100') {
        return c.total_habits_completed >= 100 ? 100 : c.total_habits_completed;
      }
      return c.longest_streak;

    case 'kills':
      return c.total_monsters_killed;

    case 'zones':
      if (achievement.id === 'ach_secret_no_shop') {
        return c.total_coins_earned > 0 && c.coins === c.total_coins_earned
          ? c.current_zone - 1
          : 0;
      }
      return c.current_zone - 1;

    case 'rank':
      return c.rank_tier;

    case 'coins':
      return c.total_coins_earned;

    case 'perfect':
      return achievement.id === 'ach_perfect_month' ? ctx.perfect_months : ctx.perfect_weeks;

    case 'resistance':
      return ctx.resistance_streak;

    case 'guild':
      return ctx.guild_contribution;

    case 'iblis':
      return ctx.iblis_replies;
  }
}

export function isUnlocked(achievement: Achievement, ctx: AchievementContext): boolean {
  return progressFor(achievement, ctx) >= achievement.target;
}

/** 0-1 progress, for the ring on the achievement card. */
export function progressRatio(achievement: Achievement, ctx: AchievementContext): number {
  if (achievement.target <= 0) return 1;
  return Math.min(1, progressFor(achievement, ctx) / achievement.target);
}

/**
 * Everything newly earned since the last evaluation.
 * Returns achievement ids plus the total coin reward to grant.
 */
export function checkNewUnlocks(
  ctx: AchievementContext,
  existing: UserAchievement[],
): { unlocked: Achievement[]; coins: number } {
  const owned = new Set(existing.map((u) => u.achievement_id));
  const unlocked = ACHIEVEMENTS.filter((a) => !owned.has(a.id) && isUnlocked(a, ctx));
  const coins = unlocked.reduce((sum, a) => sum + a.reward_coins, 0);
  return { unlocked, coins };
}

/** Visible catalogue: secrets stay hidden until earned. */
export function visibleAchievements(existing: UserAchievement[]): Achievement[] {
  const owned = new Set(existing.map((u) => u.achievement_id));
  return ACHIEVEMENTS.filter((a) => !a.secret || owned.has(a.id));
}

export function unlockedCount(existing: UserAchievement[]): number {
  return existing.length;
}

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;
