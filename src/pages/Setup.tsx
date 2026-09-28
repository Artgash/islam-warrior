/**
 * /setup - a guided, clickable walkthrough for connecting a real database.
 *
 * Every step is a direct deep link, so there is no hunting through the
 * Supabase dashboard. The page detects whether credentials are present and
 * whether sync is actually working, so it always reflects reality rather
 * than telling you to do something you have already done.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Database,
  KeyRound,
  Mail,
  Rocket,
  Terminal,
} from 'lucide-react';
import { PageShell } from '@/components/common/Layout';
import { Badge } from '@/components/ui/misc';
import { StarDivider } from '@/components/common/StarDivider';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getSyncHealth, onSyncError, type SyncError } from '@/api/sync';
import { useGameStore } from '@/state';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

const LINKS = {
  signUp: 'https://supabase.com/dashboard/sign-up',
  newProject: 'https://supabase.com/dashboard/new',
  projects: 'https://supabase.com/dashboard/projects',
  sqlEditor: 'https://supabase.com/dashboard/project/_/sql/new',
  apiKeys: 'https://supabase.com/dashboard/project/_/settings/api',
  authProviders: 'https://supabase.com/dashboard/project/_/auth/providers',
  authUrls: 'https://supabase.com/dashboard/project/_/auth/url-configuration',
  smtp: 'https://supabase.com/dashboard/project/_/settings/auth',
  tableEditor: 'https://supabase.com/dashboard/project/_/editor',
  extensions: 'https://supabase.com/dashboard/project/_/database/extensions',
  vercelEnv: 'https://vercel.com/dashboard',
  repo: 'https://github.com/Artgash/islam-warrior',
} as const;

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function OpenLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-display text-xs transition-all',
        primary
          ? 'bg-gold text-night shadow-gold hover:bg-gold/90'
          : 'border border-edge text-bone hover:border-gold/60 hover:text-gold',
      )}
    >
      {children}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy — select it manually.');
    }
  };

  return (
    <div className="panel-inset flex items-center gap-2 p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-bone">{value}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="flex size-7 shrink-0 items-center justify-center rounded border border-edge text-muted transition-colors hover:border-gold/60 hover:text-gold"
      >
        {copied ? <Check className="size-3.5 text-emerald" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function Step({
  number,
  title,
  icon,
  done,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-11">
      <span
        className={cn(
          'absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border-2 font-display text-xs',
          done
            ? 'border-emerald bg-emerald/15 text-emerald'
            : 'border-edge bg-night text-muted',
        )}
      >
        {done ? <Check className="size-4" /> : number}
      </span>

      <div className="panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-gold">{icon}</span>
          <h3 className="font-display text-sm text-bone">{title}</h3>
          {done && <Badge variant="emerald">Done</Badge>}
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function SetupPage() {
  const user = useGameStore((s) => s.user);
  const [error, setError] = useState<SyncError | null>(() => getSyncHealth().lastError);
  useEffect(() => onSyncError(setError), []);

  const configured = isSupabaseConfigured;
  const working = configured && !error;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <PageShell
      title="Connect a database"
      subtitle="Turn on real accounts, real leaderboards and guild chat."
    >
      <ConnectionStatus className="mb-5" />

      {working && user && (
        <div className="panel mb-5 border-emerald/40 p-4">
          <p className="font-display text-sm text-emerald">You are connected.</p>
          <p className="mt-1 text-sm text-muted">
            Progress syncs across devices, and the leaderboards show real players. Nothing below
            is needed unless you want to change something.
          </p>
        </div>
      )}

      <ol className="space-y-3">
        <Step number={1} title="Create a Supabase project" icon={<Database className="size-4" />} done={configured}>
          <p>Free tier is plenty. Save the database password it gives you — it is shown once.</p>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={LINKS.signUp} primary>
              Sign up
            </OpenLink>
            <OpenLink href={LINKS.newProject}>New project</OpenLink>
            <OpenLink href={LINKS.projects}>My projects</OpenLink>
          </div>
        </Step>

        <Step number={2} title="Create the tables" icon={<Terminal className="size-4" />}>
          <p>
            Open <code className="text-gold">supabase/paste/0-everything.sql</code>, select all,
            paste it into the SQL editor and press run. That is the whole setup — one paste, about
            75 KB. You are not writing SQL, only running a file that is already written.
          </p>
          <p className="text-xs text-muted/80">
            It creates 36 tables, turns on row-level security, adds the triggers and leaderboard
            views, and loads the ranks, taunts, gear and achievements.
          </p>
          <p className="text-xs text-muted/80">
            Prefer smaller pieces? <code>1-tables.sql</code>, <code>2-security.sql</code>,{' '}
            <code>3-logic.sql</code> and <code>4-content.sql</code> are the same SQL split up. Run
            them <strong>in order</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={LINKS.sqlEditor} primary>
              SQL editor
            </OpenLink>
            <OpenLink href={`${LINKS.repo}/tree/main/supabase/paste`}>The four files</OpenLink>
            <OpenLink href={LINKS.extensions}>Extensions</OpenLink>
          </div>
          <p className="text-xs text-muted/80">
            If <code>3-logic.sql</code> errors on <code>pg_cron</code>, enable that extension and
            re-run it. Only the scheduled jobs depend on it — everything else works without them.
          </p>
          <p className="text-xs text-muted/80">
            There is a fifth file, <code>5-zones-monsters-optional.sql</code>. Skip it. All 66
            zones and 1,056 monsters already ship inside the app; that file only makes them
            queryable in SQL, and at 595 KB the browser editor tends to choke on it.
          </p>
        </Step>

        <Step number={3} title="Copy your two keys" icon={<KeyRound className="size-4" />} done={configured}>
          <p>
            From Project Settings → API Keys, copy the <strong>Project URL</strong> and the{' '}
            <strong>publishable</strong> key — the one starting{' '}
            <code className="text-gold">sb_publishable_</code>. Older projects call it{' '}
            <strong>anon / public</strong> and it starts <code className="text-gold">eyJ</code>;
            either works. Then run this in the project folder — it writes{' '}
            <code className="text-gold">.env.local</code> for you and rejects the wrong key:
          </p>
          <CopyBox
            label="connect command"
            value="npm run connect -- https://YOUR-REF.supabase.co sb_publishable_YOUR_KEY"
          />
          <p className="text-xs text-muted/80">
            Restart the dev server afterwards. Vite only reads env files at startup, so a running
            server will keep reporting local mode however correct the file is.
          </p>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={LINKS.apiKeys} primary>
              API keys
            </OpenLink>
            <OpenLink href={LINKS.vercelEnv}>Vercel env vars</OpenLink>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/5 p-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <p className="text-xs">
              Never use the secret key — <code>sb_secret_</code> or{' '}
              <code>service_role</code>. The <code>VITE_</code> prefix ships a value to every
              visitor&rsquo;s browser, and those keys bypass all security. If one has been pasted
              or committed anywhere, revoke it and issue a new one.
            </p>
          </div>
        </Step>

        <Step number={4} title="Require real email addresses" icon={<Mail className="size-4" />}>
          <p>
            Authentication → Providers → Email → turn on <strong>Confirm email</strong>. Sign-ups
            then have to click a link before the account works.
          </p>
          <p>Then set the URLs, or confirmation links will bounce people to the wrong place:</p>
          <CopyBox label="Site URL" value={origin || 'https://your-app.vercel.app'} />
          <CopyBox label="Redirect URL" value={`${origin || 'https://your-app.vercel.app'}/auth/callback`} />
          <div className="flex flex-wrap gap-2">
            <OpenLink href={LINKS.authProviders} primary>
              Email provider
            </OpenLink>
            <OpenLink href={LINKS.authUrls}>URL configuration</OpenLink>
            <OpenLink href={LINKS.smtp}>SMTP settings</OpenLink>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/5 p-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="space-y-1.5 text-xs">
              <p>
                <strong>Your own SMTP is required before anyone else can sign up.</strong>{' '}
                Supabase&rsquo;s built-in mailer sends only a few messages an hour, and only to the
                project owner&rsquo;s address. Everyone else gets{' '}
                <em>&ldquo;email rate limit exceeded&rdquo;</em>, or nothing at all.
              </p>
              <p className="text-muted/80">
                Any SMTP provider works. Resend and Brevo both have free tiers large enough that
                this never comes up again. Add it under Authentication → SMTP Settings, then raise
                the hourly cap under Rate Limits.
              </p>
            </div>
          </div>
        </Step>

        <Step number={5} title="Check it worked" icon={<Rocket className="size-4" />} done={Boolean(working && user)}>
          <p>Sign up, confirm the email, finish onboarding and complete one habit. Then:</p>
          <ul className="ml-4 list-disc space-y-0.5 text-xs">
            <li>Your row should exist in the <code>characters</code> table</li>
            <li>The Leaderboards screen should show you as a real entry</li>
            <li>The &ldquo;local ladder&rdquo; notice should be gone</li>
            <li>Signing in elsewhere should carry your progress across</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={LINKS.tableEditor} primary>
              Table editor
            </OpenLink>
            <Link to="/leaderboards">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-2 font-display text-xs text-bone transition-all hover:border-gold/60 hover:text-gold">
                Open leaderboards
              </span>
            </Link>
          </div>
        </Step>
      </ol>

      <StarDivider className="mt-6" />

      <p className="text-center text-xs leading-relaxed text-muted">
        The full written version, including troubleshooting, is in{' '}
        <a
          href={`${LINKS.repo}/blob/main/SUPABASE_SETUP.md`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-gold underline underline-offset-4"
        >
          SUPABASE_SETUP.md
        </a>
        .
      </p>
    </PageShell>
  );
}
