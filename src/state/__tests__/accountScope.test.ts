/**
 * Regression tests for account scoping.
 *
 * The persisted save outlives the session, and nothing used to tie the two
 * together. That produced two bugs a player hit on their first real day:
 *
 *  - opening the app signed them into a leftover local account they had
 *    never signed into, because the persisted user was trusted as a session;
 *  - signing in with correct credentials sent them back through onboarding,
 *    because a save belonging to a different account was still sitting in
 *    the store.
 *
 * Both come down to the same rule: a save belongs to exactly one account.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '..';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

function user(id: string) {
  return {
    id,
    email: `${id.slice(0, 4)}@example.com`,
    created_at: new Date().toISOString(),
    is_admin: false,
    onboarded: true,
  };
}

function seedFor(id: string) {
  const store = useGameStore.getState();
  store.resetAll();
  store.setUser(user(id));
  store.createCharacter(id, {
    name: 'Tester',
    avatar_id: 'av_ash',
    archetype: 'warrior',
    habits: [{ name: 'Fajr prayer', category: 'faith', intensity: 5 }],
  });
}

beforeEach(() => {
  useGameStore.getState().resetAll();
});

describe('account scoping', () => {
  it("drops a save that belongs to somebody else", () => {
    seedFor(ALICE);
    expect(useGameStore.getState().character?.user_id).toBe(ALICE);

    useGameStore.getState().setUser(user(BOB));

    const state = useGameStore.getState();
    expect(state.user?.id).toBe(BOB);
    // Bob must not inherit Alice's progress, and must be sent to onboarding.
    expect(state.character).toBeNull();
    expect(state.habits).toHaveLength(0);
  });

  it('keeps the save when the same account signs in again', () => {
    seedFor(ALICE);
    const habitCount = useGameStore.getState().habits.length;

    useGameStore.getState().setUser(user(ALICE));

    const state = useGameStore.getState();
    expect(state.character?.user_id).toBe(ALICE);
    expect(state.habits).toHaveLength(habitCount);
  });

  it('takes the save with it on sign-out', () => {
    seedFor(ALICE);
    useGameStore.getState().signOutLocal();

    const state = useGameStore.getState();
    expect(state.user).toBeNull();
    expect(state.character).toBeNull();
    expect(state.habits).toHaveLength(0);
    expect(state.notifications).toHaveLength(0);
  });

  it('leaves device preferences alone when clearing an account', () => {
    seedFor(ALICE);
    useGameStore.getState().updateSettings({ reduce_motion: true, language: 'ar' });

    useGameStore.getState().signOutLocal();

    const settings = useGameStore.getState().settings;
    // Sound, language and motion belong to the device, not the save.
    expect(settings.reduce_motion).toBe(true);
    expect(settings.language).toBe('ar');
  });

  it('hands out a fresh empty save each time, never a shared one', () => {
    seedFor(ALICE);
    useGameStore.getState().clearAccountData();
    const first = useGameStore.getState().habits;

    seedFor(BOB);
    useGameStore.getState().clearAccountData();
    const second = useGameStore.getState().habits;

    expect(first).not.toBe(second);
  });
});
