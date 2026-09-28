/**
 * Turns on Google sign-in for the project.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   $env:GOOGLE_CLIENT_ID = "....apps.googleusercontent.com"
 *   $env:GOOGLE_CLIENT_SECRET = "GOCSPX-..."
 *   npm run auth:google
 *
 * The credentials have to come from a Google Cloud OAuth client, which can
 * only be created by the person who owns the Google account. What this does
 * is the other half: hand them to Supabase and switch the provider on.
 *
 * The redirect URI registered in Google Cloud must be exactly the project's
 * auth callback - not the app's own /auth/callback. Google talks to
 * Supabase, and Supabase talks to the app. Getting those two confused is
 * the usual reason a correct-looking setup fails with redirect_uri_mismatch.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = join(process.cwd(), '.env.local');

function die(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function projectRef(): string {
  if (!existsSync(ENV_PATH)) die('No .env.local. Run `npm run connect` first.');
  const line = readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('VITE_SUPABASE_URL='));
  const ref = (line?.split('=')[1] ?? '').trim().replace(/^https:\/\//, '').split('.')[0];
  if (!ref) die('Could not read the project URL from .env.local.');
  return ref;
}

async function main(): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!token) die('No SUPABASE_ACCESS_TOKEN. Generate one at https://supabase.com/dashboard/account/tokens');

  if (!clientId || !secret) {
    const ref = projectRef();
    die(
      'Missing Google credentials.\n\n' +
        '  Create an OAuth client at https://console.cloud.google.com/apis/credentials\n' +
        '    - Application type: Web application\n' +
        '    - Authorised redirect URI, exactly:\n\n' +
        `        https://${ref}.supabase.co/auth/v1/callback\n\n` +
        '  Then:\n\n' +
        '      $env:GOOGLE_CLIENT_ID = "....apps.googleusercontent.com"\n' +
        '      $env:GOOGLE_CLIENT_SECRET = "GOCSPX-..."\n' +
        '      npm run auth:google',
    );
  }

  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    die(`That does not look like a Google client id:\n    ${clientId}\n\n  It ends with .apps.googleusercontent.com`);
  }

  const ref = projectRef();

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: secret,
    }),
  });

  if (!response.ok) {
    die(`Supabase refused the change: HTTP ${response.status}\n\n  ${(await response.text()).slice(0, 400)}`);
  }

  // Read it back rather than trusting the write: a 200 here has meant a
  // partially applied config before.
  const check = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const config = (await check.json()) as Record<string, unknown>;

  console.log(`
  Google sign-in

    enabled    ${config.external_google_enabled}
    client id  ${config.external_google_client_id ? 'set' : 'MISSING'}
    secret     ${config.external_google_secret ? 'set' : 'MISSING'}

  The button appears on its own - the app asks the auth service which
  providers are on, so there is nothing to redeploy.
`);
}

void main();
