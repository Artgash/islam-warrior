/**
 * anti-cheat-scan — scheduled maintenance.
 *
 * Wraps the SQL routine `anti_cheat_scan` so the behaviour is identical whether it is
 * triggered by pg_cron inside the database or by an external scheduler
 * calling this endpoint. Requires the service-role key.
 */

import { cronHandler } from '../_shared/cronJob.ts';

Deno.serve(cronHandler('anti_cheat_scan', 'Anti-cheat scan'));
