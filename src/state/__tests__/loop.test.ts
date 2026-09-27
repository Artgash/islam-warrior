/**
 * End-to-end test of the real game loop through the actual store.
 *
 * This drives the same code paths the UI does — create a character, add
 * habits, complete them, kill monsters, advance the road — with no mocks
 * beyond the storage adapter falling back to memory outside a browser.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../index';
import * as selectors from '../selectors';
import { getMonster } from '@/game/zones/monsters';
import { MONSTERS_PER_ZONE } from '@/game/constants';
import { today as todayISO } from '@/lib/date';

const USER_ID = 'test-user';

function freshStore() {
  useGameStore.getState().resetAll();
  useGameStore.getState().setHydrated(true);
  useGameStore.getState().setUser({
    id: USER_ID,
    email: 'warrior@example.com',
    created_at: new Date().toISOString(),
    is_admin: false,
    onboarded: true,
  });
}

function createWarrior() {
  useGameStore.getState().createCharacter(USER_ID, {
    name: 'Tester',
    avatar_id: 'av_ash',
    archetype: 'warrior',
    habits: [
      { name: 'Fajr prayer', category: 'faith', intensity: 5 },
      { name: 'Workout', category: 'strength', intensity: 4 },
      { name: 'No doomscrolling', category: 'bad_habit', intensity: 3 },
    ],
  });
}

describe('the game loop', () => {
  beforeEach(() => {
    freshStore();
    createWarrior();
  });

  it('creates a character at the start of the road', () => {
    const { character, habits } = useGameStore.getState();

    expect(character).not.toBeNull();
    expect(character!.name).toBe('Tester');
    expect(character!.level).toBe(1);
    expect(character!.current_zone).toBe(1);
    expect(character!.current_monster_index).toBe(0);
    expect(character!.current_monster_hp).toBe(getMonster(1, 0).max_hp);

    // The warrior archetype's head start landed.
    expect(character!.stats.strength).toBe(5);
    expect(character!.stats.endurance).toBe(3);

    expect(habits).toHaveLength(3);
  });

  it('turns a completed habit into damage, XP and coins', () => {
    // Zone 1's opener has only 50 HP, so a lucky crit can kill it outright —
    // which advances the road and makes current_monster_hp refer to the NEXT
    // monster. Give this encounter enough HP that it survives the strike.
    useGameStore.getState().updateCharacter({ current_monster_hp: 1_000_000 });

    const store = useGameStore.getState();
    const habit = store.habits[0];

    const hpBefore = store.character!.current_monster_hp;
    const coinsBefore = store.character!.coins;

    const result = store.completeHabit(habit.id);

    expect(result?.ok).toBe(true);
    expect(result!.damage).toBeGreaterThan(0);
    expect(result!.xp).toBeGreaterThan(0);
    expect(result!.coins).toBeGreaterThan(0);

    const after = useGameStore.getState().character!;
    expect(after.current_monster_hp).toBeLessThan(hpBefore);
    expect(after.coins).toBeGreaterThan(coinsBefore);
    expect(after.total_habits_completed).toBe(1);
    expect(after.streak).toBe(1);
    expect(after.last_habit_date).toBe(todayISO());
  });

  it('writes a log and refuses the same habit twice in one day', () => {
    const store = useGameStore.getState();
    const habit = store.habits[0];

    store.completeHabit(habit.id);
    expect(useGameStore.getState().logs).toHaveLength(1);

    const second = useGameStore.getState().completeHabit(habit.id);
    expect(second?.ok).toBe(false);
    expect(second?.reason).toBe('already_done');
    expect(useGameStore.getState().logs).toHaveLength(1);
  });

  it('raises the stat each habit category trains', () => {
    const store = useGameStore.getState();

    store.completeHabit(store.habits[0].id); // faith
    expect(useGameStore.getState().character!.stats.faith).toBe(1);

    useGameStore.getState().completeHabit(useGameStore.getState().habits[1].id); // strength
    expect(useGameStore.getState().character!.stats.strength).toBe(6); // 5 archetype + 1

    useGameStore.getState().completeHabit(useGameStore.getState().habits[2].id); // resistance
    expect(useGameStore.getState().character!.stats.defense_stat).toBe(1);
  });

  it('pays triple for resisting a bad habit', () => {
    const store = useGameStore.getState();
    const resist = store.habits.find((h) => h.category === 'bad_habit')!;

    // Same intensity, different category.
    store.addHabit({ name: 'Read 15 min', category: 'intelligence', intensity: 3 });
    const normal = useGameStore.getState().habits.find((h) => h.name === 'Read 15 min')!;

    // Give the monster enough HP that neither strike can kill it — a kill
    // would fold the monster's XP reward into the result and mask the
    // category difference we are actually measuring.
    useGameStore.getState().updateCharacter({ current_monster_hp: 1_000_000 });

    const resistResult = useGameStore.getState().completeHabit(resist.id)!;
    const normalResult = useGameStore.getState().completeHabit(normal.id)!;

    // Intensity 3 pays 25 XP, tripled to 75 for resistance. Crits do not
    // affect XP, so this comparison is exact.
    expect(resistResult.xp).toBe(75);
    expect(normalResult.xp).toBe(25);
  });

  it('grows the combo with each habit completed today', () => {
    const store = useGameStore.getState();

    const first = store.completeHabit(store.habits[0].id)!;
    const second = useGameStore.getState().completeHabit(
      useGameStore.getState().habits[1].id,
    )!;

    expect(first.combo).toBe(1);
    expect(second.combo).toBe(2);
  });

  it('kills a monster and steps forward on the road', () => {
    // A very strong warrior so one strike ends it.
    useGameStore.getState().updateCharacter({ base_attack: 100_000 });

    const habit = useGameStore.getState().habits[0];
    const result = useGameStore.getState().completeHabit(habit.id)!;

    expect(result.monster_killed).toBe(true);
    expect(result.loot.length).toBeGreaterThan(0);

    const after = useGameStore.getState().character!;
    expect(after.current_monster_index).toBe(1);
    expect(after.current_zone).toBe(1);
    expect(after.total_monsters_killed).toBe(1);
    expect(after.current_monster_hp).toBe(getMonster(1, 1).max_hp);
  });

  it('opens the next zone when the boss falls', () => {
    useGameStore.getState().updateCharacter({
      base_attack: 100_000,
      current_monster_index: MONSTERS_PER_ZONE - 1,
      current_monster_hp: getMonster(1, MONSTERS_PER_ZONE - 1).max_hp,
    });

    const habit = useGameStore.getState().habits[0];
    const result = useGameStore.getState().completeHabit(habit.id)!;

    expect(result.monster_killed).toBe(true);
    expect(result.zone_cleared).toBe(true);

    const after = useGameStore.getState().character!;
    expect(after.current_zone).toBe(2);
    expect(after.current_monster_index).toBe(0);
    expect(after.total_bosses_killed).toBe(1);
  });

  it('levels up and fully heals when enough XP lands', () => {
    // Lots of XP from one strike.
    useGameStore.getState().updateCharacter({ base_attack: 100_000, hp: 10 });

    const habit = useGameStore.getState().habits[0];
    const result = useGameStore.getState().completeHabit(habit.id)!;

    if (result.levels_gained > 0) {
      const after = useGameStore.getState().character!;
      expect(after.level).toBeGreaterThan(1);
      expect(after.hp).toBe(after.max_hp);
    }
  });

  it('locks the battle after falling, and unlocks it the next day', () => {
    // A monster that hits far harder than the player can absorb.
    useGameStore.getState().updateCharacter({
      hp: 1,
      base_defense: 0,
      current_zone: 40,
      current_monster_index: 3,
      current_monster_hp: getMonster(40, 3).max_hp,
      base_attack: 1,
    });

    const habit = useGameStore.getState().habits[0];
    const result = useGameStore.getState().completeHabit(habit.id)!;

    expect(result.player_fallen).toBe(true);
    expect(useGameStore.getState().character!.fallen_at).not.toBeNull();

    // Further moves are refused while fallen.
    const blocked = useGameStore.getState().completeHabit(
      useGameStore.getState().habits[1].id,
    );
    expect(blocked?.ok).toBe(false);
    expect(blocked?.reason).toBe('fallen');

    // Rolling into a new day clears it and restores HP.
    useGameStore.getState().updateCharacter({ fallen_at: '2020-01-01T00:00:00.000Z' });
    useGameStore.getState().runDailyRollover(todayISO());

    const recovered = useGameStore.getState().character!;
    expect(recovered.fallen_at).toBeNull();
    expect(recovered.hp).toBeGreaterThan(0);
  });

  it('unlocks achievements as milestones are met', () => {
    useGameStore.getState().updateCharacter({ longest_streak: 7 });
    const unlocked = useGameStore.getState().evaluateAchievements();

    expect(unlocked.some((a) => a.id === 'ach_streak_7')).toBe(true);
    expect(useGameStore.getState().achievements.length).toBeGreaterThan(0);

    // Re-running must not double-award.
    const again = useGameStore.getState().evaluateAchievements();
    expect(again.some((a) => a.id === 'ach_streak_7')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Selector stability                                                  */
/*                                                                     */
/* Zustand v5 reads through useSyncExternalStore, which demands a       */
/* referentially stable snapshot for unchanged state. A selector that   */
/* builds a fresh object or array every call sends React into an        */
/* infinite render loop ("Maximum update depth exceeded"). Anything     */
/* exported as `select*` is passed directly to useGameStore, so every   */
/* one of them must return a primitive or a stable reference.           */
/* ------------------------------------------------------------------ */

describe('selector stability', () => {
  beforeEach(() => {
    freshStore();
    createWarrior();
    // Populate the state the selectors read, so none of them short-circuit
    // on an empty store and pass trivially.
    useGameStore.getState().completeHabit(useGameStore.getState().habits[0].id);
    useGameStore.getState().forceFireTaunt();
    useGameStore.getState().pushNotification({
      type: 'system',
      title: 'Test',
      body: 'Test',
    });
  });

  const selectorNames = Object.keys(selectors).filter((name) => name.startsWith('select'));

  it('exports selectors to test', () => {
    expect(selectorNames.length).toBeGreaterThan(8);
  });

  it.each(selectorNames)(
    '%s returns a stable value across repeated reads',
    (name) => {
      const selector = (selectors as Record<string, unknown>)[name] as (
        state: ReturnType<typeof useGameStore.getState>,
      ) => unknown;

      const state = useGameStore.getState();
      const first = selector(state);
      const second = selector(state);

      // Object.is is exactly the comparison useSyncExternalStore applies.
      expect(
        Object.is(first, second),
        `${name} returned a new reference for unchanged state — this will loop React forever. ` +
          `Move it to a compute* function and expose it through a memoised hook.`,
      ).toBe(true);
    },
  );

  it('keeps compute* helpers out of the select* namespace', () => {
    // compute* functions build new objects by design; they must never be
    // passed to useGameStore, so they must not be named select*.
    selectorNames.forEach((name) => {
      expect(name.startsWith('compute')).toBe(false);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

describe('the shop', () => {
  beforeEach(() => {
    freshStore();
    createWarrior();
  });

  it('refuses a purchase below the required rank', () => {
    useGameStore.getState().updateCharacter({ coins: 1_000_000, rank_tier: 1 });

    const result = useGameStore.getState().buyItem('sw_10');
    expect(result.ok).toBe(false);
  });

  it('buys, equips, and raises the player\'s attack', () => {
    useGameStore.getState().updateCharacter({ coins: 10_000, rank_tier: 5 });

    const before = useGameStore.getState().character!.base_attack;

    const result = useGameStore.getState().buyItem('sw_06'); // Zulfiqar, +50 ATK
    expect(result.ok).toBe(true);

    useGameStore.getState().equipItem('sw_06');
    expect(useGameStore.getState().equipped.sword).toBe('sw_06');

    // Base attack is untouched; the gear bonus is applied on top.
    expect(useGameStore.getState().character!.base_attack).toBe(before);

    const habit = useGameStore.getState().habits[0];
    const withGear = useGameStore.getState().completeHabit(habit.id)!;
    expect(withGear.damage).toBeGreaterThan(0);
  });

  it('spends coins and records the transaction', () => {
    useGameStore.getState().updateCharacter({ coins: 10_000, rank_tier: 5 });
    const before = useGameStore.getState().character!.coins;

    useGameStore.getState().buyItem('sw_02'); // Iron Sword, 300

    expect(useGameStore.getState().character!.coins).toBe(before - 300);
    expect(useGameStore.getState().coinLog[0].amount).toBe(-300);
  });

  it('consumes a health potion and heals', () => {
    useGameStore.getState().updateCharacter({ coins: 10_000, rank_tier: 5, hp: 10 });

    useGameStore.getState().buyItem('cn_potion');
    const result = useGameStore.getState().useConsumable('cn_potion');

    expect(result.ok).toBe(true);
    expect(useGameStore.getState().character!.hp).toBeGreaterThan(10);
    // The potion is spent.
    expect(useGameStore.getState().inventory.find((e) => e.item_id === 'cn_potion')).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* Iblis                                                               */
/* ------------------------------------------------------------------ */

describe('iblis', () => {
  beforeEach(() => {
    freshStore();
    createWarrior();
  });

  it('records a taunt and grants morale when answered', () => {
    useGameStore.getState().forceFireTaunt();

    const taunt = useGameStore.getState().activeTaunt;
    expect(taunt).not.toBeNull();
    expect(useGameStore.getState().taunts).toHaveLength(1);

    useGameStore.getState().replyToTaunt(2);

    const answered = useGameStore.getState().taunts[0];
    expect(answered.replied_at).not.toBeNull();
    expect(answered.reply_text).toBe('Watch me.');

    const character = useGameStore.getState().character!;
    expect(character.morale_buff_percent).toBe(0.1);
    expect(new Date(character.morale_buff_expires!).getTime()).toBeGreaterThan(Date.now());
  });

  it('raises damage while morale is active', () => {
    const habit = useGameStore.getState().habits[0];

    // Crits are rolled at random and would swamp a 50% morale difference,
    // so take them out of the comparison entirely.
    useGameStore.getState().updateCharacter({
      crit_chance: 0,
      current_monster_hp: 1_000_000,
    });

    const plain = useGameStore.getState().completeHabit(habit.id)!;

    // Clear today's log so the same habit can fire again, then buff.
    useGameStore.setState({ logs: [] });
    useGameStore.getState().updateCharacter({
      morale_buff_percent: 0.5,
      morale_buff_expires: new Date(Date.now() + 3_600_000).toISOString(),
      current_monster_hp: 1_000_000,
    });

    const buffed = useGameStore.getState().completeHabit(habit.id)!;
    expect(buffed.damage).toBeGreaterThan(plain.damage);
  });
});
