import type { StateCreator } from 'zustand';
import type {
  Achievement,
  ActiveEffect,
  AppNotification,
  AppUser,
  Archetype,
  Character,
  CoinReason,
  CoinTransaction,
  CombatEvent,
  EquippedMap,
  GearSlot,
  Guild,
  GuildMember,
  GuildMessage,
  Habit,
  HabitCategory,
  HabitIntensity,
  HabitLog,
  HabitTemplate,
  ISODate,
  InventoryEntry,
  LootResult,
  Settings,
  TauntLog,
  UserAchievement,
} from '@/types';

/* ------------------------------------------------------------------ */
/* Slice shapes                                                        */
/* ------------------------------------------------------------------ */

export interface UserSlice {
  user: AppUser | null;
  settings: Settings;
  hydrated: boolean;
  notifications: AppNotification[];

  setUser: (user: AppUser | null) => void;
  setHydrated: (value: boolean) => void;
  /**
   * Pull this account's state down from Supabase after sign-in, so the same
   * account carries across devices. Returns what happened, so the UI can say.
   */
  hydrateFromCloud: (userId: string) => Promise<'pulled' | 'pushed' | 'offline' | 'failed'>;
  updateSettings: (patch: Partial<Settings>) => void;
  pushNotification: (
    notification: Omit<AppNotification, 'id' | 'user_id' | 'created_at' | 'read'>,
  ) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  signOutLocal: () => void;
}

export interface OnboardingInput {
  name: string;
  avatar_id: string;
  archetype: Archetype;
  habits: HabitTemplate[];
}

export interface CharacterSlice {
  character: Character | null;

  createCharacter: (userId: string, input: OnboardingInput) => void;
  updateCharacter: (patch: Partial<Character>) => void;
  /** Applies XP, rolls level-ups, updates rank and returns what happened. */
  grantXp: (amount: number) => {
    levels_gained: number;
    rank_changed: boolean;
    rank_direction: 'up' | 'down';
  };
  grantCoins: (amount: number, reason: CoinReason, note: string) => void;
  spendCoins: (amount: number, reason: CoinReason, note: string) => boolean;
  healPercent: (percent: number) => void;
  fullHeal: () => void;
  /** Day-rollover housekeeping: decay, comeback bonus, fallen reset. */
  runDailyRollover: (today: ISODate) => void;
  setTitle: (title: string | null) => void;
}

export interface HabitsSlice {
  habits: Habit[];
  logs: HabitLog[];

  addHabit: (input: {
    name: string;
    description?: string;
    category: HabitCategory;
    intensity: HabitIntensity;
    frequency_type?: Habit['frequency_type'];
    frequency_value?: number;
    days_of_week?: Habit['days_of_week'];
    cue_time?: string | null;
    cue_trigger?: string | null;
  }) => Habit;
  addHabitsFromTemplates: (templates: HabitTemplate[]) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitActive: (id: string) => void;
  /** The full move: damage, XP, coins, loot, level-ups, achievements. */
  completeHabit: (habitId: string) => CompleteHabitOutcome | null;
}

export interface CompleteHabitOutcome {
  ok: boolean;
  reason?: 'already_done' | 'fallen' | 'no_character' | 'no_habit';
  xp: number;
  coins: number;
  damage: number;
  was_crit: boolean;
  combo: number;
  monster_killed: boolean;
  levels_gained: number;
  rank_changed: boolean;
  loot: LootResult[];
  zone_cleared: boolean;
  road_complete: boolean;
  player_fallen: boolean;
  unlocked: Achievement[];
}

export interface BattleSlice {
  combatLog: CombatEvent[];
  /**
   * Monster index substituted for the player's real position by a Reroll.
   * Progress still advances from the real index once the encounter dies.
   */
  encounterOverride: number | null;
  /** Transient flags the battle screen animates on. */
  shaking: boolean;
  lastDamage: { amount: number; crit: boolean; at: number } | null;
  pendingLoot: LootResult[] | null;
  pendingLevelUp: number | null;
  pendingRankUp: boolean;
  pendingZoneClear: number | null;

  pushCombatEvent: (event: CombatEvent) => void;
  clearCombatLog: () => void;
  triggerShake: () => void;
  dismissLoot: () => void;
  dismissLevelUp: () => void;
  dismissRankUp: () => void;
  dismissZoneClear: () => void;
  rerollMonster: () => void;
}

export interface ShopSlice {
  inventory: InventoryEntry[];
  equipped: EquippedMap;
  activeEffects: ActiveEffect[];
  legendaryFragments: number;
  coinLog: CoinTransaction[];

  buyItem: (itemId: string) => { ok: boolean; message: string };
  equipItem: (itemId: string) => void;
  unequipSlot: (slot: GearSlot) => void;
  useConsumable: (itemId: string) => { ok: boolean; message: string };
  grantItem: (itemId: string, quantity?: number, awardedLabel?: string) => void;
  addFragments: (count: number) => void;
  forgeLegendary: () => { ok: boolean; message: string };
  expireEffects: () => void;
}

export interface IblisSlice {
  taunts: TauntLog[];
  activeTaunt: TauntLog | null;

  maybeFireTaunt: () => void;
  forceFireTaunt: () => void;
  /** Answers the active taunt, or a named historic one from the Iblis tab. */
  replyToTaunt: (replyId: number, tauntId?: string) => void;
  dismissTaunt: () => void;
}

export interface GuildSlice {
  guildId: string | null;
  guild: Guild | null;
  members: GuildMember[];
  messages: GuildMessage[];

  setGuild: (guild: Guild | null) => void;
  setMembers: (members: GuildMember[]) => void;
  setMessages: (messages: GuildMessage[]) => void;
  appendMessage: (message: GuildMessage) => void;
  leaveCurrentGuild: () => void;
}

export interface AchievementsSlice {
  achievements: UserAchievement[];
  /** Newly unlocked achievements awaiting their celebration toast. */
  pendingAchievements: Achievement[];

  evaluateAchievements: () => Achievement[];
  dismissAchievement: (id: string) => void;
}

export interface UiSlice {
  navOpen: boolean;
  activeShopTab: string;
  confirmingHabitId: string | null;
  tutorialStep: number;

  setNavOpen: (open: boolean) => void;
  setActiveShopTab: (tab: string) => void;
  setConfirmingHabit: (id: string | null) => void;
  setTutorialStep: (step: number) => void;
  resetAll: () => void;
}

export type GameStore = UserSlice &
  CharacterSlice &
  HabitsSlice &
  BattleSlice &
  ShopSlice &
  IblisSlice &
  GuildSlice &
  AchievementsSlice &
  UiSlice;

/** Every slice receives the full store, so cross-slice actions stay honest. */
export type SliceCreator<T> = StateCreator<GameStore, [], [], T>;
