/**
 * apply-rank-decay — scheduled maintenance.
 *
 * Wraps the SQL routine `apply_rank_decay_daily` so the behaviour is identical whether it is
 * triggered by pg_cron inside the database or by an external scheduler
 * calling this endpoint. Requires the service-role key.
 */

import { cronHandler } from '../_shared/cronJob.ts';

Deno.serve(cronHandler('apply_rank_decay_daily', 'Rank decay'));
