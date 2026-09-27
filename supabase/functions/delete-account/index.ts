/**
 * delete-account — erases everything the caller owns, then the account.
 *
 * Foreign keys cascade from public.users, and public.users cascades from
 * auth.users, so removing the auth user is sufficient. The explicit deletes
 * below run first anyway: they make the intent legible and they cover the
 * guild-leadership handover, which a cascade cannot decide on its own.
 */

import { fail, json, preflight } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const user = await requireUser(req);
    const db = serviceClient();

    /* --- Hand over or dissolve any guild this player leads ---------- */

    const { data: ledGuilds } = await db
      .from('guilds')
      .select('id')
      .eq('leader_id', user.id);

    for (const guild of ledGuilds ?? []) {
      const { data: successor } = await db
        .from('guild_members')
        .select('user_id')
        .eq('guild_id', guild.id)
        .neq('user_id', user.id)
        .order('role', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (successor) {
        await db.from('guilds').update({ leader_id: successor.user_id }).eq('id', guild.id);
        await db
          .from('guild_members')
          .update({ role: 'leader' })
          .eq('guild_id', guild.id)
          .eq('user_id', successor.user_id);
      } else {
        // Last one out closes the door.
        await db.from('guilds').delete().eq('id', guild.id);
      }
    }

    /* --- Remove owned rows ------------------------------------------ */

    const ownedTables = [
      'guild_members', 'guild_chat', 'friendships', 'notifications',
      'taunt_logs', 'user_achievements', 'rank_history', 'coins_transactions',
      'legendary_fragments', 'active_effects', 'equipped_items', 'inventory',
      'monster_instances', 'battle_logs', 'battles', 'season_progress',
      'monthly_rewards', 'leaderboard_snapshots', 'habit_logs', 'habits',
      'characters',
    ];

    for (const table of ownedTables) {
      await db.from(table).delete().eq('user_id', user.id);
    }

    /* --- Finally the account ---------------------------------------- */

    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) return fail(error.message, 500);

    return json({ ok: true, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return fail(message, message.includes('authenticated') ? 401 : 500);
  }
});
