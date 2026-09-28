/**
 * Renaming is meant to be global: the leaderboards, the guild roster and
 * guild chat all read the name from `characters` rather than holding
 * copies, so changing that one row changes every screen.
 *
 * What these guard is the boundary. The database checks the length itself,
 * so anything the client lets through comes back as an opaque constraint
 * violation after the local state has already changed - leaving the app
 * showing a name the database rejected.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '..';

const USER = '11111111-1111-4111-8111-111111111111';

function seed() {
  const store = useGameStore.getState();
  store.resetAll();
  store.setUser({
    id: USER,
    email: 'warrior@example.com',
    created_at: new Date().toISOString(),
    is_admin: false,
    onboarded: true,
  });
  store.createCharacter(USER, {
    name: 'Tester',
    avatar_id: 'av_ash',
    archetype: 'warrior',
    habits: [{ name: 'Fajr prayer', category: 'faith', intensity: 5 }],
  });
}

beforeEach(seed);

describe('renaming a character', () => {
  it('changes the name held in state', async () => {
    await useGameStore.getState().renameCharacter('Salahuddin');
    expect(useGameStore.getState().character?.name).toBe('Salahuddin');
  });

  it('trims and collapses whitespace rather than storing it', async () => {
    await useGameStore.getState().renameCharacter('  Al   Faris  ');
    expect(useGameStore.getState().character?.name).toBe('Al Faris');
  });

  it('refuses anything the database would reject', async () => {
    const rename = useGameStore.getState().renameCharacter;

    await expect(rename('x')).rejects.toThrow(/at least 2/i);
    await expect(rename('   ')).rejects.toThrow(/at least 2/i);
    await expect(rename('a'.repeat(21))).rejects.toThrow(/at most 20/i);

    // The rejected value must not have been written locally either.
    expect(useGameStore.getState().character?.name).toBe('Tester');
  });

  it('accepts exactly the lengths the schema allows', async () => {
    const rename = useGameStore.getState().renameCharacter;

    await rename('ab');
    expect(useGameStore.getState().character?.name).toBe('ab');

    await rename('a'.repeat(20));
    expect(useGameStore.getState().character?.name).toHaveLength(20);
  });

  it('treats renaming to the current name as a no-op', async () => {
    const before = useGameStore.getState().character?.updated_at;
    const result = await useGameStore.getState().renameCharacter('Tester');

    expect(result).toBe(true);
    expect(useGameStore.getState().character?.updated_at).toBe(before);
  });

  it('reports false when there is no database to reach', async () => {
    // Local mode cannot make a rename global, and must not claim it did.
    const result = await useGameStore.getState().renameCharacter('Offline Name');
    expect(result).toBe(false);
    expect(useGameStore.getState().character?.name).toBe('Offline Name');
  });
});
