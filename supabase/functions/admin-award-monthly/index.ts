/**
 * admin-award-monthly — grants a monthly relic to one or more players.
 *
 * These relics (Sword of Ramadan, Blade of Muharram, Shield of Arafah,
 * Ring of Laylat al-Qadr, Crown of Eid) are never sold and never
 * re-released, so every grant is written to admin_actions as an audit trail.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireAdmin, serviceClient } from '../_shared/client.ts';

interface Payload {
  item_id: string;
  user_ids: string[];
  /** e.g. "2027-03" — stamped on the profile showcase. */
  month: string;
  label?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const admin = await requireAdmin(req);
    const payload = (await req.json()) as Payload;

    if (!payload?.item_id || !Array.isArray(payload.user_ids) || !payload.month) {
      return fail('item_id, user_ids and month are required.');
    }
    if (payload.user_ids.length === 0) return fail('No recipients given.');
    if (payload.user_ids.length > 100) return fail('At most 100 recipients per call.');

    const db = serviceClient();

    const { data: item } = await db
      .from('gear_items')
      .select('*')
      .eq('id', payload.item_id)
      .maybeSingle();

    if (!item) return fail('No such item.', 404);
    if (!item.is_award_only) return fail('That item is purchasable, not awardable.', 409);

    const label = payload.label ?? item.awarded_label ?? payload.month;
    const awarded: string[] = [];
    const skipped: string[] = [];

    for (const userId of payload.user_ids) {
      const { error: rewardError } = await db.from('monthly_rewards').insert({
        user_id: userId,
        item_id: item.id,
        label,
        month: payload.month,
      });

      // A duplicate means this player already holds it — never award twice.
      if (rewardError) {
        skipped.push(userId);
        continue;
      }

      await db
        .from('inventory')
        .upsert(
          { user_id: userId, item_id: item.id, quantity: 1, awarded_label: label },
          { onConflict: 'user_id,item_id' },
        );

      await db.from('notifications').insert({
        user_id: userId,
        type: 'reward',
        title: `Awarded: ${item.name}`,
        body: `${item.description} Awarded ${label}. It will never be given again.`,
      });

      awarded.push(userId);
    }

    await db.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'award_monthly',
      payload: {
        item_id: item.id,
        month: payload.month,
        label,
        awarded_count: awarded.length,
        skipped_count: skipped.length,
      },
    });

    return json({ ok: true, awarded, skipped, item: item.name, label });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('Admin') ? 403 : 500);
  }
});
