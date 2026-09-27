/**
 * Tests for the pure game layer. Everything here runs with no DOM, no store
 * and no network — which is the point of keeping /src/game free of both.
 */

import { describe, expect, it } from 'vitest';
import type { CombatantSnapshot, Habit, HabitLog, Stats } from '@/types';
import {
  EMPTY_STATS,
  MONSTERS_PER_ZONE,
  TOTAL_ZONES,
  IBLIS_HP,
  IBLIS_HP_EXACT,
} from '../constants';
import { ZONES, getZone } from '../zones/zones';
import {
  TOTAL_MONSTERS,
  buildZoneMonsters,
  composeMonsterName,
  getBestiary,
  getMonster,
} from '../zones/monsters';
import { resolveCounterAttack, resolveStrike } from '../battle/damage';
import { advanceRoad, roadProgress } from '../battle/combat';
import { EMPTY_GEAR, comboMultiplier, effectiveMaxHp, mitigatedMonsterDamage } from '../battle/formulas';
import { applyXp, moveSlotsForLevel, xpToNextLevel } from '../character/leveling';
import { awardStatPoint, statForCategory } from '../character/stats';
import {
  RANKS,
  UNLIMITED_HABITS,
  divisionForXp,
  rankMaxHabits,
  rankStateForXp,
  tierForXp,
} from '../ranks/rankLogic';
import { applyDecay, evaluateComeback } from '../ranks/decay';
import { baseXpFor } from '../habits/intensity';
import { updateStreak, isoWeekKey, resistanceStreak } from '../habits/streaks';
import { BAD_HABIT_PACK, HABIT_PACKS, allTemplates } from '../habits/packs';
import { ALL_GEAR, CONSUMABLES, aggregateEquipped } from '../shop/gearStats';
import { checkPurchase } from '../shop/pricing';
import { rollLoot } from '../loot';
import { TAUNTS, canFireTaunt, selectTaunt } from '../iblis/taunts';
import { REPLIES, buildMoraleBuff } from '../iblis/replies';
import { ACHIEVEMENTS, checkNewUnlocks } from '../achievements/checkers';
import { SEASON_PASS, applySoftReset } from '../seasons/seasonLogic';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const baseStats: Stats = { ...EMPTY_STATS };

function snapshot(overrides: Partial<CombatantSnapshot> = {}): CombatantSnapshot {
  return {
    base_attack: 10,
    base_defense: 5,
    crit_chance: 0.05,
    crit_multiplier: 2,
    stats: baseStats,
    rank_tier: 1,
    morale_multiplier: 1,
    gear: EMPTY_GEAR,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Zones + monsters                                                    */
/* ------------------------------------------------------------------ */

describe('zones', () => {
  it('has exactly 66 zones numbered 1..66', () => {
    expect(ZONES).toHaveLength(TOTAL_ZONES);
    ZONES.forEach((zone, i) => expect(zone.id).toBe(i + 1));
  });

  it('ends at the Throne of Iblis', () => {
    const final = getZone(66);
    expect(final.name).toBe('The Throne of Iblis');
    expect(final.boss_name).toBe('IBLIS');
  });

  it('scales base HP monotonically up to zone 65', () => {
    for (let i = 1; i < 64; i += 1) {
      expect(getZone(i + 1).base_hp).toBeGreaterThan(getZone(i).base_hp);
    }
  });
});

describe('monsters', () => {
  it('builds 16 monsters per zone, 1056 in total', () => {
    expect(buildZoneMonsters(1)).toHaveLength(MONSTERS_PER_ZONE);
    expect(getBestiary()).toHaveLength(TOTAL_MONSTERS);
    expect(TOTAL_MONSTERS).toBe(66 * 16);
  });

  it('gives every monster a unique id and a non-empty name', () => {
    const bestiary = getBestiary();
    const ids = new Set(bestiary.map((m) => m.id));
    expect(ids.size).toBe(bestiary.length);
    bestiary.forEach((m) => expect(m.name.trim().length).toBeGreaterThan(0));
  });

  it('generates 15 unique names within every zone', () => {
    for (let zone = 1; zone <= TOTAL_ZONES; zone += 1) {
      const names = new Set(
        Array.from({ length: 15 }, (_, i) => composeMonsterName(zone, i)),
      );
      expect(names.size, `zone ${zone} produced duplicate names`).toBe(15);
    }
  });

  it('uses the authored names for zone 1', () => {
    expect(composeMonsterName(1, 0)).toBe('Yawning Imp');
    expect(composeMonsterName(1, 14)).toBe('Lazy Giant');
  });

  it('marks index 15 as the zone boss with the authored boss name', () => {
    const boss = getMonster(7, 15);
    expect(boss.is_boss).toBe(true);
    expect(boss.name).toBe('The Golden Serpent');
  });

  it('gives Iblis his full HP', () => {
    expect(getMonster(66, 15).max_hp).toBe(IBLIS_HP);
    expect(getMonster(66, 15).name).toBe('IBLIS');
  });

  it('carries the exact Iblis HP as a string, beyond float precision', () => {
    const iblis = getMonster(66, 15);

    // The authored figure is larger than Number.MAX_SAFE_INTEGER, so the
    // float silently rounds. The exact value must survive for the DB and UI.
    expect(IBLIS_HP).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    expect(iblis.max_hp_exact).toBe(IBLIS_HP_EXACT);
    expect(IBLIS_HP_EXACT).toBe('999999999999999999');
    expect(IBLIS_HP_EXACT).toHaveLength(18);
  });

  it('gives no other monster an exact override', () => {
    const withExact = getBestiary().filter((m) => m.max_hp_exact !== undefined);
    expect(withExact).toHaveLength(1);
    expect(withExact[0].id).toBe('z66_m15');
  });

  it('keeps zone 66 servants beatable rather than Iblis-scaled', () => {
    const servant = getMonster(66, 0);
    expect(servant.max_hp).toBeLessThan(1_000_000);
  });

  it('rejects out-of-range positions', () => {
    expect(() => getMonster(0, 0)).toThrow();
    expect(() => getMonster(67, 0)).toThrow();
    expect(() => getMonster(1, 16)).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Combat                                                              */
/* ------------------------------------------------------------------ */

describe('damage', () => {
  const monster = getMonster(1, 0);

  it('scales with habit intensity', () => {
    const light = resolveStrike({
      snapshot: snapshot(),
      intensity: 1,
      habitsDoneToday: 0,
      monster,
      monsterHp: monster.max_hp,
      rng: () => 1,
    });
    const extreme = resolveStrike({
      snapshot: snapshot(),
      intensity: 5,
      habitsDoneToday: 0,
      monster,
      monsterHp: monster.max_hp,
      rng: () => 1,
    });

    expect(extreme.damage).toBeGreaterThan(light.damage);
  });

  it('applies the crit multiplier when the roll lands', () => {
    const normal = resolveStrike({
      snapshot: snapshot(),
      intensity: 3,
      habitsDoneToday: 0,
      monster,
      monsterHp: monster.max_hp,
      rng: () => 1,
    });
    const crit = resolveStrike({
      snapshot: snapshot(),
      intensity: 3,
      habitsDoneToday: 0,
      monster,
      monsterHp: monster.max_hp,
      rng: () => 0,
    });

    expect(crit.was_crit).toBe(true);
    expect(crit.damage).toBeGreaterThan(normal.damage);
  });

  it('never deals less than 1 damage', () => {
    const tank = getMonster(66, 14);
    const result = resolveStrike({
      snapshot: snapshot(),
      intensity: 1,
      habitsDoneToday: 0,
      monster: tank,
      monsterHp: tank.max_hp,
      rng: () => 1,
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('flags the kill when HP reaches zero', () => {
    const result = resolveStrike({
      snapshot: snapshot({ base_attack: 100000 }),
      intensity: 5,
      habitsDoneToday: 0,
      monster,
      monsterHp: 10,
      rng: () => 1,
    });
    expect(result.monster_killed).toBe(true);
    expect(result.monster_hp_after).toBe(0);
  });

  it('grows with combo count', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(5)).toBeCloseTo(1.5);
    // Capped so a huge day cannot trivialise a boss.
    expect(comboMultiplier(100)).toBe(3);
  });
});

describe('counterattack', () => {
  const monster = getMonster(5, 3);

  it('always lands at least 1 damage through heavy armour', () => {
    const armoured = snapshot({ base_defense: 99999 });
    expect(mitigatedMonsterDamage(monster.attack, armoured)).toBe(1);
  });

  it('can be dodged when boots allow it', () => {
    const nimble = snapshot({ gear: { ...EMPTY_GEAR, dodge: 0.4 } });
    const result = resolveCounterAttack({
      snapshot: nimble,
      monster,
      playerHp: 100,
      rng: () => 0,
    });
    expect(result.dodged).toBe(true);
    expect(result.player_hp_after).toBe(100);
  });

  it('marks the player fallen at zero HP', () => {
    const result = resolveCounterAttack({
      snapshot: snapshot({ base_defense: 0 }),
      monster: { ...monster, attack: 500 },
      playerHp: 10,
      rng: () => 1,
    });
    expect(result.player_fallen).toBe(true);
    expect(result.player_hp_after).toBe(0);
  });
});

describe('road advancement', () => {
  it('steps through a zone one monster at a time', () => {
    const result = advanceRoad(1, 0);
    expect(result.position).toEqual({ zone: 1, index: 1 });
    expect(result.zone_cleared).toBe(false);
  });

  it('opens the next zone after the boss falls', () => {
    const result = advanceRoad(1, 15);
    expect(result.position).toEqual({ zone: 2, index: 0 });
    expect(result.zone_cleared).toBe(true);
    expect(result.road_complete).toBe(false);
  });

  it('completes the road when Iblis falls', () => {
    const result = advanceRoad(66, 15);
    expect(result.road_complete).toBe(true);
    expect(result.position).toEqual({ zone: 66, index: 15 });
  });

  it('reports progress from 0 to 1 across the whole road', () => {
    expect(roadProgress(1, 0)).toBe(0);
    expect(roadProgress(66, 15)).toBeCloseTo(1, 2);
  });
});

/* ------------------------------------------------------------------ */
/* Levelling                                                           */
/* ------------------------------------------------------------------ */

describe('levelling', () => {
  it('follows the authored XP curve', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(10)).toBe(1000);
    expect(xpToNextLevel(11)).toBe(1650);
    expect(xpToNextLevel(31)).toBe(7750);
    expect(xpToNextLevel(61)).toBe(24400);
    expect(xpToNextLevel(101)).toBe(60600);
  });

  it('grants the documented rewards per level', () => {
    const gains = applyXp(1, 0, 100);
    expect(gains.new_level).toBe(2);
    expect(gains.hp_gained).toBe(20);
    expect(gains.attack_gained).toBe(3);
    expect(gains.defense_gained).toBe(2);
  });

  it('rolls through multiple levels from one large reward', () => {
    const gains = applyXp(1, 0, 100_000);
    expect(gains.levels_gained).toBeGreaterThan(5);
    expect(gains.xp_remainder).toBeLessThan(xpToNextLevel(gains.new_level));
  });

  it('unlocks a move slot every three levels, capped at ten', () => {
    expect(moveSlotsForLevel(1)).toBe(3);
    expect(moveSlotsForLevel(4)).toBe(4);
    expect(moveSlotsForLevel(100)).toBe(10);
  });

  it('raises max HP with gear and endurance', () => {
    const withEndurance: Stats = { ...baseStats, endurance: 100 };
    // +10% from 100 endurance, plus 500 flat from gear.
    expect(effectiveMaxHp(1000, { ...EMPTY_GEAR, hp: 500 }, withEndurance)).toBe(1650);
  });
});

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

describe('stats', () => {
  it('maps each category to the stat it trains', () => {
    expect(statForCategory('faith')).toBe('faith');
    expect(statForCategory('discipline')).toBe('endurance');
    expect(statForCategory('bad_habit')).toBe('defense_stat');
  });

  it('caps stat gain at five per day per stat', () => {
    const logs: HabitLog[] = Array.from({ length: 5 }, (_, i) => ({
      id: `l${i}`,
      user_id: 'u',
      habit_id: `h${i}`,
      date: '2026-09-24',
      intensity: 3,
      category: 'faith',
      xp_gained: 0,
      coins_gained: 0,
      damage_dealt: 0,
      was_crit: false,
      combo_at_time: 0,
      created_at: '2026-09-24T08:00:00.000Z',
    }));

    const result = awardStatPoint(baseStats, 'faith', logs, '2026-09-24');
    expect(result.gained).toBe(false);

    const fresh = awardStatPoint(baseStats, 'faith', [], '2026-09-24');
    expect(fresh.gained).toBe(true);
    expect(fresh.stats.faith).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Ranks                                                               */
/* ------------------------------------------------------------------ */

describe('ranks', () => {
  it('has ten tiers with ascending requirements and multipliers', () => {
    expect(RANKS).toHaveLength(10);
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i].xp_required).toBeGreaterThan(RANKS[i - 1].xp_required);
      expect(RANKS[i].multiplier).toBeGreaterThan(RANKS[i - 1].multiplier);
    }
  });

  it('never caps habits at any rank', () => {
    // Habit slots used to be gated by rank. They are not any more: rank buys
    // multipliers and features, never permission to build a habit.
    RANKS.forEach((rank) => {
      expect(rank.max_habits).toBe(UNLIMITED_HABITS);
      expect(rankMaxHabits(rank.tier)).toBe(UNLIMITED_HABITS);
    });

    // And no rank should still advertise a slot count in its unlocks.
    RANKS.forEach((rank) => {
      rank.unlocks.forEach((unlock) => {
        expect(unlock).not.toMatch(/\d+\s+habit slots/i);
      });
    });
  });

  it('places XP totals in the right tier', () => {
    expect(tierForXp(0)).toBe(1);
    expect(tierForXp(499)).toBe(1);
    expect(tierForXp(500)).toBe(2);
    expect(tierForXp(600_000)).toBe(10);
    expect(tierForXp(99_999_999)).toBe(10);
  });

  it('counts divisions downward from III to I', () => {
    expect(divisionForXp(0)).toBe(3);
    expect(divisionForXp(1000)).toBe(2);
    expect(divisionForXp(1900)).toBe(1);
  });

  it('reports division progress between 0 and 1', () => {
    const state = rankStateForXp(1200);
    expect(state.division_progress).toBeGreaterThanOrEqual(0);
    expect(state.division_progress).toBeLessThanOrEqual(1);
  });
});

describe('decay and comeback', () => {
  it('does nothing inside the two-day grace period', () => {
    const result = applyDecay(10_000, '2026-09-23', '2026-09-24');
    expect(result.applied).toBe(false);
  });

  it('applies escalating decay with longer absences', () => {
    const short = applyDecay(10_000, '2026-09-18', '2026-09-24'); // 6 days
    const long = applyDecay(10_000, '2026-09-01', '2026-09-24'); // 23 days
    expect(short.percent).toBe(0.05);
    expect(long.percent).toBe(0.15);
  });

  it('never drops below the current division floor', () => {
    const result = applyDecay(2100, '2026-01-01', '2026-09-24');
    expect(result.rank_xp_after).toBeGreaterThanOrEqual(2000);
  });

  it('pays a comeback bonus for returning within the window', () => {
    const result = evaluateComeback(10_000, '2026-09-21', '2026-09-24');
    expect(result.eligible).toBe(true);
    expect(result.bonus_xp).toBe(1500);
  });
});

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

describe('habits', () => {
  it('pays triple for resisting a bad habit', () => {
    expect(baseXpFor(5, 'bad_habit')).toBe(baseXpFor(5, 'faith') * 3);
  });

  it('continues a streak across consecutive days', () => {
    const result = updateStreak(5, 10, '2026-09-23', '2026-09-24');
    expect(result.streak).toBe(6);
    expect(result.broken).toBe(false);
  });

  it('breaks a streak after a missed day', () => {
    const result = updateStreak(5, 10, '2026-09-20', '2026-09-24');
    expect(result.streak).toBe(1);
    expect(result.broken).toBe(true);
  });

  it('lets a streak freeze bridge a single missed day', () => {
    const result = updateStreak(5, 10, '2026-09-22', '2026-09-24', true);
    expect(result.streak).toBe(6);
    expect(result.broken).toBe(false);
  });

  it('treats a same-day repeat as a no-op', () => {
    const result = updateStreak(5, 10, '2026-09-24', '2026-09-24');
    expect(result.streak).toBe(5);
  });

  it('buckets dates into ISO weeks', () => {
    expect(isoWeekKey('2026-09-24')).toMatch(/^\d{4}-W\d{2}$/);
    // Monday and the following Sunday share a week.
    expect(isoWeekKey('2026-09-21')).toBe(isoWeekKey('2026-09-27'));
  });

  it('counts consecutive bad-habit resistance days', () => {
    const logs: HabitLog[] = ['2026-09-24', '2026-09-23', '2026-09-22'].map((date, i) => ({
      id: `l${i}`,
      user_id: 'u',
      habit_id: 'h',
      date,
      intensity: 5,
      category: 'bad_habit',
      xp_gained: 0,
      coins_gained: 0,
      damage_dealt: 0,
      was_crit: false,
      combo_at_time: 0,
      created_at: `${date}T08:00:00.000Z`,
    }));

    expect(resistanceStreak(logs, '2026-09-24')).toBe(3);
  });

  it('ships six packs whose habits are all valid', () => {
    expect(HABIT_PACKS).toHaveLength(6);
    HABIT_PACKS.forEach((pack) => {
      expect(pack.habits.length).toBeGreaterThan(0);
      pack.habits.forEach((habit) => {
        expect(habit.name.length).toBeGreaterThan(1);
        expect(habit.name.length).toBeLessThanOrEqual(50); // the DB constraint
        expect(habit.intensity).toBeGreaterThanOrEqual(1);
        expect(habit.intensity).toBeLessThanOrEqual(5);
        // Every habit belongs to the category of the pack that ships it.
        expect(habit.category).toBe(pack.category);
      });
    });
  });

  it('offers a substantial library, with no duplicate names', () => {
    const templates = allTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(120);

    // A name appearing in two packs would let the same habit be added twice
    // and would break the "already owned" check in the habit library, which
    // matches on name.
    const names = templates.map((t) => t.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    expect(duplicates, `duplicate habit names: ${duplicates.join(', ')}`).toHaveLength(0);
  });

  it('dropped the habits that could not be honestly self-scored', () => {
    const names = allTemplates().map((t) => t.name);
    expect(names).not.toContain('Compliment someone');
    expect(names).not.toContain('Talk to someone new');
  });

  it('keeps every resistance habit in the bad_habit category', () => {
    BAD_HABIT_PACK.habits.forEach((habit) => {
      expect(habit.category).toBe('bad_habit');
    });
  });
});

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

describe('shop', () => {
  it('has unique item ids across the whole catalogue', () => {
    const ids = new Set([...ALL_GEAR, ...CONSUMABLES].map((i) => i.id));
    expect(ids.size).toBe(ALL_GEAR.length + CONSUMABLES.length);
  });

  it('never sells an award-only relic', () => {
    const relic = ALL_GEAR.find((g) => g.is_award_only)!;
    const check = checkPurchase(relic.id, 999_999_999, 10, []);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('award_only');
  });

  it('blocks purchases that outrun the wallet or the rank', () => {
    expect(checkPurchase('sw_10', 0, 10, []).reason).toBe('insufficient_funds');
    expect(checkPurchase('sw_10', 999_999, 1, []).reason).toBe('rank_too_low');
  });

  it('sums equipped gear into one bonus block', () => {
    const total = aggregateEquipped({ sword: 'sw_06', shield: 'sh_05' });
    expect(total.attack).toBe(50);
    expect(total.defense).toBe(30);
    expect(total.hp).toBe(100);
    expect(total.crit_chance).toBeCloseTo(0.02);
  });
});

describe('loot', () => {
  const monster = getMonster(10, 3);
  const boss = getMonster(10, 15);

  it('always returns at least one result', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(rollLoot({ monster, baseCoins: 100 }).length).toBeGreaterThan(0);
    }
  });

  it('guarantees gear plus a fragment from a boss', () => {
    const results = rollLoot({ monster: boss, baseCoins: 100, rng: () => 0.5 });
    expect(results.some((r) => r.kind === 'legendary_fragment')).toBe(true);
    expect(results.length).toBe(3);
  });

  it('rolls twice with a luck charm', () => {
    const normal = rollLoot({ monster, baseCoins: 100, rng: () => 0.5 });
    const lucky = rollLoot({ monster, baseCoins: 100, luckCharm: true, rng: () => 0.5 });
    expect(lucky.length).toBe(normal.length * 2);
  });
});

/* ------------------------------------------------------------------ */
/* Iblis                                                               */
/* ------------------------------------------------------------------ */

describe('iblis', () => {
  it('ships exactly 60 taunts and 10 replies', () => {
    expect(TAUNTS).toHaveLength(60);
    expect(REPLIES).toHaveLength(10);
    expect(new Set(TAUNTS.map((t) => t.id)).size).toBe(60);
  });

  it('will not speak during quiet hours', () => {
    const at3am = new Date(2026, 8, 24, 3, 0, 0);
    expect(canFireTaunt([], at3am)).toBe(false);

    const atNoon = new Date(2026, 8, 24, 12, 0, 0);
    expect(canFireTaunt([], atNoon)).toBe(true);
  });

  it('enforces the five-day gap between taunts', () => {
    const history = [
      {
        id: 't1',
        user_id: 'u',
        taunt_id: 1,
        taunt_text: TAUNTS[0].text,
        fired_at: new Date(2026, 8, 22, 12, 0, 0).toISOString(),
        replied_at: null,
        reply_id: null,
        reply_text: null,
      },
    ];

    expect(canFireTaunt(history, new Date(2026, 8, 24, 12, 0, 0))).toBe(false);
    expect(canFireTaunt(history, new Date(2026, 8, 28, 12, 0, 0))).toBe(true);
  });

  it('prefers taunts the player has not heard', () => {
    const heard = TAUNTS.slice(0, 59).map((t, i) => ({
      id: `t${i}`,
      user_id: 'u',
      taunt_id: t.id,
      taunt_text: t.text,
      fired_at: new Date().toISOString(),
      replied_at: null,
      reply_id: null,
      reply_text: null,
    }));

    expect(selectTaunt(heard, () => 0).id).toBe(60);
  });

  it('grants a 24-hour morale buff on reply', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    const buff = buildMoraleBuff(1, now)!;
    expect(buff.percent).toBe(0.1);
    expect(new Date(buff.expires_at).getTime() - now.getTime()).toBe(24 * 3_600_000);
  });
});

/* ------------------------------------------------------------------ */
/* Achievements + seasons                                              */
/* ------------------------------------------------------------------ */

describe('achievements', () => {
  it('has unique ids and positive targets', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    ACHIEVEMENTS.forEach((a) => expect(a.target).toBeGreaterThan(0));
  });

  it('unlocks a streak achievement once the target is met', () => {
    const character = {
      longest_streak: 7,
      total_monsters_killed: 0,
      current_zone: 1,
      rank_tier: 1,
      total_coins_earned: 0,
      coins: 0,
      total_habits_completed: 0,
      streak: 7,
    } as never;

    const { unlocked } = checkNewUnlocks(
      {
        character,
        perfect_weeks: 0,
        perfect_months: 0,
        resistance_streak: 0,
        guild_contribution: 0,
        iblis_replies: 0,
      },
      [],
    );

    expect(unlocked.some((a) => a.id === 'ach_streak_7')).toBe(true);
    expect(unlocked.some((a) => a.id === 'ach_streak_30')).toBe(false);
  });
});

describe('seasons', () => {
  it('builds a 50-tier pass with ascending requirements', () => {
    expect(SEASON_PASS).toHaveLength(50);
    for (let i = 1; i < SEASON_PASS.length; i += 1) {
      expect(SEASON_PASS[i].xp_required).toBeGreaterThan(SEASON_PASS[i - 1].xp_required);
    }
  });

  it('soft-resets downward but never below Muhajir', () => {
    const high = applySoftReset(700_000);
    expect(high.tier_after).toBeLessThan(high.tier_before);

    const low = applySoftReset(100);
    expect(low.tier_after).toBe(1);
    expect(low.rank_xp_after).toBeLessThanOrEqual(100);
  });
});

/* ------------------------------------------------------------------ */
/* Sanity: nothing in the game layer touches the DOM                   */
/* ------------------------------------------------------------------ */

describe('portability', () => {
  it('resolves a full habit strike with no browser globals', () => {
    const habit: Pick<Habit, 'name' | 'category' | 'intensity'> = {
      name: 'Fajr prayer',
      category: 'faith',
      intensity: 5,
    };
    const monster = getMonster(3, 2);

    const strike = resolveStrike({
      snapshot: snapshot(),
      intensity: habit.intensity,
      habitsDoneToday: 2,
      monster,
      monsterHp: monster.max_hp,
      rng: () => 0.9,
    });

    expect(strike.damage).toBeGreaterThan(0);
    expect(strike.monster_hp_after).toBeLessThan(monster.max_hp);
  });
});
