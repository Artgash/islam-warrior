/**
 * Orchestration above the raw damage math: building combatant snapshots,
 * formatting combat-log lines, and advancing along the road after a kill.
 */

import type {
  ActiveEffect,
  AttackResult,
  Character,
  CombatEvent,
  CombatEventType,
  CombatantSnapshot,
  CounterAttackResult,
  GearAggregate,
  Monster,
} from '@/types';
import { BOSS_INDEX, MONSTERS_PER_ZONE, TOTAL_ZONES } from '@/game/constants';
import { EMPTY_GEAR } from './formulas';

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

/** Is a morale buff currently live? */
export function moraleMultiplier(character: Character, now: Date = new Date()): number {
  if (!character.morale_buff_expires) return 1;
  const expires = new Date(character.morale_buff_expires).getTime();
  if (Number.isNaN(expires) || expires <= now.getTime()) return 1;
  return 1 + character.morale_buff_percent;
}

/** Freeze the character into the shape the pure damage layer expects. */
export function snapshotOf(
  character: Character,
  gear: GearAggregate = EMPTY_GEAR,
  now: Date = new Date(),
): CombatantSnapshot {
  return {
    base_attack: character.base_attack,
    base_defense: character.base_defense,
    crit_chance: character.crit_chance,
    crit_multiplier: character.crit_multiplier,
    stats: character.stats,
    rank_tier: character.rank_tier,
    morale_multiplier: moraleMultiplier(character, now),
    gear,
  };
}

/** Does the player currently hold an unspent Combo Charm charge? */
export function hasComboCharm(effects: ActiveEffect[]): boolean {
  return effects.some((e) => e.effect === 'combo_charm' && (e.charges ?? 0) > 0);
}

/** Active XP-boost multiplier, or 1 when none is running. */
export function xpBoostMultiplier(effects: ActiveEffect[], now: Date = new Date()): number {
  const live = effects.filter((e) => {
    if (e.effect !== 'xp_boost') return false;
    if (!e.expires_at) return true;
    return new Date(e.expires_at).getTime() > now.getTime();
  });
  return live.reduce((max, e) => Math.max(max, e.magnitude), 1);
}

/** Does a Loot Luck Charm apply to the next kill? */
export function hasLootLuck(effects: ActiveEffect[]): boolean {
  return effects.some((e) => e.effect === 'loot_luck' && (e.charges ?? 0) > 0);
}

/* ------------------------------------------------------------------ */
/* Combat log                                                          */
/* ------------------------------------------------------------------ */

let eventSeq = 0;

export function makeEvent(
  type: CombatEventType,
  message: string,
  amount?: number,
  at: Date = new Date(),
): CombatEvent {
  eventSeq += 1;
  return {
    id: `ev_${at.getTime()}_${eventSeq}`,
    type,
    message,
    amount,
    at: at.toISOString(),
  };
}

/** Only the parts of a strike the log cares about. */
export type StrikeSummary = Pick<AttackResult, 'damage' | 'was_crit'>;

export function strikeEvent(
  habitName: string,
  monster: Monster,
  result: StrikeSummary,
): CombatEvent {
  const message = result.was_crit
    ? `${habitName} — CRITICAL STRIKE on ${monster.name} for ${result.damage.toLocaleString()}.`
    : `${habitName} strikes ${monster.name} for ${result.damage.toLocaleString()}.`;
  return makeEvent(result.was_crit ? 'player_crit' : 'player_hit', message, result.damage);
}

export function counterEvent(monster: Monster, result: CounterAttackResult): CombatEvent {
  if (result.dodged) {
    return makeEvent('player_dodge', `You turn aside the blow of ${monster.name}.`, 0);
  }
  return makeEvent(
    'monster_hit',
    `${monster.name} answers for ${result.damage.toLocaleString()}.`,
    result.damage,
  );
}

export function deathEvent(monster: Monster): CombatEvent {
  return makeEvent(
    'monster_death',
    monster.is_boss
      ? `${monster.name} falls. The way onward is open.`
      : `${monster.name} dissolves into ash.`,
  );
}

export function fallenEvent(): CombatEvent {
  return makeEvent(
    'player_fallen',
    'You have fallen. Rest, recover, return tomorrow.',
  );
}

/* ------------------------------------------------------------------ */
/* Road advancement                                                    */
/* ------------------------------------------------------------------ */

export interface RoadPosition {
  zone: number;
  index: number;
}

export interface AdvanceResult {
  position: RoadPosition;
  zone_cleared: boolean;
  road_complete: boolean;
}

/**
 * Step to the next monster. Clearing index 15 (the boss) opens the next zone.
 * Beating zone 66's boss completes the road and the player holds position
 * at the Throne until they choose to Ascend.
 */
export function advanceRoad(zone: number, index: number): AdvanceResult {
  if (index < BOSS_INDEX) {
    return {
      position: { zone, index: index + 1 },
      zone_cleared: false,
      road_complete: false,
    };
  }

  if (zone >= TOTAL_ZONES) {
    return {
      position: { zone, index },
      zone_cleared: true,
      road_complete: true,
    };
  }

  return {
    position: { zone: zone + 1, index: 0 },
    zone_cleared: true,
    road_complete: false,
  };
}

/** 0-1 progress through the entire 66-zone road. */
export function roadProgress(zone: number, index: number): number {
  const cleared = (zone - 1) * MONSTERS_PER_ZONE + index;
  return cleared / (TOTAL_ZONES * MONSTERS_PER_ZONE);
}

/** 0-1 progress through the current zone. */
export function zoneProgress(index: number): number {
  return index / MONSTERS_PER_ZONE;
}
