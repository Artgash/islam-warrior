import { Suspense, lazy } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { useGameStore } from '@/state';
import { TopBar, BottomNav } from '@/components/common/Layout';
import { Skeleton } from '@/components/ui/misc';
import { GameOverlays } from '@/App';

/* Eager: the two screens every session starts on. */
import LandingPage from '@/pages/Landing';
import OnboardingPage from '@/pages/Onboarding';
import BattlePage from '@/pages/Battle';

/* Lazy: everything reachable by navigation. */
const RoadPage = lazy(() => import('@/pages/Road'));
const HabitsPage = lazy(() => import('@/pages/Habits'));
const CharacterPage = lazy(() => import('@/pages/Character'));
const ShopPage = lazy(() => import('@/pages/Shop'));
const RankPage = lazy(() => import('@/pages/Rank'));
const LeaderboardsPage = lazy(() => import('@/pages/Leaderboards'));
const GuildPage = lazy(() => import('@/pages/Guild'));
const IblisPage = lazy(() => import('@/pages/Iblis'));
const SeasonPage = lazy(() => import('@/pages/Season'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const MorePage = lazy(() => import('@/pages/More'));
const SetupPage = lazy(() => import('@/pages/Setup'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallback'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPassword'));

const TermsPage = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.NotFoundPage })));

/* ------------------------------------------------------------------ */
/* Guards                                                              */
/* ------------------------------------------------------------------ */

function RouteFallback() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Everything inside the game needs a signed-in user AND a created character.
 * Missing either one sends the player back to the right starting point.
 */
function ProtectedLayout() {
  const hydrated = useGameStore((s) => s.hydrated);
  const user = useGameStore((s) => s.user);
  const character = useGameStore((s) => s.character);

  // Wait for persisted state before deciding where to send anyone.
  if (!hydrated) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!character) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      <GameOverlays />
    </div>
  );
}

/** The auth screen; already-signed-in players skip past it. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useGameStore((s) => s.hydrated);
  const user = useGameStore((s) => s.user);
  const character = useGameStore((s) => s.character);

  if (!hydrated) return <RouteFallback />;
  if (user && character) return <Navigate to="/" replace />;
  if (user && !character) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

/** Onboarding needs a user but explicitly must NOT have a character yet. */
function OnboardingGuard() {
  const hydrated = useGameStore((s) => s.hydrated);
  const user = useGameStore((s) => s.user);
  const character = useGameStore((s) => s.character);

  if (!hydrated) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (character) return <Navigate to="/" replace />;

  return <OnboardingPage />;
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <PublicOnly>
        <LandingPage />
      </PublicOnly>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <AuthCallbackPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/reset',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  { path: '/onboarding', element: <OnboardingGuard /> },

  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <BattlePage /> },
      { path: 'road', element: <RoadPage /> },
      { path: 'habits', element: <HabitsPage /> },
      { path: 'character', element: <CharacterPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'rank', element: <RankPage /> },
      { path: 'leaderboards', element: <LeaderboardsPage /> },
      { path: 'guild', element: <GuildPage /> },
      { path: 'iblis', element: <IblisPage /> },
      { path: 'season', element: <SeasonPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'more', element: <MorePage /> },
      { path: 'setup', element: <SetupPage /> },
    ],
  },

  {
    path: '/terms',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <TermsPage />
      </Suspense>
    ),
  },
  {
    path: '/privacy',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
