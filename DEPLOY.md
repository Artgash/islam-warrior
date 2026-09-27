# Deploying ISLAM WARRIOR

Everything below has been prepared except the two steps that need *your*
credentials. Git, the GitHub CLI and the Vercel CLI are already installed, the
repository is initialised, and the first commit exists.

**Current state**

| | |
| --- | --- |
| Git repo | initialised, branch `main` |
| First commit | `6caddd6`, 125 files |
| Secrets in the repo | none — scanned before committing |
| `node_modules`, `dist`, `.env*` | all gitignored |
| Build | passing |
| Tests | 116 passing |

---

## 1. Push to GitHub

Log in once. This opens a browser, which is why it could not be done for you:

```bash
gh auth login
```

Choose **GitHub.com** → **HTTPS** → **login with a web browser**, and paste the
one-time code it shows you.

Then create the repository and push in a single command. Pick one:

```bash
# Private (recommended to start)
gh repo create islam-warrior --private --source=. --remote=origin --push

# Public
gh repo create islam-warrior --public --source=. --remote=origin --push
```

That creates the repo under your account, wires up `origin`, and pushes `main`.

<details>
<summary>Without the GitHub CLI</summary>

Create an empty repo on github.com (no README, no .gitignore — this repo
already has both), then:

```bash
git remote add origin https://github.com/<your-username>/islam-warrior.git
git push -u origin main
```

</details>

---

## 2. Deploy to Vercel

```bash
vercel login
```

Then, from the project directory:

```bash
vercel          # preview deployment, to check it first
vercel --prod   # production
```

Vercel will detect Vite automatically. `vercel.json` is already committed and
sets the build command, the output directory, the SPA rewrite that client-side
routing needs, and security headers — so accept the detected defaults.
deploys on every push: vercel.com → **Add New** → **Project** → import the
GitHub repo you just created. Framework preset **Vite**. Everything else is
already configured by `vercel.json`.

---

## 3. Environment variables (optional)

**The app deploys and works with no environment variables at all.** It runs in
local mode: accounts and progress live in each visitor's browser. That is a
genuine, playable single-player deployment.

Add these only when you want cloud sync, real accounts, guild chat and true
shared leaderboards — in Vercel under **Settings → Environment Variables**:

| Name | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | same page, `anon` `public` key |

The anon key is designed to be public; row-level security is what protects the
data. **Never** add `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` variable — the
`VITE_` prefix ships it to the browser. It belongs only in Supabase edge
function secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

If you do add Supabase, run the migrations first, in order:

```bash
supabase link --project-ref <your-project-ref>
supabase db push          # 0001 schema, 0002 RLS, 0003 functions, 0004 seed
supabase functions deploy
```

Note that `0004_seed.sql` is generated from the TypeScript — regenerate with
`npm run seed` rather than editing the SQL by hand.

---

## Things worth knowing before you share the link

- **The SPA rewrite matters.** Without it, deep links like `/leaderboards`
  return 404 on refresh. It is already in `vercel.json`; just do not remove it.
- **Local mode is not a security boundary.** It exists so the game is playable
  without a backend. Anything multiplayer needs Supabase.
- **No analytics or trackers are included.** Add them deliberately if you want
  them, and update `PrivacyPage` in `src/pages/Legal.tsx` if you do.
- **The licence is unset.** `README.md` says all rights reserved. Add a real
  licence before making the repo public if that matters to you.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, then production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | 116 tests |
| `npm run seed` | Regenerate the seed migration from `src/game/**` |
| `npm run art:prompts` | Write `art-manifest.json` — 76 art prompts |
