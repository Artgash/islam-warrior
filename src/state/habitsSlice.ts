import type { Character, Habit, HabitLog, LootResult } from '@/types';
import type { CompleteHabitOutcome, HabitsSlice, SliceCreator } from './types';
import { uuid } from '@/lib/utils';
import { nowTimestamp, today as todayISO } from '@/lib/date';
import { getMonster } from '@/game/zones/monsters';
import { aggregateEquipped } from '@/game/shop/gearStats';
import { effectiveMaxHp } from '@/game/battle/formulas';
import {
  advanceRoad,
  counterEvent,
  deathEvent,
  fallenEvent,
  hasComboCharm,
  hasLootLuck,
  makeEvent,
  snapshotOf,
  strikeEvent,
  xpBoostMultiplier,
} from '@/game/battle/combat';
import { resolveCounterAttack } from '@/game/battle/damage';
import { resolveHabitCompletion, monsterKillCoins, monsterKillXp } from '@/game/habits/xp';
import { comboCountFor, updateStreak, wasCompletedOn } from '@/game/habits/streaks';
import { awardStatPoint } from '@/game/character/stats';
import { lootCoins, lootFragments, lootItemIds, rollLoot } from '@/game/loot';
import { evaluateComeback } from '@/game/ranks/decay';
import { rankStateForXp } from '@/game/ranks/rankLogic';
import { isConsumable } from '@/game/shop/gearStats';
import { play, playBossDefeat, vibrate } from '@/platform/sound';
import { deleteHabitRemote, pushHabitLog, pushHabits } from '@/api/sync';

function newHabit(userId: string, input: Parameters<HabitsSlice['addHabit']>[0]): Habit {
  return {
    id: uuid(),
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    intensity: input.intensity,
    frequency_type: input.frequency_type ?? 'daily',
    frequency_value: input.frequency_value ?? 7,
    days_of_week: input.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
    cue_time: input.cue_time ?? null,
    cue_trigger: input.cue_trigger ?? null,
    is_active: true,
    streak: 0,
    longest_streak: 0,
    total_completions: 0,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp(),
  };
}

const EMPTY_OUTCOME = (reason: CompleteHabitOutcome['reason']): CompleteHabitOutcome => ({
  ok: false,
  reason,
  xp: 0,
  coins: 0,
  damage: 0,
  was_crit: false,
  combo: 0,
  monster_killed: false,
  levels_gained: 0,
  rank_changed: false,
  loot: [],
  zone_cleared: false,
  road_complete: false,
  player_fallen: false,
  unlocked: [],
});

export const createHabitsSlice: SliceCreator<HabitsSlice> = (set, get) => ({
  habits: [],
  logs: [],

  addHabit: (input) => {
    const userId = get().user?.id ?? get().character?.user_id ?? 'local';
    const habit = newHabit(userId, input);

    set((state) => ({ habits: [...state.habits, habit] }));
    void pushHabits([habit]);
    return habit;
  },

  addHabitsFromTemplates: (templates) => {
    const userId = get().user?.id ?? get().character?.user_id ?? 'local';
    const created = templates.map((t) =>
      newHabit(userId, {
        name: t.name,
        category: t.category,
        intensity: t.intensity,
        cue_trigger: t.cue_trigger ?? null,
        description: t.description,
      }),
    );

    set((state) => ({ habits: [...state.habits, ...created] }));
    void pushHabits(created);
  },

  updateHabit: (id, patch) => {
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, ...patch, updated_at: nowTimestamp() } : h,
      ),
    }));

    const updated = get().habits.find((h) => h.id === id);
    if (updated) void pushHabits([updated]);
  },

  deleteHabit: (id) => {
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      logs: state.logs.filter((l) => l.habit_id !== id),
    }));
    void deleteHabitRemote(id);
  },

  toggleHabitActive: (id) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    get().updateHabit(id, { is_active: !habit.is_active });
  },

  /* ---------------------------------------------------------------- */
  /* The move                                                          */
  /* ---------------------------------------------------------------- */

  completeHabit: (habitId) => {
    const state = get();
    const character = state.character;
    const habit = state.habits.find((h) => h.id === habitId);
    const date = todayISO();

    if (!character) return EMPTY_OUTCOME('no_character');
    if (!habit) return EMPTY_OUTCOME('no_habit');
    if (character.fallen_at) return EMPTY_OUTCOME('fallen');
    if (wasCompletedOn(state.logs, habitId, date)) return EMPTY_OUTCOME('already_done');

    /* --- Resolve the strike ---------------------------------------- */

    const gear = aggregateEquipped(state.equipped);
    const snapshot = snapshotOf(character, gear);
    // A Reroll can substitute the encounter without moving the player's
    // real position on the road.
    const encounterIndex = state.encounterOverride ?? character.current_monster_index;
    const monster = getMonster(character.current_zone, encounterIndex);
    const combo = comboCountFor(state.logs, date);
    const xpBoost = xpBoostMultiplier(state.activeEffects);
    const charmed = hasComboCharm(state.activeEffects);

    const reward = resolveHabitCompletion({
      habit,
      snapshot,
      habitsDoneToday: charmed ? combo + 3 : combo,
      monster,
      monsterHp: character.current_monster_hp,
      xpBoost,
      pierceDefense: charmed,
    });

    const events = [
      strikeEvent(habit.name, monster, {
        damage: reward.damage,
        was_crit: reward.was_crit,
      }),
    ];

    play(reward.was_crit ? 'sword_crit' : 'sword_hit');
    vibrate(reward.was_crit ? [15, 30, 15] : 12);

    /* --- Log the completion ---------------------------------------- */

    const log: HabitLog = {
      id: uuid(),
      user_id: character.user_id,
      habit_id: habit.id,
      date,
      intensity: habit.intensity,
      category: habit.category,
      xp_gained: reward.xp,
      coins_gained: reward.coins,
      damage_dealt: reward.damage,
      was_crit: reward.was_crit,
      combo_at_time: combo,
      created_at: nowTimestamp(),
    };

    const logs = [log, ...state.logs];

    /* --- Stats, streaks -------------------------------------------- */

    const statAward = awardStatPoint(character.stats, habit.category, state.logs, date);
    const dailyStreak = updateStreak(
      character.streak,
      character.longest_streak,
      character.last_habit_date,
      date,
    );
    const habitStreak = updateStreak(habit.streak, habit.longest_streak, null, date);

    const comeback = evaluateComeback(character.rank_xp, character.last_habit_date, date);
    const comebackXp = comeback.eligible ? comeback.bonus_xp : 0;

    let patch: Partial<Character> = {
      stats: statAward.stats,
      streak: dailyStreak.streak,
      longest_streak: dailyStreak.longest_streak,
      last_habit_date: date,
      total_habits_completed: character.total_habits_completed + 1,
      days_active:
        character.last_habit_date === date ? character.days_active : character.days_active + 1,
      current_monster_hp: reward.monster_hp_after,
    };

    /* --- Kill, loot, advance --------------------------------------- */

    let loot: LootResult[] = [];
    let zoneCleared = false;
    let roadComplete = false;
    let killXp = 0;
    let killCoins = 0;

    if (reward.monster_killed) {
      events.push(deathEvent(monster));

      // A zone keeper deserves more than the usual puff of ash.
      if (monster.is_boss) {
        playBossDefeat();
        vibrate([40, 60, 40, 60, 120]);
      } else {
        play('monster_death');
        vibrate([20, 40, 20]);
      }

      killXp = monsterKillXp(monster, snapshot, xpBoost);
      killCoins = monsterKillCoins(monster, snapshot);

      loot = rollLoot({
        monster,
        baseCoins: killCoins,
        luckCharm: hasLootLuck(state.activeEffects),
      });

      const advance = advanceRoad(character.current_zone, character.current_monster_index);
      zoneCleared = advance.zone_cleared;
      roadComplete = advance.road_complete;

      // The substitution is spent; the next encounter is the real one.
      set({ encounterOverride: null });

      const nextMonster = getMonster(advance.position.zone, advance.position.index);

      patch = {
        ...patch,
        current_zone: advance.position.zone,
        current_monster_index: advance.position.index,
        current_monster_hp: roadComplete ? 0 : nextMonster.max_hp,
        total_monsters_killed: character.total_monsters_killed + 1,
        total_bosses_killed: character.total_bosses_killed + (monster.is_boss ? 1 : 0),
      };

      loot.forEach((l) => events.push(makeEvent('loot', l.message, l.coins)));

      if (zoneCleared && !roadComplete) {
        set({ pendingZoneClear: advance.position.zone });
        play('zone_clear', 0.7);
        events.push(
          makeEvent('zone_cleared', `Zone ${character.current_zone} cleared. The road opens.`),
        );
      }

      if (roadComplete) {
        events.push(
          makeEvent('zone_cleared', 'Iblis has fallen. The Throne is empty. You are still standing.'),
        );
      }
    }

    /* --- Counterattack --------------------------------------------- */

    let playerFallen = false;

    if (!reward.monster_killed) {
      const counter = resolveCounterAttack({
        snapshot,
        monster,
        playerHp: character.hp,
      });

      events.push(counterEvent(monster, counter));
      patch.hp = counter.player_hp_after;

      if (counter.player_fallen) {
        playerFallen = true;
        patch.fallen_at = nowTimestamp();
        events.push(fallenEvent());
      }
    }

    /* --- Commit ----------------------------------------------------- */

    set((s) => ({
      logs,
      habits: s.habits.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              streak: habitStreak.streak,
              longest_streak: habitStreak.longest_streak,
              total_completions: h.total_completions + 1,
              updated_at: nowTimestamp(),
            }
          : h,
      ),
      combatLog: [...events, ...s.combatLog].slice(0, 60),
      lastDamage: { amount: reward.damage, crit: reward.was_crit, at: Date.now() },
      shaking: true,
      pendingLoot: loot.length > 0 ? loot : null,
    }));

    get().updateCharacter(patch);
    void pushHabitLog(log);

    // Spend one Combo Charm / Loot Luck charge.
    if (charmed || (reward.monster_killed && hasLootLuck(state.activeEffects))) {
      set((s) => ({
        activeEffects: s.activeEffects
          .map((e) =>
            (e.effect === 'combo_charm' && charmed) ||
            (e.effect === 'loot_luck' && reward.monster_killed)
              ? { ...e, charges: (e.charges ?? 1) - 1 }
              : e,
          )
          .filter((e) => e.charges === null || e.charges > 0),
      }));
    }

    /* --- Rewards ---------------------------------------------------- */

    get().grantCoins(reward.coins, 'habit', `Completed ${habit.name}`);

    if (killCoins > 0) get().grantCoins(killCoins, 'kill', `Defeated ${monster.name}`);

    const extraCoins = lootCoins(loot);
    if (extraCoins > 0) get().grantCoins(extraCoins, 'loot', `Loot from ${monster.name}`);

    lootItemIds(loot).forEach((itemId) => {
      get().grantItem(itemId, isConsumable(itemId) ? 1 : 1);
    });

    const fragments = lootFragments(loot);
    if (fragments > 0) get().addFragments(fragments);

    const totalXp = reward.xp + killXp;
    const xpResult = get().grantXp(totalXp);

    // Comeback bonus is applied to rank XP only, on top of the normal grant.
    if (comebackXp > 0) {
      const c = get().character;
      if (c) {
        const rankState = rankStateForXp(c.rank_xp + comebackXp);
        get().updateCharacter({
          rank_xp: c.rank_xp + comebackXp,
          rank_tier: rankState.tier,
          rank_division: rankState.division,
        });
      }
    }

    // Gear can raise max HP; make sure current HP never exceeds it.
    const after = get().character;
    if (after) {
      const maxHp = effectiveMaxHp(after.max_hp, aggregateEquipped(get().equipped), after.stats);
      if (after.hp > maxHp) get().updateCharacter({ hp: maxHp });
    }

    play('habit_complete');

    const unlocked = get().evaluateAchievements();

    if (playerFallen) {
      get().pushNotification({
        type: 'system',
        title: 'You have fallen',
        body: 'Rest and return tomorrow. Nothing is lost — a comeback bonus waits for you.',
      });
    }

    get().maybeFireTaunt();

    return {
      ok: true,
      xp: totalXp,
      coins: reward.coins + killCoins + extraCoins,
      damage: reward.damage,
      was_crit: reward.was_crit,
      combo: combo + 1,
      monster_killed: reward.monster_killed,
      levels_gained: xpResult.levels_gained,
      rank_changed: xpResult.rank_changed,
      loot,
      zone_cleared: zoneCleared,
      road_complete: roadComplete,
      player_fallen: playerFallen,
      unlocked,
    };
  },
});
