/**
 * Runs the SQL in supabase/paste/ against your project, in order.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   npm run db:apply
 *
 * This is the alternative to pasting each file into the dashboard SQL
 * editor. It uses the Management API, so it needs a personal access token
 * but NOT the database password.
 *
 * It stops at the first failure and prints the real Postgres error. That
 * matters: the files are ordered and each depends on the one before, so
 * carrying on after an error would pile confusing failures on top of the
 * one that actually mattered.
 *
 * The optional fifth file is skipped unless you pass --with-content.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTE_DIR = join(process.cwd(), 'supabase', 'paste');
const ENV_PATH = join(process.cwd(), '.env.local');
const OPTIONAL = '5-zones-monsters-optional.sql';

function die(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** The project ref is the subdomain of the URL already in .env.local. */
function projectRef(): string {
  if (!existsSync(ENV_PATH)) {
    die('No .env.local. Run `npm run connect -- <url> <publishable key>` first.');
  }

  const line = readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('VITE_SUPABASE_URL='));

  const url = line?.slice('VITE_SUPABASE_URL='.length).trim() ?? '';
  const ref = url.replace(/^https:\/\//, '').split('.')[0];

  if (!ref) die('Could not read VITE_SUPABASE_URL from .env.local.');
  return ref;
}

/** The personal access token, from the environment. */
function accessToken(): string {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  die(
    'No access token.\n\n' +
      '  Generate one at https://supabase.com/dashboard/account/tokens\n' +
      '  then, in your own terminal:\n\n' +
      '      $env:SUPABASE_ACCESS_TOKEN = "sbp_..."\n' +
      '      npm run db:apply\n\n' +
      '  Keep that token to yourself - it controls every project on your\n' +
      '  account. Close the terminal afterwards and it is gone.\n\n' +
      '  Or skip it entirely: paste supabase/paste/1..4 into the dashboard\n' +
      '  SQL editor in order. They are small enough for the browser editor,\n' +
      '  and no token is involved.',
  );
}

async function runSql(ref: string, token: string, sql: string): Promise<void> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}\n\n${body}`);
  }
}

async function main(): Promise<void> {
  const withContent = process.argv.includes('--with-content');
  const ref = projectRef();
  const token = accessToken();

  const files = readdirSync(PASTE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => withContent || f !== OPTIONAL)
    .sort();

  if (!files.length) die('No SQL in supabase/paste/. Run `npm run sql:paste` first.');

  console.log(`\n  Applying ${files.length} file(s) to ${ref}\n`);

  for (const file of files) {
    process.stdout.write(`  ${file.padEnd(32)}`);
    try {
      await runSql(ref, token, readFileSync(join(PASTE_DIR, file), 'utf8'));
      console.log('ok');
    } catch (error) {
      console.log('FAILED');
      die(
        `${file} failed. Nothing after it was run.\n\n` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    '\n  Done.' +
      (withContent ? '' : `\n  Skipped ${OPTIONAL} - pass --with-content to include it.`) +
      '\n  Restart the dev server, then open /setup.\n',
  );
}

void main();
