/**
 * Publishes the site and points Supabase at it, in one run.
 *
 *   $env:VERCEL_TOKEN = "..."            # vercel.com/account/tokens
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."  # supabase.com/dashboard/account/tokens
 *   npm run go-live
 *
 * Four things have to line up before the published site works, and missing
 * any one of them fails quietly rather than loudly:
 *
 *   1. the build is deployed
 *   2. Vercel holds the Supabase URL and publishable key, or the live site
 *      silently runs in local mode with no accounts and no leaderboards
 *   3. Supabase's Site URL points at the deployment
 *   4. the deployment is in Supabase's redirect allow-list, or confirmation
 *      links are rewritten to Site URL and land somewhere else entirely
 *
 * The Supabase half is skipped when no access token is present: the deploy
 * still happens, and the script says exactly what is left to click.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = join(process.cwd(), '.env.local');

function die(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function envValue(name: string): string {
  if (!existsSync(ENV_PATH)) {
    die('No .env.local. Run `npm run connect -- <url> <publishable key>` first.');
  }
  const line = readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim();
  if (!value) die(`${name} is missing from .env.local.`);
  return value;
}

/** Runs the Vercel CLI, returning stdout. Tokens never reach the log. */
function vercel(args: string[], input?: string): string {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) die('No VERCEL_TOKEN. Create one at https://vercel.com/account/tokens');

  console.log(`  vercel ${args.join(' ')}`);

  try {
    return execFileSync('npx', ['--no-install', 'vercel', ...args, '--token', token], {
      encoding: 'utf8',
      input,
      stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message?: string };
    const detail = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() || e.message || 'unknown failure';
    die(`vercel ${args[0]} failed.\n\n  ${detail.split('\n').join('\n  ')}`);
  }
}

/**
 * Replaces an environment variable. Removing first because `env add` fails
 * outright when the name already exists, which would otherwise make every
 * run after the first one abort.
 */
function setEnv(name: string, value: string, target: string): void {
  try {
    execFileSync(
      'npx',
      ['--no-install', 'vercel', 'env', 'rm', name, target, '--yes', '--token', process.env.VERCEL_TOKEN ?? ''],
      { stdio: 'ignore', shell: process.platform === 'win32' },
    );
  } catch {
    /* not set yet, which is the normal case on a first run */
  }
  vercel(['env', 'add', name, target], value);
}

/**
 * The stable production domain - what belongs in Supabase and what you give
 * to people. Vercel lists every alias pointing at production; the shortest
 * is the clean one rather than a per-deployment hash.
 */
async function productionDomain(project: string | undefined): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token || !project) return null;

  try {
    const response = await fetch(`https://api.vercel.com/v9/projects/${project}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      targets?: { production?: { alias?: string[] } };
    };

    const aliases = body.targets?.production?.alias ?? [];
    if (!aliases.length) return null;

    return `https://${[...aliases].sort((a, b) => a.length - b.length)[0]}`;
  } catch {
    return null;
  }
}

async function configureSupabase(ref: string, origin: string): Promise<boolean> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) return false;

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site_url: origin,
      // Keep localhost working so development does not break on go-live.
      uri_allow_list: [`${origin}/**`, 'http://localhost:5173/**'].join(','),
    }),
  });

  if (!response.ok) {
    console.warn(`\n  Supabase auth config failed: HTTP ${response.status}`);
    console.warn(`  ${(await response.text()).slice(0, 300)}`);
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  const url = envValue('VITE_SUPABASE_URL');
  const key = envValue('VITE_SUPABASE_ANON_KEY');
  const ref = url.replace(/^https:\/\//, '').split('.')[0];

  console.log(`\n  Supabase project: ${ref}\n`);

  // Link first so env vars attach to the right project. The directory name
  // is not the project name here, and letting the CLI guess from the folder
  // would quietly create a second project alongside the real one.
  const project = process.env.VERCEL_PROJECT?.trim();
  vercel(project ? ['link', '--yes', '--project', project] : ['link', '--yes']);

  console.log('\n  Setting environment variables\n');
  for (const target of ['production', 'preview', 'development']) {
    setEnv('VITE_SUPABASE_URL', url, target);
    setEnv('VITE_SUPABASE_ANON_KEY', key, target);
  }

  console.log('\n  Deploying\n');
  const output = vercel(['deploy', '--prod', '--yes']);

  const deploymentUrl = output.match(/https:\/\/[^\s]+\.vercel\.app/g)?.pop();
  if (!deploymentUrl) {
    die(`Deployed, but no URL was printed. Check https://vercel.com/dashboard\n\n${output}`);
  }

  // `vercel deploy` prints the per-deployment URL, which is not the address
  // to hand anyone: it changes every deploy, and deployment protection
  // answers it with a 302 to a login page. Supabase pointed at that would
  // send every confirmation link somewhere protected and short-lived.
  const deployed = (await productionDomain(project)) ?? deploymentUrl;

  console.log(`
  Live at ${deployed}`);
  if (deployed !== deploymentUrl) console.log(`  (this deployment: ${deploymentUrl})`);
  console.log('');

  const configured = await configureSupabase(ref, deployed);

  if (configured) {
    console.log('  Supabase Site URL and redirect allow-list updated.\n');
    console.log('  Nothing left to do. Open the link and sign up.\n');
  } else {
    console.log('  Supabase auth was NOT updated - no SUPABASE_ACCESS_TOKEN.\n');
    console.log('  Confirmation emails will point at the wrong place until you add,');
    console.log('  under Authentication -> URL Configuration:\n');
    console.log(`      Site URL       ${deployed}`);
    console.log(`      Redirect URLs  ${deployed}/**\n`);
  }
}

void main();
