import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { router } from '@/router';
import { useGameStore } from '@/state';
import { useDailyRollover } from '@/hooks/useGame';
import { AchievementToast } from '@/components/battle/Overlays';
import { TooltipProvider } from '@/components/ui/misc';
import { getCurrentUser, onAuthChange } from '@/api/auth';
import { setMusicEnabled, setSoundEnabled, unlockAudio } from '@/platform/sound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/**
 * Global overlays that must render above every route: achievement toasts and
 * the daily-rollover hook that runs wherever the player happens to be.
 */
export function GameOverlays() {
  const pending = useGameStore((s) => s.pendingAchievements);
  const dismiss = useGameStore((s) => s.dismissAchievement);
  useDailyRollover();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {pending.slice(0, 3).map((achievement) => (
          <AchievementToast
            key={achievement.id}
            achievement={achievement}
            onDismiss={() => dismiss(achievement.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const setUser = useGameStore((s) => s.setUser);
  const setHydrated = useGameStore((s) => s.setHydrated);
  const settings = useGameStore((s) => s.settings);

  // Restore the session, then mark the store ready so the route guards can
  // make a decision without flashing the auth screen at a signed-in player.
  useEffect(() => {
    let cancelled = false;

    void getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        // Only adopt a remote session; a persisted local user already loaded.
        if (user) setUser(user);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    const unsubscribe = onAuthChange((user) => setUser(user));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setUser, setHydrated]);

  // Keep the audio layer in sync with the player's preferences.
  useEffect(() => {
    setSoundEnabled(settings.sound_enabled);
    setMusicEnabled(settings.music_enabled);
  }, [settings.sound_enabled, settings.music_enabled]);

  // Browsers refuse to start an AudioContext before a user gesture, so the
  // first tap anywhere unlocks it. Once is enough for the whole session.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#1A2030',
              border: '1px solid #2A3348',
              color: '#F5F0E1',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
