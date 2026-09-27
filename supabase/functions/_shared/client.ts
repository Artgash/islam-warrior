import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * A client bound to the caller's JWT. Every query it makes is subject to RLS,
 * which is exactly what we want for anything acting on behalf of a player.
 */
export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    },
  );
}

/**
 * Service-role client: bypasses RLS. Used only for writes the player must
 * not be able to forge — awarding XP, granting loot, admin actions.
 */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

export async function requireUser(req: Request): Promise<{ id: string; email: string }> {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error('Not authenticated.');
  }

  return { id: data.user.id, email: data.user.email ?? '' };
}

export async function requireAdmin(req: Request): Promise<{ id: string }> {
  const user = await requireUser(req);
  const service = serviceClient();

  const { data } = await service
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!data?.is_admin) {
    throw new Error('Admin privileges required.');
  }

  return { id: user.id };
}

/** Local date string in the caller's timezone, falling back to UTC. */
export function todayFor(timezone?: string): string {
  try {
    if (!timezone) throw new Error('no tz');
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
