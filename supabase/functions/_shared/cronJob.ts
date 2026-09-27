/**
 * Shared handler for the scheduled maintenance functions.
 *
 * Each of these wraps a SQL routine so the logic has exactly one home. They
 * are authorised by the service-role key rather than a user JWT, because
 * they act on every player at once.
 */

import { fail, json, preflight } from './cors.ts';
import { serviceClient } from './client.ts';

export function cronHandler(rpcName: string, label: string) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return preflight();

    const auth = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceKey || !auth.includes(serviceKey)) {
      return fail(`${label} requires the service role key.`, 403);
    }

    try {
      const { error } = await serviceClient().rpc(rpcName);
      if (error) return fail(error.message, 500);

      return json({ ok: true, ran: rpcName, at: new Date().toISOString() });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Unexpected error.', 500);
    }
  };
}
