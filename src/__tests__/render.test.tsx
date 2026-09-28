/**
 * Render smoke tests.
 *
 * These exist because of a real crash: several Zustand selectors built a new
 * object or array on every call, so `useSyncExternalStore` never saw a stable
 * snapshot and React threw "Maximum update depth exceeded" on mount. Unit
 * tests over pure functions could not catch it - only actually mounting the
 * components could.
 *
 * Every test here fails loudly if React logs an error, so a re-introduced
 * render loop breaks the build rather than reaching a browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

import { useGameStore } from '@/state';
import { TopBar, BottomNav } from '@/components/common/Layout';
import BattlePage from '@/pages/Battle';
import LandingPage from '@/pages/Landing';
import RankPage from '@/pages/Rank';
import MorePage from '@/pages/More';
import CharacterPage from '@/pages/Character';
import HabitsPage from '@/pages/Habits';
import ShopPage from '@/pages/Shop';
import IblisPage from '@/pages/Iblis';
import LeaderboardsPage from '@/pages/Leaderboards';
import AuthCallbackPage from '@/pages/AuthCallback';
import ResetPasswordPage from '@/pages/ResetPassword';

const USER_ID = 'render-test-user';

/** Captured console.error output, so a React warning fails the test. */
let errors: string[] = [];

function wrap(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function seedCharacter() {
  const store = useGameStore.getState();
  store.resetAll();
  store.setHydrated(true);
  store.setUser({
    id: USER_ID,
    email: 'warrior@example.com',
    created_at: new Date().toISOString(),
    is_admin: false,
    onboarded: true,
  });
  store.createCharacter(USER_ID, {
    name: 'Renderer',
    avatar_id: 'av_ash',
    archetype: 'warrior',
    habits: [
      { name: 'Fajr prayer', category: 'faith', intensity: 5 },
      { name: 'Workout', category: 'strength', intensity: 4 },
      { name: 'No doomscrolling', category: 'bad_habit', intensity: 3 },
    ],
  });
}

beforeEach(() => {
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  seedCharacter();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Advisories that are not application faults: React Router's v7 opt-in
 * notices. Everything else counts as a failure.
 */
const IGNORED = [/React Router Future Flag Warning/i];

/** Fails on the crash we are guarding against, and on any real React error. */
function expectCleanRender() {
  const loop = errors.find((e) => e.includes('Maximum update depth'));
  expect(loop, `React render loop detected:\n${loop}`).toBeUndefined();

  const snapshot = errors.find((e) => e.includes('getSnapshot'));
  expect(snapshot, `Unstable store snapshot:\n${snapshot}`).toBeUndefined();

  const real = errors.filter((e) => !IGNORED.some((pattern) => pattern.test(e)));
  expect(real, `React logged errors:\n${real.join('\n---\n')}`).toHaveLength(0);
}

describe('render smoke tests', () => {
  it('mounts the battle screen without looping', () => {
    wrap(<BattlePage />);
    // The zone name appears in both the header and the monster's description.
    expect(screen.getAllByText(/The Slums of Nafs/i).length).toBeGreaterThan(0);
    // Likewise the monster's name: HP bar label, detail heading, description.
    expect(screen.getAllByText(/Yawning Imp/i).length).toBeGreaterThan(0);
    expectCleanRender();
  });

  it('mounts the top bar and bottom nav', () => {
    wrap(
      <>
        <TopBar />
        <BottomNav />
      </>,
    );
    expect(screen.getByText('Renderer')).toBeDefined();
    expectCleanRender();
  });

  it('mounts the landing screen with no character', () => {
    useGameStore.getState().resetAll();
    useGameStore.getState().setHydrated(true);
    wrap(<LandingPage />);
    expect(screen.getByText('ISLAM WARRIOR')).toBeDefined();
    expectCleanRender();
  });

  it('mounts the auth callback screen', () => {
    useGameStore.getState().resetAll();
    useGameStore.getState().setHydrated(true);
    wrap(<AuthCallbackPage />);
    // In local mode there is no session to wait for, so it should still
    // render its waiting state rather than throwing on a null client.
    expect(screen.getByText('Confirming your account')).toBeDefined();
    expectCleanRender();
  });

  it('mounts the password reset screen', () => {
    useGameStore.getState().resetAll();
    useGameStore.getState().setHydrated(true);
    wrap(<ResetPasswordPage />);
    expect(screen.getByText('Choose a new password')).toBeDefined();
    expectCleanRender();
  });

  it('mounts the rank ladder', () => {
    wrap(<RankPage />);
    expect(screen.getAllByText(/Muhajir/i).length).toBeGreaterThan(0);
    expectCleanRender();
  });

  it('mounts the more hub', () => {
    wrap(<MorePage />);
    expectCleanRender();
  });

  it('mounts the character sheet', () => {
    wrap(<CharacterPage />);
    expectCleanRender();
  });

  it('mounts the habits screen', () => {
    wrap(<HabitsPage />);
    expectCleanRender();
  });

  /* ---------------------------------------------------------------- */
  /* Reported gaps - these three were missing from the UI              */
  /* ---------------------------------------------------------------- */

  it('shows a delete control for every habit on the Today tab', () => {
    wrap(<HabitsPage />);

    // Three habits are seeded, all scheduled daily, so all three appear.
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete / });
    expect(deleteButtons.length).toBe(3);
    expect(screen.getByRole('button', { name: /Delete Fajr prayer/i })).toBeDefined();

    expectCleanRender();
  });

  it('offers an edit control alongside each delete control', () => {
    wrap(<HabitsPage />);
    expect(screen.getAllByRole('button', { name: /^Edit / }).length).toBe(3);
    expectCleanRender();
  });

  it('never blocks adding a habit, however many exist', () => {
    // Twenty habits at rank 1 - previously capped at three.
    for (let i = 0; i < 20; i += 1) {
      useGameStore.getState().addHabit({
        name: `Extra habit ${i}`,
        category: 'discipline',
        intensity: 2,
      });
    }

    wrap(<HabitsPage />);

    const add = screen.getByRole('button', { name: /^Add$/i });
    expect((add as HTMLButtonElement).disabled).toBe(false);
    expect(useGameStore.getState().habits.length).toBe(23);

    expectCleanRender();
  });

  it('puts Leaderboards in the bottom navigation', () => {
    wrap(<BottomNav />);

    const boards = screen.getByRole('link', { name: /boards/i });
    expect(boards.getAttribute('href')).toBe('/leaderboards');

    expectCleanRender();
  });

  it('mounts the leaderboards screen with all seven boards', () => {
    wrap(<LeaderboardsPage />);

    ['Weekly', 'Friends', 'Guild', 'My Rank', 'Global', 'Slayers', 'Deep Road'].forEach(
      (label) => {
        expect(
          screen.getByRole('tab', { name: label }),
          `missing leaderboard tab: ${label}`,
        ).toBeDefined();
      },
    );

    expectCleanRender();
  });

  it('mounts the shop', () => {
    // Rank 5 so the shop is unlocked rather than showing the locked state.
    useGameStore.getState().updateCharacter({ rank_tier: 5, rank_xp: 15000 });
    wrap(<ShopPage />);
    expectCleanRender();
  });

  it('mounts the iblis tab', () => {
    wrap(<IblisPage />);
    expectCleanRender();
  });

  it('survives a habit completion re-render', () => {
    wrap(<BattlePage />);

    const habitId = useGameStore.getState().habits[0].id;
    useGameStore.getState().completeHabit(habitId);

    expectCleanRender();
  });

  it('survives equipping gear, which changes derived totals', () => {
    useGameStore.getState().updateCharacter({ coins: 50_000, rank_tier: 5 });
    useGameStore.getState().buyItem('sw_06');

    wrap(<CharacterPage />);
    useGameStore.getState().equipItem('sw_06');

    expectCleanRender();
  });
});
