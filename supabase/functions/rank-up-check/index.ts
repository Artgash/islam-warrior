/**
 * rank-up-check — recomputes tier and division from lifetime rank XP.
 *
 * Idempotent, so it is safe to call after decay, an admin adjustment or a
 * season rollover. The database trigger already keeps these in step during
 * normal play; this exists for repair and for clients that want an explicit
 * confirmation after a large XP award.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/client.ts';
import { divisionForXp, tierForXp } from '../_shared/engine.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const user = await requireUser(req);
    const db = serviceClient();

    const { data: character, error } = await db
      .from('characters')
      .select('rank_xp, rank_tier, rank_division')
      .eq('user_id', user.id)
      .single();

    if (error || !character) return fail('No character found.', 404);

    const tier = tierForXp(Number(character.rank_xp));
    const division = divisionForXp(Number(character.rank_xp));
    const changed = tier !== character.rank_tier || division !== character.rank_division;

    if (changed) {
      await db
        .from('characters')
        .update({ rank_tier: tier, rank_division: division })
        .eq('user_id', user.id);

      await db.from('rank_history').insert({
        user_id: user.id,
        tier,
        division,
        direction:
          tier > character.rank_tier ||
          (tier === character.rank_tier && division < character.rank_division)
            ? 'up'
            : 'down',
      });
    }

    return json({
      ok: true,
      changed,
      rank_tier: tier,
      rank_division: division,
      rank_xp: Number(character.rank_xp),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('authenticated') ? 401 : 500);
  }
});
