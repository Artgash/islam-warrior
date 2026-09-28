import type { Character, CoinReason } from '@/types';
import type { CharacterSlice, SliceCreator } from './types';
import {
  ARCHETYPES,
  STARTING_ATTACK,
  STARTING_COINS,
  STARTING_CRIT_CHANCE,
  STARTING_CRIT_MULTIPLIER,
  STARTING_DEFENSE,
  STARTING_HP,
} from '@/game/constants';
import { withArchetypeBonus } from '@/game/character/stats';
import { applyXp } from '@/game/character/leveling';
import { detectRankChange, rankStateForXp } from '@/game/ranks/rankLogic';
import { applyDecay, evaluateComeback } from '@/game/ranks/decay';
import { aggregateEquipped } from '@/game/shop/gearStats';
import { effectiveMaxHp } from '@/game/battle/formulas';
import { getMonster } from '@/game/zones/monsters';
import { uuid } from '@/lib/utils';
import { nowTimestamp } from '@/lib/date';
import { play, vibrate } from '@/platform/sound';
import { pushCharacter, pushCoinTransaction } from '@/api/sync';

export const createCharacterSlice: SliceCreator<CharacterSlice> = (set, get) => ({
  character: null,

  createCharacter: (userId, input) => {
    const archetype = ARCHETYPES.find((a) => a.id === input.archetype) ?? ARCHETYPES[0];
    const stats = withArchetypeBonus(archetype.bonus);
    const firstMonster = getMonster(1, 0);

    const character: Character = {
      id: uuid(),
      user_id: userId,
      name: input.name.trim(),
      avatar_id: input.avatar_id,
      archetype: archetype.id,
      title: 'The Newly Awake',

      level: 1,
      xp: 0,

      hp: STARTING_HP,
      max_hp: STARTING_HP,
      base_attack: STARTING_ATTACK,
      base_defense: STARTING_DEFENSE,
      crit_chance: STARTING_CRIT_CHANCE,
      crit_multiplier: STARTING_CRIT_MULTIPLIER,

      coins: STARTING_COINS,
      gems: 0,

      rank_tier: 1,
      rank_division: 3,
      rank_xp: 0,

      current_zone: 1,
      current_monster_index: 0,
      current_monster_hp: firstMonster.max_hp,

      streak: 0,
      longest_streak: 0,
      last_habit_date: null,

      morale_buff_expires: null,
      morale_buff_percent: 0,
      fallen_at: null,

      stats,

      total_monsters_killed: 0,
      total_bosses_killed: 0,
      total_habits_completed: 0,
      total_coins_earned: STARTING_COINS,
      total_xp_earned: 0,
      days_active: 0,

      created_at: nowTimestamp(),
      updated_at: nowTimestamp(),
    };

    set({ character });
    void pushCharacter(character);

    if (input.habits.length > 0) {
      get().addHabitsFromTemplates(input.habits);
    }
  },

  updateCharacter: (patch) => {
    const current = get().character;
    if (!current) return;

    const next: Character = { ...current, ...patch, updated_at: nowTimestamp() };
    set({ character: next });
    void pushCharacter(next);
  },

  grantXp: (amount) => {
    const character = get().character;
    if (!character || amount <= 0) {
      return { levels_gained: 0, rank_changed: false, rank_direction: 'up' as const };
    }

    const gains = applyXp(character.level, character.xp, amount);
    const rankXpBefore = character.rank_xp;
    const rankXpAfter = rankXpBefore + amount;
    const rankChange = detectRankChange(rankXpBefore, rankXpAfter);
    const rankState = rankStateForXp(rankXpAfter);

    const gear = aggregateEquipped(get().equipped);
    const baseMaxHp = character.max_hp + gains.hp_gained;
    const newMaxHp = effectiveMaxHp(baseMaxHp, gear, character.stats);

    const next: Character = {
      ...character,
      level: gains.new_level,
      xp: gains.xp_remainder,
      max_hp: baseMaxHp,
      // A level-up fully heals; otherwise HP is untouched.
      hp: gains.levels_gained > 0 ? newMaxHp : Math.min(character.hp, newMaxHp),
      base_attack: character.base_attack + gains.attack_gained,
      base_defense: character.base_defense + gains.defense_gained,
      coins: character.coins + gains.coins_gained,
      total_coins_earned: character.total_coins_earned + gains.coins_gained,
      total_xp_earned: character.total_xp_earned + amount,
      rank_xp: rankXpAfter,
      rank_tier: rankState.tier,
      rank_division: rankState.division,
      updated_at: nowTimestamp(),
    };

    set({ character: next });
    void pushCharacter(next);

    if (gains.levels_gained > 0) {
      set({ pendingLevelUp: gains.new_level });
      play('level_up', 0.7);
      vibrate([30, 50, 30]);
      get().pushNotification({
        type: 'system',
        title: `Level ${gains.new_level}`,
        body: `+${gains.hp_gained} HP, +${gains.attack_gained} attack, +${gains.defense_gained} defense.`,
      });
    }

    if (rankChange.changed) {
      set({ pendingRankUp: rankChange.direction === 'up' });
      if (rankChange.direction === 'up') {
        play('rank_up', 0.8);
        vibrate([50, 80, 50, 80, 150]);
      }
      get().pushNotification({
        type: 'rank_change',
        title: rankChange.direction === 'up' ? 'Rank up' : 'Rank lost',
        body: `${rankChange.to.def.name} ${rankChange.to.division === 3 ? 'III' : rankChange.to.division === 2 ? 'II' : 'I'}`,
      });
    }

    return {
      levels_gained: gains.levels_gained,
      rank_changed: rankChange.changed,
      rank_direction: rankChange.direction,
    };
  },

  grantCoins: (amount, reason, note) => {
    const character = get().character;
    if (!character || amount <= 0) return;

    const next: Character = {
      ...character,
      coins: character.coins + amount,
      total_coins_earned: character.total_coins_earned + amount,
      updated_at: nowTimestamp(),
    };

    const tx = {
      id: uuid(),
      user_id: character.user_id,
      amount,
      reason,
      note,
      balance_after: next.coins,
      created_at: nowTimestamp(),
    };

    set((state) => ({ character: next, coinLog: [tx, ...state.coinLog].slice(0, 500) }));
    void pushCharacter(next);
    void pushCoinTransaction(tx);
  },

  spendCoins: (amount, reason: CoinReason, note) => {
    const character = get().character;
    if (!character || character.coins < amount) return false;

    const next: Character = {
      ...character,
      coins: character.coins - amount,
      updated_at: nowTimestamp(),
    };

    const tx = {
      id: uuid(),
      user_id: character.user_id,
      amount: -amount,
      reason,
      note,
      balance_after: next.coins,
      created_at: nowTimestamp(),
    };

    set((state) => ({ character: next, coinLog: [tx, ...state.coinLog].slice(0, 500) }));
    void pushCharacter(next);
    void pushCoinTransaction(tx);
    return true;
  },

  healPercent: (percent) => {
    const character = get().character;
    if (!character) return;

    const gear = aggregateEquipped(get().equipped);
    const maxHp = effectiveMaxHp(character.max_hp, gear, character.stats);
    const healed = Math.min(maxHp, character.hp + Math.round(maxHp * percent));

    get().updateCharacter({ hp: healed, fallen_at: healed > 0 ? null : character.fallen_at });
  },

  fullHeal: () => {
    const character = get().character;
    if (!character) return;

    const gear = aggregateEquipped(get().equipped);
    const maxHp = effectiveMaxHp(character.max_hp, gear, character.stats);
    get().updateCharacter({ hp: maxHp, fallen_at: null });
  },

  runDailyRollover: (today) => {
    const character = get().character;
    if (!character) return;

    const patch: Partial<Character> = {};

    // Falling only locks the battle for the remainder of that day.
    if (character.fallen_at) {
      const fellOn = character.fallen_at.slice(0, 10);
      if (fellOn !== today) {
        const gear = aggregateEquipped(get().equipped);
        patch.fallen_at = null;
        patch.hp = effectiveMaxHp(character.max_hp, gear, character.stats);
      }
    }

    // Expired morale buffs clear themselves.
    if (
      character.morale_buff_expires &&
      new Date(character.morale_buff_expires).getTime() <= Date.now()
    ) {
      patch.morale_buff_expires = null;
      patch.morale_buff_percent = 0;
    }

    // Rank decay for absence, floored at the current division's entry.
    const decay = applyDecay(character.rank_xp, character.last_habit_date, today);
    if (decay.applied) {
      const rankState = rankStateForXp(decay.rank_xp_after);
      patch.rank_xp = decay.rank_xp_after;
      patch.rank_tier = rankState.tier;
      patch.rank_division = rankState.division;

      get().pushNotification({
        type: 'rank_change',
        title: 'Rank decay',
        body: `${decay.days_inactive} days away cost you ${decay.xp_lost.toLocaleString()} rank XP. Return today and you gain more than you lost.`,
      });
    }

    if (Object.keys(patch).length > 0) {
      get().updateCharacter(patch);
    }

    // Surface the comeback bonus, which is granted on the next completion.
    const comeback = evaluateComeback(character.rank_xp, character.last_habit_date, today);
    if (comeback.eligible) {
      get().pushNotification({
        type: 'system',
        title: 'Comeback bonus ready',
        body: `You were away ${comeback.days_away} days. Your next habit pays +15% rank XP.`,
      });
    }
  },

  setTitle: (title) => get().updateCharacter({ title }),

  /**
   * Renaming is global by construction: the leaderboards, the guild roster
   * and guild chat all read the name from `characters` rather than keeping
   * copies, so one row changes and every screen follows.
   *
   * The bounds match the database check exactly. Letting a 21st character
   * through here would surface as an opaque constraint violation from
   * Postgres after the local state had already changed.
   */
  renameCharacter: async (name) => {
    const character = get().character;
    if (!character) throw new Error('There is no character to rename.');

    const trimmed = name.trim().replace(/\s+/g, ' ');

    if (trimmed.length < 2) throw new Error('Names need at least 2 characters.');
    if (trimmed.length > 20) throw new Error('Names can be at most 20 characters.');
    if (trimmed === character.name) return true;

    const next = { ...character, name: trimmed, updated_at: nowTimestamp() };
    set({ character: next });

    return pushCharacter(next);
  },
});
