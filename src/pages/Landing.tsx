import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { StarDivider, GeometricField, EightPointStar } from '@/components/common/StarDivider';
import { WarriorSprite } from '@/components/battle/Sprites';
import { useGameStore } from '@/state';
import { signIn, signUp, signInWithGoogle, requestPasswordReset } from '@/api/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { TOTAL_ZONES, IBLIS_HP_DISPLAY } from '@/game/constants';

const credentialsSchema = z.object({
  email: z.string().email('That does not look like an email address.'),
  password: z.string().min(8, 'At least 8 characters.'),
});

type Credentials = z.infer<typeof credentialsSchema>;

type Mode = 'signin' | 'signup' | 'reset';

export default function LandingPage() {
  const navigate = useNavigate();
  const setUser = useGameStore((s) => s.setUser);
  const character = useGameStore((s) => s.character);

  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);

  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: Credentials) => {
    setBusy(true);
    try {
      if (mode === 'reset') {
        await requestPasswordReset(values.email);
        toast.success('Check your email for a reset link.');
        setMode('signin');
        return;
      }

      const result =
        mode === 'signup'
          ? await signUp(values.email, values.password)
          : await signIn(values.email, values.password);

      setUser(result.user);
      toast.success(mode === 'signup' ? 'Account created.' : 'Welcome back.');

      // An existing character skips onboarding entirely.
      navigate(character ? '/' : '/onboarding', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <GeometricField className="text-gold" />

      {/* Hero */}
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="mx-auto mb-2 flex justify-center">
            <WarriorSprite rankTier={6} size={140} />
          </div>

          <div className="flex items-center justify-center gap-2 text-gold">
            <EightPointStar size={12} />
            <p className="font-display text-[10px] uppercase tracking-[0.45em]">
              Jihad al-Nafs
            </p>
            <EightPointStar size={12} />
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-wide text-bone sm:text-5xl">
            ISLAM WARRIOR
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every habit you keep is a strike. {TOTAL_ZONES} zones stand between you and the Throne
            of Iblis, and he has {IBLIS_HP_DISPLAY} reasons to think you will never arrive.
          </p>
        </motion.div>

        <StarDivider className="my-6" />

        {/* Auth form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="panel framed p-5"
        >
          <h2 className="mb-4 text-center font-display text-lg text-bone">
            {mode === 'signup'
              ? 'Begin the road'
              : mode === 'reset'
                ? 'Reset your password'
                : 'Return to the road'}
          </h2>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="warrior@example.com"
                {...form.register('email')}
              />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </div>

            {mode !== 'reset' && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="At least 8 characters"
                  {...form.register('password')}
                />
                <FieldError>{form.formState.errors.password?.message}</FieldError>
              </div>
            )}

            <Button type="submit" size="block" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
            </Button>
          </form>

          {isSupabaseConfigured && mode !== 'reset' && (
            <>
              <StarDivider label="or" className="my-4" />
              <Button variant="secondary" size="block" onClick={onGoogle} disabled={busy}>
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-4 space-y-2 text-center text-xs">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  className="text-muted underline-offset-4 hover:text-gold hover:underline"
                  onClick={() => setMode('signup')}
                >
                  No account yet? Begin the road.
                </button>
                <br />
                <button
                  type="button"
                  className="text-muted/70 underline-offset-4 hover:text-bone hover:underline"
                  onClick={() => setMode('reset')}
                >
                  Forgot your password?
                </button>
              </>
            )}
            {mode !== 'signin' && (
              <button
                type="button"
                className="text-muted underline-offset-4 hover:text-gold hover:underline"
                onClick={() => setMode('signin')}
              >
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-lg border border-edge bg-card/60 px-3 py-2 text-center text-[11px] leading-relaxed text-muted">
            Running in <span className="text-gold">local mode</span> — your account and progress
            live in this browser only. Add Supabase credentials to <code>.env.local</code> for
            cloud sync, guilds and real leaderboards.
          </p>
        )}

        <p className="mt-5 text-center text-[10px] text-muted/60">
          By continuing you accept the{' '}
          <a href="/terms" className="underline underline-offset-2 hover:text-muted">
            terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-muted">
            privacy policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
