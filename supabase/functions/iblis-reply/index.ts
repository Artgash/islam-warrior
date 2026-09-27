/**
 * iblis-reply — records an answer to a taunt and grants the morale buff.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/client.ts';

const MORALE_HOURS = 24;

interface Payload {
  taunt_log_id: string;
  reply_id: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const user = await requireUser(req);
    const payload = (await req.json()) as Payload;

    if (!payload?.taunt_log_id || !payload?.reply_id) {
      return fail('taunt_log_id and reply_id are required.');
    }

    const db = serviceClient();

    const [{ data: log }, { data: reply }] = await Promise.all([
      db
        .from('taunt_logs')
        .select('*')
        .eq('id', payload.taunt_log_id)
        .eq('user_id', user.id)
        .maybeSingle(),
      db.from('iblis_replies').select('*').eq('id', payload.reply_id).maybeSingle(),
    ]);

    if (!log) return fail('No such taunt.', 404);
    if (!reply) return fail('No such reply.', 404);
    if (log.replied_at) return fail('You already answered that one.', 409);

    const expires = new Date(Date.now() + MORALE_HOURS * 3_600_000).toISOString();

    await db
      .from('taunt_logs')
      .update({
        replied_at: new Date().toISOString(),
        reply_id: reply.id,
        reply_text: reply.text,
      })
      .eq('id', log.id);

    await db
      .from('characters')
      .update({
        morale_buff_percent: reply.morale_percent,
        morale_buff_expires: expires,
      })
      .eq('user_id', user.id);

    await db.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: 'Morale raised',
      body: `You answered: "${reply.text}" — +${Math.round(reply.morale_percent * 100)}% attack for ${MORALE_HOURS} hours.`,
    });

    return json({
      ok: true,
      morale_percent: reply.morale_percent,
      expires_at: expires,
      reply_text: reply.text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('authenticated') ? 401 : 500);
  }
});
