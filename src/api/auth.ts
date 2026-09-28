/**
 * Authentication.
 *
 * Two backends behind one interface:
 *  - Supabase Auth when credentials are configured (email + Google OAuth)
 *  - A local account store when they are not, so the game is playable
 *    immediately after `npm install` without provisioning a backend.
 *
 * The local backend is explicitly NOT a security boundary. It exists so the
 * single-player game loop works offline; anything multiplayer requires
 * Supabase, and the UI says so.
 */

import type { AppUser } from '@/types';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';
import { readJsonSync, writeJson, removeKey } from '@/platform/storage';
import { uuid } from '@/lib/utils';

const LOCAL_USERS_KEY = 'auth:users';
const LOCAL_SESSION_KEY = 'auth:session';

interface LocalAccount {
  id: string;
  email: string;
  /** Not a password hash. See the note above — local mode is not a security boundary. */
  secret: string;
  created_at: string;
  is_admin: boolean;
  onboarded: boolean;
}

function loadAccounts(): LocalAccount[] {
  return readJsonSync<LocalAccount[]>(LOCAL_USERS_KEY, []);
}

function toAppUser(account: LocalAccount): AppUser {
  return {
    id: account.id,
    email: account.email,
    created_at: account.created_at,
    is_admin: account.is_admin,
    onboarded: account.onboarded,
  };
}

/** Deliberately weak, and only ever used in local mode. */
function obscure(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return String(hash);
}

/* ------------------------------------------------------------------ */
/* Sign up / sign in                                                   */
/* ------------------------------------------------------------------ */

export interface AuthResult {
  user: AppUser;
  /** True when the account was created by this call. */
  created: boolean;
  /**
   * Supabase returned a user but no session, which means the project has
   * "Confirm email" switched on and the address must be verified before the
   * account can be used. The UI shows a "check your inbox" state.
   */
  needsEmailConfirmation?: boolean;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: normalized,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign-up did not return a user.');

    // A user with no session means the project requires email confirmation.
    // Supabase also returns a user here for an address that already exists,
    // deliberately, so it cannot be used to enumerate accounts.
    const needsEmailConfirmation = !data.session;

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? normalized,
        created_at: data.user.created_at,
        is_admin: false,
        onboarded: false,
      },
      created: true,
      needsEmailConfirmation,
    };
  }

  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === normalized)) {
    throw new Error('An account with that email already exists.');
  }

  const account: LocalAccount = {
    // A bare UUID even in local mode: this id is written to `user_id` on
    // characters, habits and logs, and every one of those columns is `uuid`.
    // A prefixed id here would break the first cloud sync.
    id: uuid(),
    email: normalized,
    secret: obscure(password),
    created_at: new Date().toISOString(),
    is_admin: accounts.length === 0, // the first local account owns the admin panel
    onboarded: false,
  };

  await writeJson(LOCAL_USERS_KEY, [...accounts, account]);
  await writeJson(LOCAL_SESSION_KEY, { user_id: account.id });

  return { user: toAppUser(account), created: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign-in did not return a user.');

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? normalized,
        created_at: data.user.created_at,
        is_admin: Boolean(data.user.app_metadata?.is_admin),
        onboarded: Boolean(data.user.user_metadata?.onboarded),
      },
      created: false,
    };
  }

  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email === normalized);

  if (!account || account.secret !== obscure(password)) {
    throw new Error('Those credentials do not match an account.');
  }

  await writeJson(LOCAL_SESSION_KEY, { user_id: account.id });
  return { user: toAppUser(account), created: false };
}

export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Google sign-in requires a configured Supabase project.');
  }

  const client = requireSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
    return;
  }
  await removeKey(LOCAL_SESSION_KEY);
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export async function getCurrentUser(): Promise<AppUser | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      created_at: data.user.created_at,
      is_admin: Boolean(data.user.app_metadata?.is_admin),
      onboarded: Boolean(data.user.user_metadata?.onboarded),
    };
  }

  const session = readJsonSync<{ user_id: string } | null>(LOCAL_SESSION_KEY, null);
  if (!session) return null;

  const account = loadAccounts().find((a) => a.id === session.user_id);
  return account ? toAppUser(account) : null;
}

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Password reset requires a configured Supabase project. In local mode, sign up again with a new email.',
    );
  }

  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/auth/reset`,
  });
  if (error) throw new Error(error.message);
}

/**
 * Sends a fresh confirmation email.
 *
 * Confirmation mail goes missing often enough - spam folders, typos caught
 * too late, links expiring - that having no way to ask for another one is a
 * dead end rather than an inconvenience.
 */
export async function resendConfirmation(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Local mode does not send email; accounts are confirmed automatically.');
  }

  const client = requireSupabase();
  const { error } = await client.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Password changes require a configured Supabase project.');
  }
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Account lifecycle                                                   */
/* ------------------------------------------------------------------ */

export async function markOnboarded(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.updateUser({ data: { onboarded: true } });
    return;
  }

  const accounts = loadAccounts().map((a) =>
    a.id === userId ? { ...a, onboarded: true } : a,
  );
  await writeJson(LOCAL_USERS_KEY, accounts);
}

/**
 * Deletes the account. In Supabase mode this calls the `delete-account`
 * edge function, which cascades every owned row before removing the user.
 */
export async function deleteAccount(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw new Error(error.message);
    await supabase.auth.signOut();
    return;
  }

  const accounts = loadAccounts().filter((a) => a.id !== userId);
  await writeJson(LOCAL_USERS_KEY, accounts);
  await removeKey(LOCAL_SESSION_KEY);
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function onAuthChange(
  callback: (user: AppUser | null, event: string) => void,
): () => void {
  if (isSupabaseConfigured && supabase) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        callback(null, event);
        return;
      }
      callback({
        id: session.user.id,
        email: session.user.email ?? '',
        created_at: session.user.created_at,
        is_admin: Boolean(session.user.app_metadata?.is_admin),
        onboarded: Boolean(session.user.user_metadata?.onboarded),
      }, event);
    });
    return () => data.subscription.unsubscribe();
  }

  return () => undefined;
}
