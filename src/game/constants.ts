/**
 * Every tunable number in the game lives here.
 * Pure data - safe to import from React Native, edge functions or tests.
 */

import type { ArchetypeDef, HabitIntensity, StatKey, Stats } from '@/types';

/* ------------------------------------------------------------------ */
/* Character baseline                                                  */
/* ------------------------------------------------------------------ */

export const STARTING_HP = 100;
export const STARTING_ATTACK = 10;
export const STARTING_DEFENSE = 5;
export const STARTING_CRIT_CHANCE = 0.05;
export const STARTING_CRIT_MULTIPLIER = 2.0;
export const STARTING_COINS = 100;

export const HP_PER_LEVEL = 20;
export const ATTACK_PER_LEVEL = 3;
export const DEFENSE_PER_LEVEL = 2;
export const COINS_PER_LEVEL = 50;

export const BASE_MOVE_SLOTS = 3;
export const MAX_MOVE_SLOTS = 10;
export const LEVELS_PER_MOVE_SLOT = 3;

export const STAT_MAX = 999;
export const STAT_DAILY_CAP = 5;

export const EMPTY_STATS: Stats = {
  strength: 0,
  defense_stat: 0,
  intelligence: 0,
  endurance: 0,
  faith: 0,
  charisma: 0,
};

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  defense_stat: 'Defense',
  intelligence: 'Intelligence',
  endurance: 'Endurance',
  faith: 'Faith',
  charisma: 'Charisma',
};

export const STAT_ARABIC: Record<StatKey, string> = {
  strength: 'القوة',
  defense_stat: 'الحماية',
  intelligence: 'العلم',
  endurance: 'الصبر',
  faith: 'الإيمان',
  charisma: 'الأخلاق',
};

/* Stat -> battle bonus divisors. "1% per N points". */
export const STRENGTH_ATTACK_DIVISOR = 10;
export const DEFENSE_STAT_DIVISOR = 10;
export const INTELLIGENCE_XP_DIVISOR = 10;
export const ENDURANCE_HP_DIVISOR = 10;
export const ENDURANCE_REDUCTION_DIVISOR = 20;
export const FAITH_CRIT_DIVISOR = 20;
export const CHARISMA_COIN_DIVISOR = 10;

/* ------------------------------------------------------------------ */
/* Intensity table                                                     */
/* ------------------------------------------------------------------ */

export interface IntensityDef {
  level: HabitIntensity;
  label: string;
  hint: string;
  damage_multiplier: number;
  xp: number;
  coins: number;
}

export const INTENSITY_TABLE: Record<HabitIntensity, IntensityDef> = {
  1: { level: 1, label: 'Light', hint: '~2 minutes', damage_multiplier: 1, xp: 10, coins: 5 },
  2: { level: 2, label: 'Easy', hint: '~5 minutes', damage_multiplier: 1.5, xp: 15, coins: 7 },
  3: { level: 3, label: 'Medium', hint: '~15 minutes', damage_multiplier: 2, xp: 25, coins: 12 },
  4: { level: 4, label: 'Hard', hint: '30+ minutes', damage_multiplier: 3, xp: 40, coins: 20 },
  5: {
    level: 5,
    label: 'Extreme',
    hint: '60+ minutes or a real sacrifice',
    damage_multiplier: 5,
    xp: 70,
    coins: 35,
  },
};

/** Resisting a bad habit pays triple - restraint is the harder jihad. */
export const BAD_HABIT_REWARD_MULTIPLIER = 3;

/* ------------------------------------------------------------------ */
/* Battle tuning                                                       */
/* ------------------------------------------------------------------ */

export const COMBO_STEP = 0.1;
export const COMBO_MAX_MULTIPLIER = 3.0;
export const MIN_MONSTER_DAMAGE = 1;
export const MAX_DODGE_CHANCE = 0.45;

export const MONSTER_HP_GROWTH = 1.15;
export const MONSTER_ATK_GROWTH = 1.18;
export const MONSTER_DEF_GROWTH = 1.15;
export const MONSTER_XP_GROWTH = 1.2;
export const MONSTER_COIN_GROWTH = 1.2;

export const MONSTER_HP_BASE = 50;
export const MONSTER_ATK_BASE = 5;
export const MONSTER_DEF_BASE = 2;
export const MONSTER_XP_BASE = 20;
export const MONSTER_COIN_BASE = 10;

export const BOSS_HP_MULTIPLIER = 3;
export const BOSS_ATK_MULTIPLIER = 1.5;
export const BOSS_DEF_MULTIPLIER = 2;
export const BOSS_XP_MULTIPLIER = 5;
export const BOSS_COIN_MULTIPLIER = 5;

export const MONSTERS_PER_ZONE = 16;
export const BOSS_INDEX = 15;
export const TOTAL_ZONES = 66;
export const FINAL_ZONE = 66;

/**
 * Iblis has 999,999,999,999,999,999 HP.
 *
 * That exceeds `Number.MAX_SAFE_INTEGER` (~9.007e15), so a JS number cannot
 * hold it exactly — `999_999_999_999_999_999` silently becomes 1e18. The
 * exact figure therefore lives as a string, which is what the database and
 * every piece of UI use. `IBLIS_HP` is the float approximation the combat
 * engine runs on; the difference is one part in 10^18 and no player will
 * ever be within a billion years of noticing it.
 */
export const IBLIS_HP_EXACT = '999999999999999999';
export const IBLIS_HP_DISPLAY = '999,999,999,999,999,999';
export const IBLIS_HP = 999_999_999_999_999_999;

/* ------------------------------------------------------------------ */
/* Loot table                                                          */
/* ------------------------------------------------------------------ */

export const LOOT_WEIGHTS = {
  coins: 0.6,
  consumable: 0.25,
  gear: 0.1,
  rare_gear: 0.04,
  legendary_fragment: 0.01,
} as const;

export const FRAGMENTS_PER_LEGENDARY = 10;

/* ------------------------------------------------------------------ */
/* Streaks + comeback                                                  */
/* ------------------------------------------------------------------ */

export const COMEBACK_WINDOW_DAYS = 3;
export const COMEBACK_RANK_BONUS = 0.15;

export const DECAY_TIERS = [
  { min_days: 3, max_days: 6, percent: 0.05 },
  { min_days: 7, max_days: 13, percent: 0.1 },
  { min_days: 14, max_days: Infinity, percent: 0.15 },
] as const;

export const RESIST_SHIELD_DAYS = 7;
export const RESIST_LEGENDARY_DAYS = 30;

/* ------------------------------------------------------------------ */
/* Iblis cadence                                                       */
/* ------------------------------------------------------------------ */

export const TAUNT_MIN_GAP_DAYS = 5;
export const TAUNT_WINDOW_START_HOUR = 8;
export const TAUNT_WINDOW_END_HOUR = 23;
export const MORALE_BUFF_HOURS = 24;

/* ------------------------------------------------------------------ */
/* Guilds                                                              */
/* ------------------------------------------------------------------ */

export const GUILD_MAX_MEMBERS = 30;
export const GUILD_MAX_OFFICERS = 3;
export const GUILD_CHAT_HISTORY = 100;
export const GUILD_INACTIVE_FLAG_DAYS = 7;
export const GUILD_KICKABLE_DAYS = 14;

/* ------------------------------------------------------------------ */
/* Archetypes                                                          */
/* ------------------------------------------------------------------ */

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    arabic: 'المحارب',
    tagline: 'Strength first. Doubt later.',
    description: 'You meet the nafs head-on. Heavier strikes, thicker skin.',
    bonus: { strength: 5, endurance: 3 },
  },
  {
    id: 'scholar',
    name: 'Scholar',
    arabic: 'العالم',
    tagline: 'The pen outlives the sword.',
    description: 'You learn faster than you bleed. More XP from every victory.',
    bonus: { intelligence: 6, faith: 2 },
  },
  {
    id: 'monk',
    name: 'Monk',
    arabic: 'الزاهد',
    tagline: 'Want nothing. Fear nothing.',
    description: 'Restraint is your weapon. Bad habits break against you.',
    bonus: { defense_stat: 5, endurance: 3 },
  },
  {
    id: 'knight',
    name: 'Knight',
    arabic: 'الفارس',
    tagline: 'Sworn, armoured, unmoved.',
    description: 'Balanced in all things, breakable in none.',
    bonus: { strength: 3, defense_stat: 3, endurance: 2 },
  },
  {
    id: 'sultan',
    name: 'Sultan',
    arabic: 'السلطان',
    tagline: 'Rule yourself before you rule others.',
    description: 'Presence and wealth follow you. More coins from every kill.',
    bonus: { charisma: 6, strength: 2 },
  },
  {
    id: 'wali',
    name: 'Wali',
    arabic: 'الولي',
    tagline: 'Closeness is the only prize.',
    description: 'Faith sharpens your blade. Higher critical strikes.',
    bonus: { faith: 6, intelligence: 2 },
  },
];

/* ------------------------------------------------------------------ */
/* Avatars                                                             */
/* ------------------------------------------------------------------ */

export interface AvatarDef {
  id: string;
  name: string;
  /** Two-stop gradient used by the generated sigil art. */
  colors: [string, string];
  sigil: 'crescent' | 'star' | 'sword' | 'shield' | 'lantern' | 'gate';
}

export const AVATARS: AvatarDef[] = [
  { id: 'av_ash', name: 'Ash Wanderer', colors: ['#2A3348', '#6B7280'], sigil: 'crescent' },
  { id: 'av_ember', name: 'Ember Sentinel', colors: ['#8B0000', '#DC2626'], sigil: 'sword' },
  { id: 'av_emerald', name: 'Emerald Keeper', colors: ['#065F46', '#10B981'], sigil: 'shield' },
  { id: 'av_gold', name: 'Gilded Knight', colors: ['#78350F', '#D4AF37'], sigil: 'star' },
  { id: 'av_night', name: 'Night Rider', colors: ['#0A0E1A', '#3B82F6'], sigil: 'crescent' },
  { id: 'av_dawn', name: 'Dawn Caller', colors: ['#7C2D12', '#FBBF24'], sigil: 'lantern' },
  { id: 'av_steel', name: 'Steel Ascetic', colors: ['#1F2937', '#9CA3AF'], sigil: 'sword' },
  { id: 'av_violet', name: 'Violet Exile', colors: ['#4B0082', '#A855F7'], sigil: 'gate' },
  { id: 'av_sand', name: 'Sand Pilgrim', colors: ['#78350F', '#F5F0E1'], sigil: 'star' },
  { id: 'av_frost', name: 'Frost Abid', colors: ['#164E63', '#67E8F9'], sigil: 'shield' },
  { id: 'av_rose', name: 'Rose Martyr', colors: ['#831843', '#EC4899'], sigil: 'lantern' },
  { id: 'av_white', name: 'White Banner', colors: ['#E5E7EB', '#D4AF37'], sigil: 'gate' },
];

/* ------------------------------------------------------------------ */
/* Guild emblems                                                       */
/* ------------------------------------------------------------------ */

export const GUILD_EMBLEMS = [
  { id: 'em_crossed', name: 'Crossed Sabres' },
  { id: 'em_crescent', name: 'Rising Crescent' },
  { id: 'em_lion', name: 'Lion Crest' },
  { id: 'em_star', name: 'Eight-Point Star' },
  { id: 'em_gate', name: 'Iron Gate' },
  { id: 'em_flame', name: 'Held Flame' },
  { id: 'em_tower', name: 'Watch Tower' },
  { id: 'em_banner', name: 'Black Banner' },
] as const;

/* ------------------------------------------------------------------ */
/* Titles unlocked by achievements                                     */
/* ------------------------------------------------------------------ */

export const TITLES: { id: string; label: string; requirement: string }[] = [
  { id: 'title_newborn', label: 'The Newly Awake', requirement: 'Complete onboarding' },
  { id: 'title_steadfast', label: 'The Steadfast', requirement: '30-day streak' },
  { id: 'title_unbroken', label: 'The Unbroken', requirement: '100-day streak' },
  { id: 'title_yearlong', label: 'Year of Iron', requirement: '365-day streak' },
  { id: 'title_slayer', label: 'Slayer of a Thousand', requirement: '1,000 monsters' },
  { id: 'title_deep', label: 'Walker of the Deep Road', requirement: 'Reach Zone 30' },
  { id: 'title_gatebreaker', label: 'Gatebreaker', requirement: 'Reach Zone 63' },
  { id: 'title_throne', label: 'He Who Stood at the Throne', requirement: 'Defeat Iblis' },
  { id: 'title_pure', label: 'The Purified', requirement: '90 days bad-habit resistance' },
  { id: 'title_defiant', label: 'The Defiant', requirement: 'Answer Iblis 50 times' },
];
