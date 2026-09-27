/**
 * Persisted-state migrations.
 *
 * WHY v2 EXISTS
 * Rows were originally created with prefixed ids ("char_9f8e...",
 * "habit_...", "log_..."). Every id column in Postgres is `uuid`, so those
 * values are rejected outright. New rows are fine now, but anyone who played
 * before the fix has a save full of unusable ids - and their first cloud sync
 * would fail for exactly the same reason.
 *
 * This repairs a save in place. It is careful about REFERENCES: habit logs
 * point at habit ids, so regenerating a habit id without remapping its logs
 * would orphan every completion and silently wipe streak history.
 */

import { isUuid, uuid } from '@/lib/utils';

export const PERSIST_VERSION = 2;

export interface MigrationReport {
  repaired: boolean;
  character: boolean;
  habits: number;
  logs: number;
  taunts: number;
  transactions: number;
  notifications: number;
  effects: number;
  userId: boolean;
}

let lastReport: MigrationReport | null = null;

export function getMigrationReport(): MigrationReport | null {
  return lastReport;
}

/**
 * A migration reads raw JSON written by a previous version of the app, so it
 * cannot be typed as the current store - the whole point is that the shape
 * may be out of date. It is handled as an untyped record and handed back to
 * Zustand, which casts it.
 */
type Persisted = Record<string, unknown>;

/** Keep a valid id, replace an invalid one. */
function ensureUuid(value: unknown): { id: string; changed: boolean } {
  if (typeof value === 'string' && isUuid(value)) {
    return { id: value, changed: false };
  }
  return { id: uuid(), changed: true };
}

/**
 * Repair every id in a persisted save so it is a valid UUID, remapping the
 * references that depend on them.
 */
export function migrateToUuids(state: Persisted): Persisted {
  const report: MigrationReport = {
    repaired: false,
    character: false,
    habits: 0,
    logs: 0,
    taunts: 0,
    transactions: 0,
    notifications: 0,
    effects: 0,
    userId: false,
  };

  const next: Persisted = { ...state };

  /* --- user_id ---------------------------------------------------- */
  // One id, applied consistently everywhere, or the rows stop matching.
  let userId: string | null = null;

  const existingUser = next.user as { id?: string } | null | undefined;
  if (existingUser?.id) {
    const resolved = ensureUuid(existingUser.id);
    userId = resolved.id;
    if (resolved.changed) {
      next.user = { ...existingUser, id: userId };
      report.userId = true;
      report.repaired = true;
    }
  }

  /* --- character -------------------------------------------------- */
  const character = next.character as Record<string, unknown> | null | undefined;
  if (character) {
    const patched = { ...character };

    const id = ensureUuid(patched.id);
    if (id.changed) {
      patched.id = id.id;
      report.character = true;
      report.repaired = true;
    }

    if (userId && patched.user_id !== userId) {
      patched.user_id = userId;
      report.repaired = true;
    } else if (!userId) {
      const owner = ensureUuid(patched.user_id);
      if (owner.changed) {
        patched.user_id = owner.id;
        userId = owner.id;
        report.repaired = true;
      } else {
        userId = owner.id;
      }
    }

    next.character = patched;
  }

  /* --- habits, building an old -> new map -------------------------- */
  const habitIdMap = new Map<string, string>();

  const habits = next.habits as Record<string, unknown>[] | undefined;
  if (Array.isArray(habits)) {
    next.habits = habits.map((habit) => {
      const patched = { ...habit };
      const oldId = typeof habit.id === 'string' ? habit.id : '';

      const id = ensureUuid(oldId);
      if (id.changed) {
        patched.id = id.id;
        if (oldId) habitIdMap.set(oldId, id.id);
        report.habits += 1;
        report.repaired = true;
      }

      if (userId) patched.user_id = userId;
      return patched;
    });
  }

  /* --- logs: remap habit_id through the map ----------------------- */
  const logs = next.logs as Record<string, unknown>[] | undefined;
  if (Array.isArray(logs)) {
    next.logs = logs.map((log) => {
      const patched = { ...log };

      const id = ensureUuid(log.id);
      if (id.changed) {
        patched.id = id.id;
        report.logs += 1;
        report.repaired = true;
      }

      // Follow the habit to its new id, so completion history survives.
      const habitId = typeof log.habit_id === 'string' ? log.habit_id : '';
      const remapped = habitIdMap.get(habitId);
      if (remapped) patched.habit_id = remapped;

      if (userId) patched.user_id = userId;
      return patched;
    });
  }

  /* --- everything else that becomes a row -------------------------- */
  const simpleCollections: {
    key: keyof MigrationReport;
    field: 'taunts' | 'coinLog' | 'notifications' | 'activeEffects';
  }[] = [
    { key: 'taunts', field: 'taunts' },
    { key: 'transactions', field: 'coinLog' },
    { key: 'notifications', field: 'notifications' },
    { key: 'effects', field: 'activeEffects' },
  ];

  simpleCollections.forEach(({ key, field }) => {
    const rows = next[field] as Record<string, unknown>[] | undefined;
    if (!Array.isArray(rows)) return;

    next[field] = rows.map((row) => {
      const patched = { ...row };
      const id = ensureUuid(row.id);
      if (id.changed) {
        patched.id = id.id;
        (report[key] as number) += 1;
        report.repaired = true;
      }
      if (userId && 'user_id' in patched) patched.user_id = userId;
      return patched;
    });
  });

  lastReport = report;

  if (report.repaired && import.meta.env.DEV) {
    console.info(
      '[migrate] repaired non-UUID ids so cloud sync can work:',
      JSON.stringify(report),
    );
  }

  return next;
}

/** Zustand `migrate` hook. Runs for any save older than PERSIST_VERSION. */
export function migratePersisted(persisted: unknown, version: number): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted;

  let state = persisted as Persisted;

  if (version < 2) {
    state = migrateToUuids(state);
  }

  return state;
}
