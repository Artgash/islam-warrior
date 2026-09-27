# Turning on real users

Right now the app runs in **local mode**: every visitor's account and progress
live in their own browser, and the leaderboards show a generated practice
ladder rather than real people. The code for real multiplayer is already
written and committed — it just needs a database to point at.

This takes about 10 minutes and the free tier is enough.

---

## 1. Create the project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.

- **Name:** `islam-warrior`
- **Database password:** generate one and save it in a password manager. You
  will not be shown it again, and you need it for the CLI.
- **Region:** pick the one closest to most of your players.

Provisioning takes a couple of minutes.

---

## 2. Create the tables

**Project → SQL Editor → New query.** Run these four files **in order**, from
`supabase/migrations/` in this repo. Paste the whole contents of each, run it,
wait for success, then move to the next:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `0001_schema.sql` | 36 tables, enums, constraints, indexes |
| 2 | `0002_rls.sql` | Row-level security on every table |
| 3 | `0003_functions.sql` | Triggers, leaderboard views, scheduled jobs |
| 4 | `0004_seed.sql` | 66 zones, 1,056 monsters, gear, ranks, taunts, achievements |

`0004_seed.sql` is large (~618 KB). If the editor struggles with it, use the
CLI instead:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Your project ref is the subdomain in your project URL:
`https://<project-ref>.supabase.co`.

### If `0003` complains about `pg_cron`

The scheduled jobs at the bottom of that file need the `pg_cron` extension.
Enable it under **Database → Extensions → pg_cron**, then re-run `0003`.
Everything else in the file works without it — only the automatic weekly
reset, rank decay and Iblis sweep depend on it.

---

## 3. Point the app at it

**Project Settings → API.** Copy two values:

```bash
# .env.local  (create this file in the project root - it is gitignored)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

Restart the dev server. **Settings → Connection** should now say
**Connected** instead of **Local mode**.

Add the same two variables in **Vercel → your project → Settings →
Environment Variables**, then redeploy.

> The `anon` key is *designed* to be public — row-level security is what
> protects the data. The **`service_role`** key is the opposite: it bypasses
> RLS entirely. Never put it in a `VITE_` variable, because that prefix ships
> it to every visitor's browser. It belongs only in edge function secrets.

---

## 4. Email verification

**Authentication → Providers → Email.** Turn on **Confirm email**.

New sign-ups then get a confirmation link, and the app shows a
*"check your inbox"* screen instead of dropping them into a half-working
session. Unconfirmed addresses cannot sign in at all, which is what stops
people registering with addresses they do not own.

**Authentication → URL Configuration:**

- **Site URL:** your Vercel URL, e.g. `https://islam-warrior.vercel.app`
- **Redirect URLs:** add `https://your-vercel-url/auth/callback` and
  `http://localhost:5173/auth/callback`

Get this wrong and confirmation links will bounce users to the wrong place.

### About the built-in mailer

Supabase's default SMTP is rate-limited to a handful of messages per hour and
is meant for testing. Before real users arrive, set your own under
**Project Settings → Auth → SMTP Settings** (Resend, Postmark and SendGrid
all have usable free tiers). Otherwise sign-ups will silently stop receiving
mail once you hit the cap.

---

## 5. Edge functions (optional)

The game is fully playable without these. They add server-authoritative habit
completion, which matters once you care about people cheating the
leaderboards.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
supabase functions deploy
```

---

## 6. Check it actually worked

1. Sign up with a real address. You should get a confirmation email.
2. Confirm, sign in, finish onboarding, complete a habit.
3. In Supabase → **Table Editor → characters**, your row should be there with
   the right name and XP.
4. Open **Leaderboards** in the app. You should see yourself as a real entry,
   and the "local ladder" notice should be gone.
5. Sign in on a second device or a private window. Your progress should
   follow you — that is `hydrateFromCloud` doing its job.

If something is wrong, **Settings → Connection** shows the actual Postgres
error rather than failing silently.

---

## Things that bite people

**"Nothing syncs and there are no errors."** That was a real bug, fixed in
commit `7819398`: ids were generated as `char_9f8e...` while every id column
is `uuid`, so Postgres rejected every insert. If you see anything like it
again, Settings → Connection will now name the table and show the message.

**"The leaderboard only shows me."** Correct until other people sign up. The
boards read from database views, so they only contain real players — there
are no bots once you are connected.

**"I confirmed my email but cannot sign in."** Usually the Site URL is wrong,
so the confirmation link pointed somewhere that could not complete it. Fix it
under Authentication → URL Configuration and send yourself a new link.

**Free tier pauses after a week of inactivity.** Your data is kept; you just
have to un-pause it in the dashboard.
