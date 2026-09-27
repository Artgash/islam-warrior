/**
 * complete-habit — the authoritative move.
 *
 * The client resolves a strike locally for instant feedback; this function
 * decides what is actually written. It validates ownership, enforces
 * one-completion-per-habit-per-day, rolls the crit server-side, applies XP,
 * coins, damage, level-ups, rank changes, the kill and the loot.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireUser, serviceClient, todayFor } from '../_shared/client.ts';
import {
  advanceRoad,
  applyXp,
  counterDamage,
  divisionForXp,
  gearFrom,
  rankMultiplier,
  resolveStrike,
  rollLootKind,
  tierForXp,
  type CharacterRow,
  type GearTotals,
  type Intensity,
} from '../_shared/engine.ts';

interface Payload {
  habit_id: string;
  /** IANA timezone, so "today" means the player's today. */
  timezone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const user = await requireUser(req);
    const payload = (await req.json()) as Payload;

    if (!payload?.habit_id) return fail('habit_id is required.');

    const db = serviceClient();
    const today = todayFor(payload.timezone);

    /* --- Load state ------------------------------------------------ */

    const [habitRes, charRes, equippedRes, logsRes] = await Promise.all([
      db.from('habits').select('*').eq('id', payload.habit_id).eq('user_id', user.id).single(),
      db.from('characters').select('*').eq('user_id', user.id).single(),
      db.from('equipped_items').select('*').eq('user_id', user.id).maybeSingle(),
      db.from('habit_logs').select('id, habit_id').eq('user_id', user.id).eq('date', today),
    ]);

    if (habitRes.error || !habitRes.data) return fail('That habit does not belong to you.', 403);
    if (charRes.error || !charRes.data) return fail('No character found.', 404);

    const habit = habitRes.data;
    const character = charRes.data as CharacterRow & {
      level: number; xp: number; coins: number; total_coins_earned: number;
      total_xp_earned: number; total_monsters_killed: number; total_bosses_killed: number;
      streak: number; longest_streak: number; last_habit_date: string | null;
      fallen_at: string | null;
    };
    const logsToday = logsRes.data ?? [];

    if (!habit.is_active) return fail('That habit is paused.', 409);
    if (character.fallen_at) return fail('You have fallen. Rest until tomorrow.', 409);

    // The unique (habit_id, date) index is the real guard; this is the
    // friendly error that fires before we hit it.
    if (logsToday.some((l) => l.habit_id === habit.id)) {
      return fail('Already completed today.', 409);
    }

    /* --- Gear ------------------------------------------------------- */

    const { data: gearRows } = await db.from('gear_items').select('id, stats');
    const catalogue = new Map<string, GearTotals>();
    (gearRows ?? []).forEach((row: { id: string; stats: Record<string, number> }) => {
      catalogue.set(row.id, {
        attack: row.stats.attack ?? 0,
        defense: row.stats.defense ?? 0,
        hp: row.stats.hp ?? 0,
        crit_chance: row.stats.crit_chance ?? 0,
        crit_multiplier: row.stats.crit_multiplier ?? 0,
        dodge: row.stats.dodge ?? 0,
        xp_bonus: row.stats.xp_bonus ?? 0,
        coin_bonus: row.stats.coin_bonus ?? 0,
        all_stats: row.stats.all_stats ?? 0,
      });
    });
    const gear = gearFrom(equippedRes.data, catalogue);

    /* --- The monster ------------------------------------------------ */

    const { data: monster } = await db
      .from('monsters')
      .select('*')
      .eq('zone_id', character.current_zone)
      .eq('index', character.current_monster_index)
      .single();

    if (!monster) return fail('The current encounter could not be loaded.', 500);

    /* --- Resolve ---------------------------------------------------- */

    const strike = resolveStrike(
      character,
      gear,
      habit.intensity as Intensity,
      habit.category,
      logsToday.length,
      Number(monster.defense),
    );

    const monsterHpBefore = Number(character.current_monster_hp);
    const monsterHpAfter = Math.max(0, monsterHpBefore - strike.damage);
    const killed = monsterHpAfter <= 0;

    let xpTotal = strike.xp;
    let coinsTotal = strike.coins;
    let playerHp = character.hp;
    let fallen = false;
    const loot: { kind: string; coins: number; item_id?: string }[] = [];

    let nextZone = character.current_zone;
    let nextIndex = character.current_monster_index;
    let nextMonsterHp = monsterHpAfter;
    let zoneCleared = false;
    let roadComplete = false;

    if (killed) {
      const killXp = Math.max(
        1,
        Math.round(Number(monster.xp_reward) * rankMultiplier(character.rank_tier)),
      );
      const killCoins = Math.max(1, Math.round(Number(monster.coin_reward)));

      xpTotal += killXp;
      coinsTotal += killCoins;

      /* Loot */
      if (monster.is_boss) {
        loot.push({ kind: 'legendary_fragment', coins: 0 });
        loot.push({ kind: 'coins', coins: killCoins * 3 });
        coinsTotal += killCoins * 3;
      } else {
        const kind = rollLootKind();
        if (kind === 'coins') {
          const bonus = Math.max(1, Math.round(killCoins * (0.4 + Math.random() * 0.6)));
          loot.push({ kind, coins: bonus });
          coinsTotal += bonus;
        } else if (kind === 'legendary_fragment') {
          loot.push({ kind, coins: 0 });
        } else {
          loot.push({ kind, coins: 0 });
        }
      }

      if (loot.some((l) => l.kind === 'legendary_fragment')) {
        await db.rpc('increment_fragments', { p_user_id: user.id, p_count: 1 }).then(
          () => undefined,
          async () => {
            // No RPC installed: fall back to a read-modify-write.
            const { data } = await db
              .from('legendary_fragments')
              .select('count')
              .eq('user_id', user.id)
              .maybeSingle();
            await db
              .from('legendary_fragments')
              .upsert({ user_id: user.id, count: (data?.count ?? 0) + 1 });
          },
        );
      }

      const advance = advanceRoad(character.current_zone, character.current_monster_index);
      nextZone = advance.zone;
      nextIndex = advance.index;
      zoneCleared = advance.zone_cleared;
      roadComplete = advance.road_complete;

      const { data: next } = await db
        .from('monsters')
        .select('max_hp')
        .eq('zone_id', nextZone)
        .eq('index', nextIndex)
        .single();

      nextMonsterHp = roadComplete ? 0 : Number(next?.max_hp ?? 50);
    } else {
      const counter = counterDamage(character, gear, Number(monster.attack));
      playerHp = Math.max(0, character.hp - counter.damage);
      fallen = playerHp <= 0;
    }

    /* --- Levels and rank -------------------------------------------- */

    const levelling = applyXp(character.level, character.xp, xpTotal);
    const rankXp = character.rank_xp + xpTotal;
    const newTier = tierForXp(rankXp);
    const newDivision = divisionForXp(rankXp);

    const maxHp = character.max_hp + levelling.hp_gained;
    const finalHp = levelling.levels_gained > 0 ? maxHp : Math.min(playerHp, maxHp);

    /* --- Streak ------------------------------------------------------ */

    let streak = character.streak;
    if (character.last_habit_date !== today) {
      const gapDays = character.last_habit_date
        ? Math.round(
            (Date.parse(`${today}T00:00:00Z`) -
              Date.parse(`${character.last_habit_date}T00:00:00Z`)) /
              86_400_000,
          )
        : 0;
      streak = gapDays === 1 ? character.streak + 1 : 1;
    }

    const totalCoins = coinsTotal + levelling.coins_gained;

    /* --- Write ------------------------------------------------------- */

    // The log insert fires the stats trigger and is protected by the unique
    // (habit_id, date) index, so a race can never double-award.
    const { error: logError } = await db.from('habit_logs').insert({
      user_id: user.id,
      habit_id: habit.id,
      date: today,
      intensity: habit.intensity,
      category: habit.category,
      xp_gained: xpTotal,
      coins_gained: totalCoins,
      damage_dealt: strike.damage,
      was_crit: strike.was_crit,
      combo_at_time: logsToday.length,
    });

    if (logError) {
      return fail(
        logError.code === '23505' ? 'Already completed today.' : logError.message,
        logError.code === '23505' ? 409 : 500,
      );
    }

    await db
      .from('characters')
      .update({
        level: levelling.level,
        xp: levelling.xp,
        hp: finalHp,
        max_hp: maxHp,
        base_attack: character.base_attack + levelling.attack_gained,
        base_defense: character.base_defense + levelling.defense_gained,
        coins: character.coins + totalCoins,
        total_coins_earned: character.total_coins_earned + totalCoins,
        total_xp_earned: character.total_xp_earned + xpTotal,
        rank_xp: rankXp,
        rank_tier: newTier,
        rank_division: newDivision,
        current_zone: nextZone,
        current_monster_index: nextIndex,
        current_monster_hp: nextMonsterHp,
        total_monsters_killed: character.total_monsters_killed + (killed ? 1 : 0),
        total_bosses_killed: character.total_bosses_killed + (killed && monster.is_boss ? 1 : 0),
        streak,
        longest_streak: Math.max(character.longest_streak, streak),
        fallen_at: fallen ? new Date().toISOString() : null,
      })
      .eq('user_id', user.id);

    await db.from('coins_transactions').insert({
      user_id: user.id,
      amount: totalCoins,
      reason: killed ? 'kill' : 'habit',
      note: `Completed ${habit.name}`,
      balance_after: character.coins + totalCoins,
    });

    return json({
      accepted: true,
      xp: xpTotal,
      coins: totalCoins,
      damage: strike.damage,
      was_crit: strike.was_crit,
      monster_hp_after: nextMonsterHp,
      monster_killed: killed,
      levels_gained: levelling.levels_gained,
      level: levelling.level,
      rank_tier: newTier,
      rank_division: newDivision,
      zone_cleared: zoneCleared,
      road_complete: roadComplete,
      player_fallen: fallen,
      loot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('authenticated') ? 401 : 500);
  }
});
