/**
 * Applies the whole schema over a direct Postgres connection.
 *
 *   $env:SUPABASE_DB_PASSWORD = "..."     # Project Settings -> Database
 *   npm run db:direct
 *
 * This is the route that needs no dashboard and no browser. Because there
 * is no editor to choke on a large statement, it applies the optional zones
 * and monsters too - over a socket that file is unremarkable.
 *
 * Compared with `npm run db:apply` (Management API), this needs only the
 * database password rather than a personal access token. The password is
 * scoped to this one project and can be reset from the dashboard; a token
 * covers the whole account, so prefer this one.
 *
 * Each file runs inside a transaction, so a failure leaves nothing
 * half-applied. It stops at the first error and prints it verbatim: the
 * files are ordered, and continuing would bury the error that mattered.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const PASTE_DIR = join(process.cwd(), 'supabase', 'paste');
const ENV_PATH = join(process.cwd(), '.env.local');

/** In order. The last is optional content the app does not read. */
const FILES = [
  '1-tables.sql',
  '2-security.sql',
  '3-logic.sql',
  '4-content.sql',
  '5-zones-monsters-optional.sql',
];

function die(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function envValue(name: string): string | undefined {
  if (!existsSync(ENV_PATH)) return undefined;
  const line = readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() || undefined;
}

function projectRef(): string {
  const url = envValue('VITE_SUPABASE_URL') ?? '';
  const ref = url.replace(/^https:\/\//, '').split('.')[0];
  if (!ref) {
    die('No project URL. Run `npm run connect -- <url> <publishable key>` first.');
  }
  return ref;
}

/**
 * The pooler is addressed per region, and nothing in the project URL says
 * which one. DNS is no help either - every aws-0-<region>.pooler host
 * resolves regardless of where the project lives.
 *
 * The pooler does distinguish itself though: connecting to the wrong region
 * fails with "Tenant or user not found", which is unmistakably different
 * from a rejected password. So try them until one stops saying that.
 *
 * The direct db.<ref>.supabase.co host would avoid all of this, but it is
 * IPv6-only on the free tier and unreachable from most home connections.
 */
const REGIONS = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
];

/**
 * The pooler phrases this two ways depending on version - "Tenant or user
 * not found" and "tenant/user <name> not found" - so match on the shape
 * rather than the sentence.
 */
const WRONG_REGION = /tenant.{0,40}not found/i;

/** Older projects sit behind aws-0-, newer ones behind aws-1-. */
const HOST_PREFIXES = ['aws-0', 'aws-1'];

/** Every host worth trying, cheapest guesses first. */
function candidateHosts(pinned: string | undefined): string[] {
  const regions = pinned ? [pinned] : REGIONS;
  return regions.flatMap((region) =>
    HOST_PREFIXES.map((prefix) => `${prefix}-${region}.pooler.supabase.com`),
  );
}

function password(): string {
  const value = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (value) return value;

  die(
    'No database password.\n\n' +
      '  Project Settings -> Database -> Database password. If you did not\n' +
      '  save it when the project was created, reset it there - it is shown\n' +
      '  once and resetting breaks nothing yet.\n\n' +
      '  Then, in your own terminal:\n\n' +
      '      $env:SUPABASE_DB_PASSWORD = "your-password"\n' +
      '      npm run db:direct\n\n' +
      '  Or set SUPABASE_DB_URL to the full connection string from the same\n' +
      '  page (Connection pooling -> Session mode).',
  );
}

/** Settings shared by every attempt. */
const COMMON = {
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  // The content file is large; give it room before giving up.
  statement_timeout: 600_000,
} as const;

/**
 * Discrete fields rather than a connection string, deliberately.
 *
 * pg does not percent-decode the password out of a connection string, so
 * any password containing a URL-significant character is wrong whichever
 * way you write it: encode it and the escape arrives literally, leave it
 * raw and a `#` truncates the rest. Passing the fields separately means no
 * parsing happens at all.
 */
function makeClient(host: string, ref: string, pass: string, timeout = 15_000): Client {
  return new Client({
    ...COMMON,
    host,
    port: 5432,
    user: `postgres.${ref}`,
    password: pass,
    connectionTimeoutMillis: timeout,
  });
}

/** Returns a connected client, probing regions when one is not given. */
async function connect(ref: string, secret: string | undefined): Promise<Client> {
  const explicit = process.env.SUPABASE_DB_URL?.trim();
  if (explicit) {
    // An explicit string is the caller's own, so pass it through untouched.
    const client = new Client({
      ...COMMON,
      connectionString: explicit,
      connectionTimeoutMillis: 30_000,
    });
    await client.connect();
    return client;
  }

  const pass = password();
  const hosts = candidateHosts(process.env.SUPABASE_DB_REGION?.trim());

  let lastError = '';

  for (const host of hosts) {
    const client = makeClient(host, ref, pass);
    try {
      await client.connect();
      console.log(`  host      ${host}\n`);
      return client;
    } catch (error) {
      await client.end().catch(() => {});
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;

      // Wrong region, or a host that does not exist - keep looking.
      // Anything else is a real problem, and trying thirty more hosts
      // would only bury it.
      if (WRONG_REGION.test(message) || /EAI_AGAIN|ENOTFOUND .*pooler/i.test(message)) {
        continue;
      }

      die(
        `Could not connect via ${host}.\n\n  ${redact(message, secret)}\n\n` +
          '  If that says the password failed, it is the database password\n' +
          '  from Project Settings -> Database, not your Supabase account\n' +
          '  password and not an API key.',
      );
    }
  }

  die(
    `No region accepted this project.\n\n  Last error: ${redact(lastError, secret)}\n\n` +
      '  Set SUPABASE_DB_URL to the exact connection string from\n' +
      '  Project Settings -> Database -> Connection pooling (Session mode).',
  );
}

/** Never print the password, whatever goes wrong. */
function redact(text: string, secret: string | undefined): string {
  if (!secret) return text;
  return text.split(secret).join('********');
}

async function main(): Promise<void> {
  const ref = projectRef();
  const secret = process.env.SUPABASE_DB_PASSWORD?.trim();

  console.log(`\n  project   ${ref}`);

  const client = await connect(ref, secret);

  try {
    for (const file of FILES) {
      const path = join(PASTE_DIR, file);
      if (!existsSync(path)) {
        die(`Missing ${file}. Run \`npm run sql:paste\` first.`);
      }

      const sql = readFileSync(path, 'utf8');
      const kb = (Buffer.byteLength(sql, 'utf8') / 1024).toFixed(0);
      process.stdout.write(`  ${file.padEnd(32)} ${kb.padStart(4)} KB  `);

      try {
        // The seed file opens its own transaction; wrapping it again would
        // nest, so only wrap the ones that do not.
        const wraps = /^begin;/m.test(sql);
        await client.query(wraps ? sql : `begin;\n${sql}\ncommit;`);
        console.log('ok');
      } catch (error) {
        console.log('FAILED');
        try {
          await client.query('rollback');
        } catch {
          /* the failed statement may already have aborted the transaction */
        }
        const message = error instanceof Error ? error.message : String(error);
        die(`${file} failed. Nothing after it was run.\n\n  ${redact(message, secret)}`);
      }
    }
  } finally {
    await client.end();
  }

  console.log('\n  Done. Restart the dev server, then open /setup.\n');
}

void main();
