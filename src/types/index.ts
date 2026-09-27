/**
 * ISLAM WARRIOR - shared type system.
 * Consumed by web UI, pure game logic and (later) React Native.
 * Zero runtime imports: types only, so this file is portable everywhere.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export type UUID = string;
/** ISO date, day precision: `yyyy-MM-dd`. */
export type ISODate = string;
/** Full ISO-8601 timestamp. */
export type ISOTimestamp = string;

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export type HabitCategory =
  | 'faith'
  | 'intelligence'
  | 'strength'
  | 'charisma'
  | 'discipline'
  | 'bad_habit';

export type HabitIntensity = 1 | 2 | 3 | 4 | 5;

export type FrequencyType = 'daily' | 'x_per_week' | 'custom_days';

/** 0 = Sunday … 6 = Saturday (matches `Date.getDay`). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  category: HabitCategory;
  intensity: HabitIntensity;
  frequency_type: FrequencyType;
  /** Target completions per week when `frequency_type === 'x_per_week'`. */
  frequency_value: number;
  /** Active days when `frequency_type === 'custom_days'`. */
  days_of_week: DayOfWeek[];
  /** `HH:mm` local reminder time, or null. */
  cue_time: string | null;
  /** Human cue, e.g. "After Fajr". */
  cue_trigger: string | null;
  is_active: boolean;
  streak: number;
  longest_streak: number;
  total_completions: number;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface HabitLog {
  id: UUID;
  user_id: UUID;
  habit_id: UUID;
  date: ISODate;
  intensity: HabitIntensity;
  category: HabitCategory;
  xp_gained: number;
  coins_gained: number;
  damage_dealt: number;
  was_crit: boolean;
  combo_at_time: number;
  created_at: ISOTimestamp;
}

/** A pre-made habit offered during onboarding. */
export interface HabitTemplate {
  name: string;
  category: HabitCategory;
  intensity: HabitIntensity;
  cue_trigger?: string;
  description?: string;
}

export interface HabitPack {
  id: string;
  name: string;
  arabic?: string;
  description: string;
  category: HabitCategory;
  habits: HabitTemplate[];
}

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

export type StatKey =
  | 'strength'
  | 'defense_stat'
  | 'intelligence'
  | 'endurance'
  | 'faith'
  | 'charisma';

export type Stats = Record<StatKey, number>;

export type Archetype = 'warrior' | 'scholar' | 'monk' | 'knight' | 'sultan' | 'wali';

export interface ArchetypeDef {
  id: Archetype;
  name: string;
  arabic: string;
  tagline: string;
  description: string;
  /** Flat stat head-start granted at creation. */
  bonus: Partial<Stats>;
}

export interface Character {
  id: UUID;
  user_id: UUID;
  name: string;
  avatar_id: string;
  archetype: Archetype;
  title: string | null;

  level: number;
  xp: number;

  hp: number;
  max_hp: number;
  base_attack: number;
  base_defense: number;
  crit_chance: number;
  crit_multiplier: number;

  coins: number;
  gems: number;

  rank_tier: number;
  rank_division: 1 | 2 | 3;
  rank_xp: number;

  current_zone: number;
  current_monster_index: number;
  current_monster_hp: number;

  streak: number;
  longest_streak: number;
  last_habit_date: ISODate | null;

  morale_buff_expires: ISOTimestamp | null;
  morale_buff_percent: number;

  /** Set when HP hits 0; battle locks until the next local day. */
  fallen_at: ISOTimestamp | null;

  stats: Stats;

  /** Lifetime counters used by leaderboards + achievements. */
  total_monsters_killed: number;
  total_bosses_killed: number;
  total_habits_completed: number;
  total_coins_earned: number;
  total_xp_earned: number;
  days_active: number;

  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

/* ------------------------------------------------------------------ */
/* Zones + monsters                                                    */
/* ------------------------------------------------------------------ */

export interface Zone {
  id: number;
  name: string;
  theme: string;
  boss_name: string;
  base_hp: number;
  lore: string;
}

export interface Monster {
  id: string;
  zone_id: number;
  /** 0-14 = regular, 15 = zone boss. */
  index: number;
  name: string;
  description: string;
  image_prompt: string;
  max_hp: number;
  /**
   * Set only where `max_hp` exceeds JS safe-integer precision (Iblis).
   * The database and the UI use this string; combat uses `max_hp`.
   */
  max_hp_exact?: string;
  attack: number;
  defense: number;
  xp_reward: number;
  coin_reward: number;
  is_boss: boolean;
}

/* ------------------------------------------------------------------ */
/* Battle                                                              */
/* ------------------------------------------------------------------ */

export type CombatEventType =
  | 'player_hit'
  | 'player_crit'
  | 'monster_hit'
  | 'monster_dodge'
  | 'player_dodge'
  | 'monster_death'
  | 'player_fallen'
  | 'level_up'
  | 'rank_up'
  | 'zone_cleared'
  | 'loot'
  | 'system';

export interface CombatEvent {
  id: string;
  type: CombatEventType;
  message: string;
  amount?: number;
  at: ISOTimestamp;
}

export interface AttackResult {
  damage: number;
  was_crit: boolean;
  combo: number;
  monster_hp_after: number;
  monster_killed: boolean;
  breakdown: DamageBreakdown;
}

export interface DamageBreakdown {
  base_attack: number;
  gear_attack: number;
  strength_bonus: number;
  intensity: number;
  combo_multiplier: number;
  crit_multiplier: number;
  morale_multiplier: number;
  rank_multiplier: number;
  total: number;
}

export interface CounterAttackResult {
  damage: number;
  dodged: boolean;
  player_hp_after: number;
  player_fallen: boolean;
}

/** Everything the pure damage layer needs, with no store coupling. */
export interface CombatantSnapshot {
  base_attack: number;
  base_defense: number;
  crit_chance: number;
  crit_multiplier: number;
  stats: Stats;
  rank_tier: number;
  morale_multiplier: number;
  gear: GearAggregate;
}

/* ------------------------------------------------------------------ */
/* Gear + shop                                                         */
/* ------------------------------------------------------------------ */

export type GearSlot =
  | 'sword'
  | 'shield'
  | 'armor'
  | 'helmet'
  | 'ring'
  | 'boots';

export type ShopTab = GearSlot | 'consumable' | 'legendary';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface GearStats {
  attack?: number;
  defense?: number;
  hp?: number;
  crit_chance?: number;
  crit_multiplier?: number;
  dodge?: number;
  xp_bonus?: number;
  coin_bonus?: number;
  all_stats?: number;
}

export interface GearItem {
  id: string;
  name: string;
  arabic?: string;
  slot: GearSlot;
  tier: number;
  rarity: Rarity;
  price: number;
  stats: GearStats;
  description: string;
  /** Minimum rank tier required to purchase. */
  required_rank: number;
  /** Cosmetic-only awards cannot be bought. */
  is_award_only: boolean;
  /** e.g. "Ramadan 1447" — stamped on the profile showcase. */
  awarded_label?: string;
}

/** Summed stats of everything currently equipped. */
export interface GearAggregate {
  attack: number;
  defense: number;
  hp: number;
  crit_chance: number;
  crit_multiplier: number;
  dodge: number;
  xp_bonus: number;
  coin_bonus: number;
  all_stats: number;
}

export type ConsumableEffect =
  | 'streak_freeze'
  | 'heal_percent'
  | 'heal_full'
  | 'xp_boost'
  | 'reroll_monster'
  | 'morale'
  | 'combo_charm'
  | 'loot_luck';

export interface ConsumableItem {
  id: string;
  name: string;
  price: number;
  effect: ConsumableEffect;
  /** Meaning depends on `effect`: multiplier, percent or count. */
  magnitude: number;
  /** Duration in hours; 0 = instant. */
  duration_hours: number;
  description: string;
  required_rank: number;
}

export interface InventoryEntry {
  item_id: string;
  quantity: number;
  acquired_at: ISOTimestamp;
  awarded_label?: string;
}

export type EquippedMap = Partial<Record<GearSlot, string>>;

/** A time-limited effect from a consumable or an Iblis reply. */
export interface ActiveEffect {
  id: string;
  effect: ConsumableEffect;
  magnitude: number;
  expires_at: ISOTimestamp | null;
  /** For charges-based effects such as the Combo Charm. */
  charges: number | null;
  source: string;
}

/* ------------------------------------------------------------------ */
/* Loot                                                                */
/* ------------------------------------------------------------------ */

export type LootKind =
  | 'coins'
  | 'consumable'
  | 'gear'
  | 'rare_gear'
  | 'legendary_fragment';

export interface LootResult {
  kind: LootKind;
  coins: number;
  item_id?: string;
  item_name?: string;
  rarity?: Rarity;
  fragments?: number;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Ranks                                                               */
/* ------------------------------------------------------------------ */

export interface RankDef {
  tier: number;
  name: string;
  arabic: string;
  english: string;
  color: string;
  accent?: string;
  xp_required: number;
  multiplier: number;
  max_habits: number;
  unlocks: string[];
}

export interface RankState {
  tier: number;
  division: 1 | 2 | 3;
  rank_xp: number;
  /** 0-1 progress through the current division. */
  division_progress: number;
  xp_into_tier: number;
  xp_for_tier: number;
  def: RankDef;
}

export interface RankHistoryEntry {
  id: UUID;
  user_id: UUID;
  tier: number;
  division: 1 | 2 | 3;
  reached_at: ISOTimestamp;
  direction: 'up' | 'down';
}

/* ------------------------------------------------------------------ */
/* Iblis                                                               */
/* ------------------------------------------------------------------ */

export interface IblisTaunt {
  id: number;
  text: string;
}

export interface IblisReply {
  id: number;
  text: string;
  /** Morale attack bonus as a fraction, e.g. 0.10. */
  morale_percent: number;
}

export interface TauntLog {
  id: UUID;
  user_id: UUID;
  taunt_id: number;
  taunt_text: string;
  fired_at: ISOTimestamp;
  replied_at: ISOTimestamp | null;
  reply_id: number | null;
  reply_text: string | null;
}

/* ------------------------------------------------------------------ */
/* Guilds                                                              */
/* ------------------------------------------------------------------ */

export type GuildRole = 'leader' | 'officer' | 'member';

export type GuildRank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Legendary';

export interface Guild {
  id: UUID;
  name: string;
  tag: string;
  description: string;
  emblem_id: string;
  leader_id: UUID;
  member_count: number;
  total_xp: number;
  weekly_xp: number;
  rank: GuildRank;
  created_at: ISOTimestamp;
}

export interface GuildMember {
  user_id: UUID;
  guild_id: UUID;
  name: string;
  avatar_id: string;
  role: GuildRole;
  rank_tier: number;
  weekly_xp: number;
  total_xp: number;
  last_active: ISODate;
  joined_at: ISOTimestamp;
}

export interface GuildMessage {
  id: UUID;
  guild_id: UUID;
  user_id: UUID;
  author_name: string;
  avatar_id: string;
  body: string;
  created_at: ISOTimestamp;
}

export interface GuildQuest {
  id: string;
  guild_id: UUID;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward_coins: number;
  week: string;
}

export interface GuildWar {
  id: UUID;
  week: string;
  guild_a: UUID;
  guild_b: UUID;
  guild_a_name: string;
  guild_b_name: string;
  guild_a_xp: number;
  guild_b_xp: number;
  ends_at: ISOTimestamp;
}

/* ------------------------------------------------------------------ */
/* Leaderboards                                                        */
/* ------------------------------------------------------------------ */

export type LeaderboardType =
  | 'friends'
  | 'guild'
  | 'weekly'
  | 'rank_tier'
  | 'global'
  | 'slayers'
  | 'deep_road';

export interface LeaderboardEntry {
  position: number;
  user_id: UUID;
  name: string;
  avatar_id: string;
  rank_tier: number;
  rank_division: 1 | 2 | 3;
  level: number;
  value: number;
  /** Secondary display, e.g. "Zone 14 · Monster 7". */
  detail?: string;
  is_self: boolean;
}

/* ------------------------------------------------------------------ */
/* Seasons                                                             */
/* ------------------------------------------------------------------ */

export interface Season {
  id: string;
  number: number;
  name: string;
  theme: string;
  start_date: ISODate;
  end_date: ISODate;
}

export interface SeasonTier {
  tier: number;
  free_reward: string;
  premium_reward: string;
  xp_required: number;
}

export interface SeasonProgress {
  season_id: string;
  user_id: UUID;
  season_xp: number;
  tier: number;
  premium: boolean;
  claimed_free: number[];
  claimed_premium: number[];
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export type AchievementCategory =
  | 'streak'
  | 'kills'
  | 'zones'
  | 'rank'
  | 'coins'
  | 'perfect'
  | 'resistance'
  | 'guild'
  | 'iblis';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  /** Hidden in the UI until unlocked. */
  secret: boolean;
  /** Numeric goal used by the checker. */
  target: number;
  reward_coins: number;
  season_id?: string;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: ISOTimestamp;
}

/** Read-only snapshot the achievement checkers run against. */
export interface AchievementContext {
  character: Character;
  perfect_weeks: number;
  perfect_months: number;
  resistance_streak: number;
  guild_contribution: number;
  iblis_replies: number;
}

/* ------------------------------------------------------------------ */
/* Notifications + admin                                               */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | 'habit_reminder'
  | 'iblis_taunt'
  | 'rank_change'
  | 'guild'
  | 'season'
  | 'reward'
  | 'system';

export interface AppNotification {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: ISOTimestamp;
}

export interface MonthlyReward {
  id: UUID;
  user_id: UUID;
  item_id: string;
  label: string;
  month: string;
  awarded_at: ISOTimestamp;
}

/* ------------------------------------------------------------------ */
/* Auth + settings                                                     */
/* ------------------------------------------------------------------ */

export interface AppUser {
  id: UUID;
  email: string;
  created_at: ISOTimestamp;
  is_admin: boolean;
  onboarded: boolean;
}

export interface Settings {
  sound_enabled: boolean;
  music_enabled: boolean;
  language: 'en' | 'ar';
  notifications: Record<NotificationType, boolean>;
  reduce_motion: boolean;
  confirm_before_move: boolean;
}

/* ------------------------------------------------------------------ */
/* Coin ledger                                                         */
/* ------------------------------------------------------------------ */

export type CoinReason =
  | 'habit'
  | 'kill'
  | 'boss'
  | 'loot'
  | 'level_up'
  | 'purchase'
  | 'quest'
  | 'season'
  | 'achievement'
  | 'admin';

export interface CoinTransaction {
  id: UUID;
  user_id: UUID;
  amount: number;
  reason: CoinReason;
  note: string;
  balance_after: number;
  created_at: ISOTimestamp;
}
