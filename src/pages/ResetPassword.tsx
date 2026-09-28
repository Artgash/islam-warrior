/**
 * Where the password-reset link lands.
 *
 * `requestPasswordReset` has always pointed here, but the route did not
 * exist, so every reset link a player followed hit the 404 page. The
 * recovery link signs them in with a short-lived session; all that is left
 * is to take a new password and write it.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { StarDivider, GeometricField } from '@/components/common/StarDivider';
import { updatePassword } from '@/api/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Those do not match.',
    path: ['confirm'],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  // The link carries the session. Without one there is nothing to update,
  // and saying so beats a failure at submit time.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) setReady(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setReady(Boolean(data.session));
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: Values) => {
    setBusy(true);
    try {
      await updatePassword(values.password);
      toast.success('Password changed. You are signed in.');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <GeometricField className="text-gold" />

      <div className="panel framed relative w-full max-w-sm p-6">
        <KeyRound className="mx-auto mb-3 size-8 text-gold" />
        <h1 className="text-center font-display text-lg text-bone">Choose a new password</h1>
        <StarDivider className="my-4" />

        {ready === false ? (
          <>
            <p className="text-center text-sm leading-relaxed text-muted">
              This reset link has expired or has already been used. Ask for a new one from the
              sign-in screen.
            </p>
            <Button size="block" className="mt-5" onClick={() => navigate('/auth', { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...form.register('password')}
              />
              <FieldError>{form.formState.errors.password?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="confirm">Repeat it</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...form.register('confirm')}
              />
              <FieldError>{form.formState.errors.confirm?.message}</FieldError>
            </div>

            <Button type="submit" size="block" disabled={busy || ready === null}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
