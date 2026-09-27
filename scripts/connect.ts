/**
 * Writes .env.local from a Supabase project URL and anon key.
 *
 *   npm run connect -- https://abcdefgh.supabase.co eyJhbGciOi...
 *
 * It validates both values before writing, because the failure mode for a
 * wrong key is bad: the app falls back to local mode or throws on first
 * query, and neither says "your key is malformed".
 *
 * It also refuses a secret key outright. Those bypass row-level security,
 * and anything with a VITE_ prefix is compiled into the bundle every visitor
 * downloads.
 *
 * Supabase has two generations of keys and both are still in circulation:
 *
 *   legacy      anon / service_role     JWTs, start with "eyJ", role in the payload
 *   current     sb_publishable_ / sb_secret_     opaque, role in the prefix
 *
 * Either publishable form works here. Neither secret form does.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = join(process.cwd(), '.env.local');

function die(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** Decodes a JWT payload without verifying it - we only want the role claim. */
function jwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const [rawUrl, rawKey] = process.argv.slice(2);

if (!rawUrl || !rawKey) {
  die(
    'Usage: npm run connect -- <project-url> <anon-key>\n\n' +
      '  Both are in the dashboard under Project Settings -> API.\n' +
      '  The URL looks like https://abcdefgh.supabase.co\n' +
      '  The anon key is a long string starting with eyJ',
  );
}

const url = rawUrl.trim().replace(/\/+$/, '');
const key = rawKey.trim();

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  die(
    `That does not look like a project URL:\n    ${url}\n\n` +
      '  Expected something like https://abcdefgh.supabase.co\n' +
      '  (not the dashboard URL, and not the database connection string).',
  );
}

const SECRET_WARNING =
  '\n\n  It bypasses all row-level security, and VITE_ variables are compiled\n' +
  '  into the JavaScript every visitor downloads - publishing it would let\n' +
  '  anyone read and delete every row in your database.\n\n' +
  '  If you have already pasted or committed it anywhere, revoke it:\n' +
  '  Project Settings -> API Keys -> revoke, then issue a new one.';

let role: string;

if (key.startsWith('sb_secret_')) {
  die('That is a secret key. Do not use it here.' + SECRET_WARNING + '\n\n  Use the sb_publishable_ key instead.');
} else if (key.startsWith('sb_publishable_')) {
  role = 'publishable';
} else if (key.startsWith('eyJ')) {
  // Legacy JWT key - the role is a claim inside the payload.
  const claim = jwtRole(key);

  if (claim === 'service_role') {
    die('That is the service_role key. Do not use it here.' + SECRET_WARNING + '\n\n  Use the "anon / public" key instead.');
  }

  if (claim !== 'anon') {
    console.warn(
      `\n  Warning: this key's role is ${claim ?? 'unreadable'}, not "anon".\n` +
        '  Writing it anyway, but check you copied the anon / public key.',
    );
  }

  role = claim ?? 'unknown';
} else {
  die(
    `That is not a key this app can use:\n    ${key.slice(0, 24)}...\n\n` +
      '  Expected one of:\n' +
      '    sb_publishable_...   (current)\n' +
      '    eyJ...               (legacy anon key)\n\n' +
      '  Both are under Project Settings -> API Keys. A bare UUID is the JWT\n' +
      '  signing key id, which is something else entirely.',
  );
}

// Keep anything already in the file that we are not responsible for, so a
// re-run does not quietly drop settings someone added by hand.
const MANAGED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const kept: string[] = [];

if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const name = line.split('=')[0]?.trim();
    if (line.trim() && !MANAGED.includes(name)) kept.push(line);
  }
}

const body = [
  '# Written by `npm run connect`. Gitignored - never commit this file.',
  `VITE_SUPABASE_URL=${url}`,
  `VITE_SUPABASE_ANON_KEY=${key}`,
  ...(kept.length ? ['', ...kept] : []),
  '',
].join('\n');

writeFileSync(ENV_PATH, body, 'utf8');

const ref = url.replace(/^https:\/\//, '').split('.')[0];

console.log(`
  Wrote .env.local

    project   ${ref}
    url       ${url}
    key role  ${role ?? 'unknown'}

  Restart the dev server - Vite only reads env files at startup:

    npm run dev

  Then open /setup in the app. The connection banner should turn green.
`);
