/**
 * Tests for the v1 -> v2 save repair.
 *
 * Anyone who played before ids became UUIDs has a save that Postgres will
 * reject. This migration fixes it in place. The delicate part is references:
 * habit logs point at habit ids, so a naive regeneration would orphan every
 * completion and wipe the player's streak history without telling them.
 */

import { describe, expect, it } from 'vitest';
import { migratePersisted, migrateToUuids, PERSIST_VERSION } from '../migrations';
import { isUuid } from '@/lib/utils';

/** A save in the old, broken format. */
function brokenSave() {
  return {
    user: {
      id: 'user_abc123',
      email: 'warrior@example.com',
      created_at: '2026-09-01T00:00:00.000Z',
      is_admin: false,
      onboarded: true,
    },
    character: {
      id: 'char_9f8e7d',
      user_id: 'user_abc123',
      name: 'Tester',
      total_xp_earned: 4200,
      streak: 12,
    },
    habits: [
      { id: 'habit_one', user_id: 'user_abc123', name: 'Fajr prayer', streak: 12 },
      { id: 'habit_two', user_id: 'user_abc123', name: 'Workout', streak: 3 },
    ],
    logs: [
      { id: 'log_1', user_id: 'user_abc123', habit_id: 'habit_one', date: '2026-09-25', xp_gained: 70 },
      { id: 'log_2', user_id: 'user_abc123', habit_id: 'habit_one', date: '2026-09-26', xp_gained: 70 },
      { id: 'log_3', user_id: 'user_abc123', habit_id: 'habit_two', date: '2026-09-26', xp_gained: 40 },
    ],
    taunts: [{ id: 'taunt_1', user_id: 'user_abc123', taunt_id: 4, replied_at: null }],
    coinLog: [{ id: 'tx_1', user_id: 'user_abc123', amount: 35 }],
    notifications: [{ id: 'ntf_1', user_id: 'user_abc123', title: 'Level 2' }],
    activeEffects: [{ id: 'fx_1', effect: 'xp_boost', magnitude: 2 }],
  };
}

describe('save repair (v1 -> v2)', () => {
  it('replaces every invalid id with a UUID', () => {
    const out = migrateToUuids(brokenSave()) as Record<string, any>;

    expect(isUuid(out.character.id)).toBe(true);
    expect(isUuid(out.user.id)).toBe(true);
    out.habits.forEach((h: any) => expect(isUuid(h.id)).toBe(true));
    out.logs.forEach((l: any) => expect(isUuid(l.id)).toBe(true));
    expect(isUuid(out.taunts[0].id)).toBe(true);
    expect(isUuid(out.coinLog[0].id)).toBe(true);
    expect(isUuid(out.notifications[0].id)).toBe(true);
    expect(isUuid(out.activeEffects[0].id)).toBe(true);
  });

  it('keeps every log attached to the right habit', () => {
    const out = migrateToUuids(brokenSave()) as Record<string, any>;

    const fajr = out.habits.find((h: any) => h.name === 'Fajr prayer');
    const workout = out.habits.find((h: any) => h.name === 'Workout');

    // Two logs belonged to Fajr, one to Workout. That must still hold.
    const fajrLogs = out.logs.filter((l: any) => l.habit_id === fajr.id);
    const workoutLogs = out.logs.filter((l: any) => l.habit_id === workout.id);

    expect(fajrLogs).toHaveLength(2);
    expect(workoutLogs).toHaveLength(1);

    // And nothing may be left pointing at an id that no longer exists.
    const validIds = new Set(out.habits.map((h: any) => h.id));
    out.logs.forEach((l: any) => expect(validIds.has(l.habit_id)).toBe(true));
  });

  it('gives every row the same owner id', () => {
    const out = migrateToUuids(brokenSave()) as Record<string, any>;
    const owner = out.character.user_id;

    expect(isUuid(owner)).toBe(true);
    expect(out.user.id).toBe(owner);
    out.habits.forEach((h: any) => expect(h.user_id).toBe(owner));
    out.logs.forEach((l: any) => expect(l.user_id).toBe(owner));
  });

  it('preserves the actual progress, not just the ids', () => {
    const out = migrateToUuids(brokenSave()) as Record<string, any>;

    expect(out.character.name).toBe('Tester');
    expect(out.character.total_xp_earned).toBe(4200);
    expect(out.character.streak).toBe(12);
    expect(out.habits).toHaveLength(2);
    expect(out.logs).toHaveLength(3);
    expect(out.logs.reduce((s: number, l: any) => s + l.xp_gained, 0)).toBe(180);
  });

  it('leaves an already-valid save untouched', () => {
    const good = {
      character: {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: '22222222-2222-4222-8222-222222222222',
        name: 'Fine',
      },
      user: { id: '22222222-2222-4222-8222-222222222222' },
      habits: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          user_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
      logs: [],
    };

    const out = migrateToUuids(good) as Record<string, any>;

    expect(out.character.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(out.habits[0].id).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('survives a save with missing or empty collections', () => {
    expect(() => migrateToUuids({})).not.toThrow();
    expect(() => migrateToUuids({ character: null, habits: [], logs: [] })).not.toThrow();
    expect(migratePersisted(null, 1)).toBeNull();
    expect(migratePersisted('not an object', 1)).toBe('not an object');
  });

  it('only rewrites saves older than the current version', () => {
    const current = migratePersisted(brokenSave(), PERSIST_VERSION) as Record<string, any>;
    // Already at the current version: left alone, broken ids and all.
    expect(current.character.id).toBe('char_9f8e7d');

    const old = migratePersisted(brokenSave(), 1) as Record<string, any>;
    expect(isUuid(old.character.id)).toBe(true);
  });
});
