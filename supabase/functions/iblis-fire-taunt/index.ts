/**
 * iblis-fire-taunt — fires a taunt for one player, or sweeps everyone.
 *
 * The cadence rules (one per five days, never in quiet hours) live in the
 * SQL function `fire_iblis_taunt`, so a direct database call and a call
 * through this function behave identically.
 *
 * Cron invocation:
 *   POST with { "sweep": true } and the service-role key.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const db = serviceClient();
    const body = await req.json().catch(() => ({}));

    /* Cron sweep: authorised by the service-role key, not by a user. */
    if (body?.sweep === true) {
      const auth = req.headers.get('Authorization') ?? '';
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      if (!serviceKey || !auth.includes(serviceKey)) {
        return fail('The sweep requires the service role key.', 403);
      }

      const { error } = await db.rpc('fire_iblis_taunt_weekly');
      if (error) return fail(error.message, 500);

      return json({ ok: true, swept: true });
    }

    /* Single player. */
    const user = await requireUser(req);
    const { data, error } = await db.rpc('fire_iblis_taunt', { p_user_id: user.id });

    if (error) return fail(error.message, 500);

    if (!data) {
      return json({ ok: true, fired: false, reason: 'Too soon — he speaks at most once every five days.' });
    }

    const { data: log } = await db.from('taunt_logs').select('*').eq('id', data).single();

    return json({ ok: true, fired: true, taunt: log });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('authenticated') ? 401 : 500);
  }
});
