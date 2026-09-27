/**
 * season-rollover — scheduled maintenance.
 *
 * Wraps the SQL routine `season_rollover` so the behaviour is identical whether it is
 * triggered by pg_cron inside the database or by an external scheduler
 * calling this endpoint. Requires the service-role key.
 */

import { cronHandler } from '../_shared/cronJob.ts';

Deno.serve(cronHandler('season_rollover', 'Season rollover'));
