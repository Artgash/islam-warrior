/**
 * guild-war-matchmake — scheduled maintenance.
 *
 * Wraps the SQL routine `guild_war_matchmake` so the behaviour is identical whether it is
 * triggered by pg_cron inside the database or by an external scheduler
 * calling this endpoint. Requires the service-role key.
 */

import { cronHandler } from '../_shared/cronJob.ts';

Deno.serve(cronHandler('guild_war_matchmake', 'Guild war matchmaking'));
