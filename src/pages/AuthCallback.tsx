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
import { cn } from '@/lib/utils';

interface LinkFailure {
  message: string;
  /** True when the account is probably fine and only the link is spent. */
  likelyAlreadyUsed: boolean;
}

/**
 * Supabase reports failures in the query string or the hash, depending.
 *
 * `otp_expired` is worth separating out. Confirmation links are single use,
 * and mail clients pre-fetch links to build previews - so the scanner opens
 * it, the account is confirmed, and the real tap arrives at a spent token.
 * "Email link is invalid or has expired" is then true and badly misleading:
 * the account usually works, and signing in normally is all that is needed.
 */
function readError(): LinkFailure | null {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const code = query.get('error_code') ?? hash.get('error_code') ?? '';
  const reason = query.get('error') ?? hash.get('error');
  const description = query.get('error_description') ?? hash.get('error_description');

  const spent = code === 'otp_expired' || /expired|already/i.test(description ?? '');

  if (spent) {
    return {
      message:
        'This link had already been used. That usually means your email app opened it first ' +
        'to preview it, which confirms the account but uses the link up.',
      likelyAlreadyUsed: true,
    };
  }

  if (description) {
    return { message: description.replace(/\+/g, ' '), likelyAlreadyUsed: false };
  }

  if (reason) {
    return { message: reason.replace(/_/g, ' '), likelyAlreadyUsed: false };
  }

  return null;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const setUser = useGameStore((s) => s.setUser);
  const hydrateFromCloud = useGameStore((s) => s.hydrateFromCloud);

  const [error, setError] = useState<LinkFailure | null>(null);

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
          if (!cancelled) setError({ message: exchangeError.message, likelyAlreadyUsed: false });
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        if (!cancelled) {
          setError({
            message:
              'This link had already been used, or it has expired. If you have confirmed ' +
              'before, your account already works.',
            likelyAlreadyUsed: true,
          });
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
            <MailX
              className={cn(
                'mx-auto mb-3 size-8',
                error.likelyAlreadyUsed ? 'text-gold' : 'text-danger',
              )}
            />
            <h1 className="font-display text-lg text-bone">
              {error.likelyAlreadyUsed ? 'This link was already used' : 'That link did not work'}
            </h1>
            <StarDivider className="my-4" />
            <p className="text-sm leading-relaxed text-muted">{error.message}</p>
            <p className="mt-3 text-xs text-muted/70">
              {error.likelyAlreadyUsed
                ? 'Try signing in with your email and password - most likely it just works. If it says the email is not confirmed, ask for a new link from there.'
                : 'Confirmation links expire. Signing in again sends a fresh one.'}
            </p>
            <Button size="block" className="mt-5" onClick={() => navigate('/auth', { replace: true })}>
              {error.likelyAlreadyUsed ? 'Sign in' : 'Back to sign in'}
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
