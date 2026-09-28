/**
 * Where the email confirmation link lands.
 *
 * Previously this route redirected straight to `/`, which mostly worked by
 * accident: supabase-js parses the tokens out of the URL asynchronously, so
 * the guard on `/` ran first, saw no user yet and bounced to the sign-in
 * screen. The session then arrived and bounced them back. Confirming your
 * email flashed the login form at you, and an expired link simply dumped
 * you on the sign-in screen with nothing said.
 *
 * So wait for the session here, pull down any existing progress, and say
 * plainly what happened when it fails.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MailX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarDivider, GeometricField } from '@/components/common/StarDivider';
import { useGameStore } from '@/state';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/** Supabase reports failures in the query string or the hash, depending. */
function readError(): string | null {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const description = query.get('error_description') ?? hash.get('error_description');
  if (description) return description.replace(/\+/g, ' ');

  const code = query.get('error') ?? hash.get('error');
  return code ? code.replace(/_/g, ' ') : null;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const setUser = useGameStore((s) => s.setUser);
  const hydrateFromCloud = useGameStore((s) => s.hydrateFromCloud);

  const [error, setError] = useState<string | null>(null);

  // React runs effects twice in development; without this the whole
  // exchange would run a second time against an already-consumed code.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    const finish = async () => {
      const reported = readError();
      if (reported) {
        if (!cancelled) setError(reported);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        navigate('/', { replace: true });
        return;
      }

      // PKCE links arrive as ?code=...; implicit ones put tokens in the hash
      // and are picked up by detectSessionInUrl when the client is built.
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        if (!cancelled) {
          setError('That confirmation link is no longer valid. Request a new one by signing in.');
        }
        return;
      }

      if (cancelled) return;

      setUser({
        id: session.user.id,
        email: session.user.email ?? '',
        created_at: session.user.created_at,
        is_admin: Boolean(session.user.app_metadata?.is_admin),
        onboarded: Boolean(session.user.user_metadata?.onboarded),
      });

      // A returning player confirming on a new device has progress waiting;
      // fetch it before choosing between the game and onboarding.
      await hydrateFromCloud(session.user.id).catch(() => undefined);

      if (cancelled) return;

      const character = useGameStore.getState().character;
      navigate(character ? '/' : '/onboarding', { replace: true });
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, setUser, hydrateFromCloud]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <GeometricField className="text-gold" />

      <div className="panel framed relative w-full max-w-sm p-6 text-center">
        {error ? (
          <>
            <MailX className="mx-auto mb-3 size-8 text-danger" />
            <h1 className="font-display text-lg text-bone">That link did not work</h1>
            <StarDivider className="my-4" />
            <p className="text-sm leading-relaxed text-muted">{error}</p>
            <p className="mt-3 text-xs text-muted/70">
              Confirmation links expire. Signing in again sends a fresh one.
            </p>
            <Button size="block" className="mt-5" onClick={() => navigate('/auth', { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-3 size-8 animate-spin text-gold" />
            <h1 className="font-display text-lg text-bone">Confirming your account</h1>
            <p className="mt-2 text-sm text-muted">One moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
