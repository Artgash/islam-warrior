/**
 * Produces paste-ready SQL in `supabase/paste/`.
 *
 * Why this exists: 0004_seed.sql is ~620 KB, almost all of it the 66 zones
 * and 1,056 monsters. Pasting that into the dashboard's browser SQL editor
 * is unreliable - it either hangs the tab or the statement times out, and
 * you get a half-applied seed with no clear error.
 *
 * The split is safe because the client never reads content tables from
 * Postgres. Zones, monsters, gear and ranks all live in `src/game/**` and
 * ship in the bundle. Server-side SQL touches exactly two of these tables:
 * `ranks` (rank recalculation) and `iblis_taunts` (the taunt picker). Both
 * are in the small file.
 *
 * So:
 *   4-content.sql          small, REQUIRED   - ranks, taunts, gear, the rest
 *   5-zones-monsters.sql   large, OPTIONAL   - only for server-side reporting
 *
 * Run with: npm run sql:paste
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');
const OUT = join(process.cwd(), 'supabase', 'paste');

/** Where the bulk content starts, and where it ends. */
const BULK_START = '-- 66 zones';
const BULK_END = '-- Gear catalogue';

function read(name: string): string {
  return readFileSync(join(MIGRATIONS, name), 'utf8');
}

function banner(title: string, note: string): string {
  return [
    '-- =====================================================================',
    `-- ${title}`,
    `-- ${note}`,
    '-- =====================================================================',
    '',
  ].join('\n');
}

function write(name: string, body: string): void {
  writeFileSync(join(OUT, name), body, 'utf8');
  const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(0);
  console.log(`  ${name.padEnd(28)} ${kb.padStart(5)} KB`);
}

function splitSeed(seed: string): { essential: string; bulk: string } {
  const start = seed.indexOf(BULK_START);
  const end = seed.indexOf(BULK_END);

  // Fail loudly rather than silently emitting a seed that is missing rows.
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Could not find the content boundaries in 0004_seed.sql.\n` +
        `Looked for "${BULK_START}" and "${BULK_END}". If the generator's ` +
        `section headings changed, update them at the top of this script.`,
    );
  }

  const head = seed.slice(0, start); // header comment + `begin;`
  const bulkBody = seed.slice(start, end);
  const tail = seed.slice(end); // gear onwards, including `commit;`

  return {
    essential: head + tail,
    bulk: head + bulkBody + '\ncommit;\n',
  };
}

mkdirSync(OUT, { recursive: true });
console.log('Writing paste-ready SQL to supabase/paste/\n');

const tables = read('0001_schema.sql');
const security = read('0002_rls.sql');
const logic = read('0003_functions.sql');
const { essential, bulk } = splitSeed(read('0004_seed.sql'));

// One paste beats four. Files 1-3 open no transaction of their own and the
// seed opens exactly one, so concatenating them runs cleanly in order.
write(
  '0-everything.sql',
  banner(
    'EVERYTHING - paste this one file and press run',
    'Tables, security, logic and content in the order they have to happen. Nothing else is required.',
  ) +
    [tables, security, logic, essential].join('\n\n'),
);

write(
  '1-tables.sql',
  banner('STEP 1 of 4 - tables', 'Only needed if you are running the steps separately.') + tables,
);

write(
  '2-security.sql',
  banner('STEP 2 of 4 - row-level security', 'Run after step 1. Nothing is readable until this runs.') +
    security,
);

write(
  '3-logic.sql',
  banner(
    'STEP 3 of 4 - functions, triggers, leaderboard views',
    'If this fails on pg_cron, enable that extension and re-run. Only the scheduled jobs need it.',
  ) + logic,
);

write(
  '4-content.sql',
  banner(
    'STEP 4 of 4 - ranks, taunts, gear, achievements, seasons',
    'REQUIRED. The rank and taunt functions read these tables.',
  ) + essential,
);

write(
  '5-zones-monsters-optional.sql',
  banner(
    'OPTIONAL - 66 zones and 1,056 monsters',
    'The app does not need this: all of it ships in the bundle from src/game/**. ' +
      'Run it only if you want the content queryable in SQL. Large - prefer the CLI over the browser editor.',
  ) + bulk,
);

console.log(
  '\nDone. Paste 0-everything.sql and press run - that is the whole setup.' +
    '\nFiles 1-4 are the same SQL split up, if you would rather go step by step.' +
    '\nFile 5 is optional and not needed by the app.',
);
